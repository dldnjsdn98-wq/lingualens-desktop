import {createHash,randomUUID} from 'node:crypto';
import {stat,mkdir,readFile,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {localModelVersion} from './local-ocr.js';
import {platformPaths} from './platform.js';
import {withStorageLock} from './storage-maintenance.js';

export const defaultCacheRoot=platformPaths().cache;
// Disk cache stores text/coordinates only; images and credentials are never written here.
export function cachedExtractor(extractor,{ttl=300000,limit=12,root,diskTtl=7*86400000,diskLimit=128}={}){
  const cache=new Map(),jobs=new Map();let generation=0;
  const valid=value=>value&&Array.isArray(value.lines)&&value.lines.length<=2000&&value.lines.every(x=>x&&typeof x.text==='string');
  const remember=(key,value,at=Date.now())=>{cache.delete(key);cache.set(key,{at,value:structuredClone(value)});while(cache.size>limit)cache.delete(cache.keys().next().value)};
  const current=job=>job.generation===generation&&jobs.get(job.key)===job&&!job.controller.signal.aborted;
  async function prune(){
    const names=(await readdir(root)).filter(x=>/^[a-f0-9]{64}\.json$/.test(x));
    const files=await Promise.all(names.map(async name=>({name,at:(await stat(join(root,name))).mtimeMs})));
    files.sort((a,b)=>b.at-a.at);
    await Promise.all(files.filter((x,i)=>i>=diskLimit||Date.now()-x.at>diskTtl).map(x=>unlink(join(root,x.name)).catch(()=>{})));
  }
  function subscribe(job,signal,onProgress){
    return new Promise((resolve,reject)=>{
      const subscriber={resolve,reject,onProgress,remove:()=>signal?.removeEventListener('abort',abort)};
      const abort=()=>{
        if(!job.subscribers.delete(subscriber))return;
        subscriber.remove();reject(signal.reason||new DOMException('Aborted','AbortError'));
        if(!job.subscribers.size){job.controller.abort(signal.reason);if(jobs.get(job.key)===job)jobs.delete(job.key)}
      };
      job.subscribers.add(subscriber);signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted)abort();
      else if(job.stage&&onProgress)try{onProgress(job.stage)}catch{}
    });
  }
  async function execute(job,provider,bytes,type,settings){
    const notify=stage=>{job.stage=stage;for(const subscriber of job.subscribers)if(subscriber.onProgress)try{subscriber.onProgress(stage)}catch{}};
    try{
      job.controller.signal.throwIfAborted();
      const value=await extractor(provider,bytes,type,job.controller.signal,{...settings,...([...job.subscribers].some(x=>x.onProgress)?{onProgress:notify}:{})});
      job.controller.signal.throwIfAborted();
      if(current(job)&&valid(value)&&JSON.stringify(value).length<1_800_000){
        const at=Date.now();remember(job.key,value,at);
        if(root)await withStorageLock(root,async()=>{
          if(!current(job))return;
          const temp=join(root,job.key+'.'+randomUUID()+'.tmp');
          try{
            await mkdir(root,{recursive:true});await writeFile(temp,JSON.stringify({key:job.key,at,value}));
            if(current(job)){await rename(temp,join(root,job.key+'.json'));await prune()}
          }catch{}finally{await unlink(temp).catch(()=>{})}
        });
      }
      for(const subscriber of job.subscribers){subscriber.remove();subscriber.resolve({...structuredClone(value),cacheHit:false})}
    }catch(error){for(const subscriber of job.subscribers){subscriber.remove();subscriber.reject(error)}}
    finally{job.subscribers.clear();if(jobs.get(job.key)===job)jobs.delete(job.key)}
  }
  const read=async(provider,bytes,type,signal,{fresh=false,mode='fast',wantBoxes=false,languages=[],onProgress}={})=>{
    signal?.throwIfAborted();
    const config=provider==='codex'?join(process.env.CODEX_HOME||join(homedir(),'.codex'),'config.toml'):join(homedir(),'.gemini','antigravity-cli','settings.json');
    const settings=provider==='local'?localModelVersion+':'+[...new Set(languages)].sort().join(','):await stat(config).then(s=>s.mtimeMs+':'+s.size).catch(()=>'missing');
    signal?.throwIfAborted();
    const key=createHash('sha256').update(provider+'\0'+type+'\0ocr-v5\0'+mode+'\0'+wantBoxes+'\0'+settings+'\0'+(process.env.LINGUALENS_CODEX_CMD||'')+'\0'+(process.env.LINGUALENS_AGY_CMD||'')).update(bytes).digest('hex');
    const saved=cache.get(key);
    if(!fresh&&saved&&Date.now()-saved.at<ttl)return {...structuredClone(saved.value),cacheHit:true};
    if(!fresh&&jobs.has(key))return subscribe(jobs.get(key),signal,onProgress);
    cache.delete(key);
    const beforeDisk=generation;
    if(root&&!fresh)try{
      const file=join(root,key+'.json');
      if((await stat(file)).size<=2_000_000){
        const record=JSON.parse(await readFile(file,'utf8')),age=Date.now()-record.at;
        signal?.throwIfAborted();
        if(beforeDisk===generation&&record.key===key&&Number.isFinite(record.at)&&age>=0&&age<diskTtl&&valid(record.value)){
          if(jobs.has(key))return subscribe(jobs.get(key),signal,onProgress);
          const newer=cache.get(key);if(newer&&Date.now()-newer.at<ttl)return {...structuredClone(newer.value),cacheHit:true};
          remember(key,record.value);return {...structuredClone(record.value),cacheHit:true};
        }
      }
    }catch{signal?.throwIfAborted()}
    signal?.throwIfAborted();
    if(!fresh&&jobs.has(key))return subscribe(jobs.get(key),signal,onProgress);
    const job={key,generation,controller:new AbortController(),subscribers:new Set(),stage:null};jobs.set(key,job);
    const result=subscribe(job,signal,onProgress);
    void execute(job,provider,bytes,type,{mode,wantBoxes,...(provider==='local'?{languages}:{})});
    return result;
  };
  read.clear=async()=>{
    generation++;cache.clear();jobs.clear();
    if(root)await withStorageLock(root,async()=>{try{await Promise.all((await readdir(root)).filter(x=>/^[a-f0-9]{64}\.json$/.test(x)).map(x=>unlink(join(root,x))))}catch{}});
  };
  return read;
}
