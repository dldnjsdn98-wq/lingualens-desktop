import {createHash,randomUUID} from 'node:crypto';
import {stat,mkdir,readFile,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';

import {localModelVersion} from './local-ocr.js';
import {platformPaths} from './platform.js';
export const defaultCacheRoot=platformPaths().cache;
// Disk cache stores text/coordinates only; images and credentials are never written here.
export function cachedExtractor(extractor,{ttl=300000,limit=12,root,diskTtl=7*86400000,diskLimit=128}={}){
  const cache=new Map();
  const valid=value=>value&&Array.isArray(value.lines)&&value.lines.length<=2000&&value.lines.every(x=>x&&typeof x.text==='string');
  async function prune(){
    const names=(await readdir(root)).filter(x=>/^[a-f0-9]{64}\.json$/.test(x));
    const files=await Promise.all(names.map(async name=>({name,at:(await stat(join(root,name))).mtimeMs})));
    files.sort((a,b)=>b.at-a.at);
    await Promise.all(files.filter((x,i)=>i>=diskLimit||Date.now()-x.at>diskTtl).map(x=>unlink(join(root,x.name)).catch(()=>{})));
  }
  const read=async(provider,bytes,type,signal,{fresh=false,mode='fast',wantBoxes=false,languages=[],onProgress}={})=>{
    const config=provider==='codex'?join(process.env.CODEX_HOME||join(homedir(),'.codex'),'config.toml'):join(homedir(),'.gemini','antigravity-cli','settings.json');
    const settings=provider==='local'?localModelVersion+':'+[...new Set(languages)].sort().join(','):await stat(config).then(s=>s.mtimeMs+':'+s.size).catch(()=>'missing');
    const key=createHash('sha256').update(provider+'\0'+type+'\0ocr-v5\0'+mode+'\0'+wantBoxes+'\0'+settings+'\0'+(process.env.LINGUALENS_CODEX_CMD||'')+'\0'+(process.env.LINGUALENS_AGY_CMD||'')).update(bytes).digest('hex');
    const saved=cache.get(key);
    if(!fresh&&saved&&Date.now()-saved.at<ttl){signal?.throwIfAborted();return {...structuredClone(saved.value),cacheHit:true}}
    cache.delete(key);
    if(root&&!fresh)try{
      const file=join(root,key+'.json');if((await stat(file)).size<=2_000_000){const record=JSON.parse(await readFile(file,'utf8'));if(record.key===key&&Date.now()-record.at<diskTtl&&valid(record.value)){signal?.throwIfAborted();return {...record.value,cacheHit:true}}}
    }catch{signal?.throwIfAborted()}
    const value=await extractor(provider,bytes,type,signal,{mode,wantBoxes,...(provider==='local'?{languages}:{}),...(onProgress?{onProgress}:{})});
    signal?.throwIfAborted();
    if(valid(value)&&JSON.stringify(value).length<1_800_000){
      const at=Date.now();cache.set(key,{at,value:structuredClone(value)});while(cache.size>limit)cache.delete(cache.keys().next().value);
      if(root){const temp=join(root,key+'.'+randomUUID()+'.tmp');try{await mkdir(root,{recursive:true});await writeFile(temp,JSON.stringify({key,at,value}));await rename(temp,join(root,key+'.json'));await prune()}catch{}finally{await unlink(temp).catch(()=>{})}}
    }
    return {...value,cacheHit:false};
  };
  read.clear=async()=>{cache.clear();if(root)try{await Promise.all((await readdir(root)).filter(x=>/^[a-f0-9]{64}\.json$/.test(x)).map(x=>unlink(join(root,x))))}catch{}};
  return read;
}
