import {migrateReviews} from './enhancement-tools.js';
import {validateWorkspace} from './workspace-state.js';
import {reviewMatch} from './review-policy.js';
import {mkdir,readdir,readFile,writeFile,rename,unlink,stat,utimes} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {platformPaths} from './platform.js';
import {manualState} from './feature-tools.js';
import {withStorageLock} from './storage-maintenance.js';
export const defaultProjectRoot=join(platformPaths().data,'projects');
function upgradeResults(record){
  for(const item of record.items||[])if(item.payload?.result){migrateReviews(item);const result=item.payload.result;
    result.results=result.results.map(row=>reviewMatch(row,result.lines||[]));result.foundCount=result.results.filter(x=>x.found).length;result.reviewCount=result.results.filter(x=>x.reviewRequired).length;result.found=result.foundCount===result.results.length;
  }
  return record;
}
export function projectStore(root=defaultProjectRoot,{imageRoot=join(root,'images')}={}){
  const summaries=new Map(),verified=new Map();const mutate=fn=>withStorageLock(imageRoot,fn);
  const path=id=>{
    if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('잘못된 작업 ID입니다.');
    return join(root,id+'.json');
  };
  const summary=record=>({id:record.id,name:record.name,folder:record.folder||'기본 폴더',updated:record.updated,count:record.items.length,passed:record.items.filter(x=>!x.problem&&x.payload?.result?.found).length,issues:record.items.filter(x=>x.targets.some(t=>manualState(x,t.id)?.verdict==='issue')).length,review:record.items.filter(x=>x.payload?.result?.results?.some(r=>r.reviewRequired)).length});
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const imagePath=key=>{if(!/^[a-f0-9]{64}$/.test(key))throw Error('저장된 이미지 정보를 확인하세요.');return join(imageRoot,key+'.image')};
  async function imageBytes(ref){const file=imagePath(ref.hash);let bytes=await readFile(file).catch(async e=>{if(e.code!=='ENOENT')throw e;return readFile(join(root,'images',ref.hash+'.image'))});if(bytes.length!==ref.size||hash(bytes)!==ref.hash)throw Error('저장된 이미지가 손상되었습니다.');return bytes}
  async function verifyImage(ref){
    const file=imagePath(ref.hash),info=await stat(file).catch(()=>null);
    const stamp=info&&[info.size,info.mtimeMs,info.ctimeMs].join(':');
    if(info?.size===ref.size&&verified.get(ref.hash)===stamp)return;
    const bytes=await imageBytes(ref);
    if(!info){await mkdir(imageRoot,{recursive:true});await atomic(file,bytes)}
    const checked=await stat(file);verified.set(ref.hash,[checked.size,checked.mtimeMs,checked.ctimeMs].join(':'));
    if(verified.size>2000)verified.delete(verified.keys().next().value);
  }
  async function atomic(target,bytes){
    const temp=target+'.'+randomUUID()+'.tmp';
    try{await writeFile(temp,bytes);await rename(temp,target)}finally{await unlink(temp).catch(()=>{})}
  }
  async function hydrate(record,references=false){
    if(record.storageVersion===2){
      const items=[];
      for(const item of record.items){
        const ref=item.image;
        if(!ref||!['image/png','image/jpeg','image/webp'].includes(ref.type)||!Number.isInteger(ref.size)||ref.size>10485760)throw Error('저장된 이미지 정보를 확인하세요.');
        if(references){await verifyImage(ref);if(item.baseline)await verifyImage(item.baseline.image);for(const b of item.baselineHistory||[])await verifyImage(b.image);items.push(item)}
        else {const bytes=await imageBytes(ref),{image,...rest}=item;items.push({...rest,data:'data:'+ref.type+';base64,'+bytes.toString('base64')})}
      }
      const {storageVersion,...rest}=record;return upgradeResults(validateWorkspace({...rest,items}));
    }
    return upgradeResults(validateWorkspace(record));
  }
  async function cleanupImages(){
    if(imageRoot!==join(root,'images'))return;
    // A damaged record may still refer to files: leave them available for recovery.
    const used=new Set();
    try{for(const name of await readdir(root))if(/^[a-f0-9-]{36}\.json$/.test(name)){
      const record=JSON.parse(await readFile(join(root,name),'utf8'));
      if(!Array.isArray(record.items))return;
      for(const item of record.items){if(item.image)used.add(item.image.hash);if(item.baseline?.image)used.add(item.baseline.image.hash);for(const b of item.baselineHistory||[])used.add(b.image.hash)}
    }
      for(const name of await readdir(join(root,'trash')).catch(()=>[]))if(/^[a-f0-9-]{36}\.json$/.test(name)){
        const record=JSON.parse(await readFile(join(root,'trash',name),'utf8'));
        for(const item of record.items){if(item.image)used.add(item.image.hash);if(item.baseline?.image)used.add(item.baseline.image.hash);for(const b of item.baselineHistory||[])used.add(b.image.hash)}
      }
      for(const name of await readdir(join(root,'drafts')).catch(()=>[]))if(/^[a-f0-9-]{36}\.json$/.test(name)){const record=JSON.parse(await readFile(join(root,'drafts',name),'utf8'));for(const item of record.items){if(item.image)used.add(item.image.hash);if(item.baseline?.image)used.add(item.baseline.image.hash);for(const b of item.baselineHistory||[])used.add(b.image.hash)}}
    }catch{return}
    try{for(const name of await readdir(join(root,'images')))if(/^[a-f0-9]{64}\.image$/.test(name)&&!used.has(name.slice(0,-6)))await unlink(join(root,'images',name))}catch{}
  }
  return {
    async list(){
      await mkdir(root,{recursive:true});
      const records=[],present=new Set();
      for(const name of await readdir(root)){
        if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;
        const id=name.slice(0,-5);present.add(id);
        try{
          const file=join(root,name),info=await stat(file);
          if(!info.isFile())continue;
          const stamp=[info.size,info.mtimeMs,info.ctimeMs].join(':');
          let cached=summaries.get(id);
          if(cached?.stamp!==stamp){
            const record=JSON.parse(await readFile(file,'utf8'));
            if(record.id!==id||typeof record.name!=='string'||typeof record.updated!=='string'||!Array.isArray(record.items))continue;
            cached={stamp,data:summary(upgradeResults(record))};summaries.set(id,cached);
          }
          records.push({...cached.data});
        }catch{/* An unreadable project must not hide the other saved projects. */}
      }
      for(const id of summaries.keys())if(!present.has(id))summaries.delete(id);
      return records.sort((a,b)=>b.updated.localeCompare(a.updated));
    },
    async get(id,{references=false}={}){return hydrate(JSON.parse(await readFile(path(id),'utf8')),references)},
    async putImage(bytes,type){return mutate(async()=>{if(!['image/png','image/jpeg','image/webp'].includes(type)||bytes.length>10485760||!bytes.length)throw Error('이미지 형식·용량을 확인하세요.');const key=hash(bytes);await mkdir(imageRoot,{recursive:true});const existing=await readFile(imagePath(key)).catch(()=>null);if(!existing||hash(existing)!==key)await atomic(imagePath(key),bytes);else await utimes(imagePath(key),new Date(),new Date());const ref={hash:key,type,size:bytes.length};await verifyImage(ref);return ref})},
    async readImage(ref){return imageBytes(ref)},
    async save(data){return mutate(async()=>{
      validateWorkspace(data);
      const id=data.id||randomUUID(),target=path(id);
      const record={...data,id,name:String(data.name||'이름 없는 작업').slice(0,100),folder:String(data.folder||'기본 폴더').trim().slice(0,80)||'기본 폴더',updated:new Date().toISOString()};
      await mkdir(root,{recursive:true});
      await mkdir(imageRoot,{recursive:true});
      const items=[];
      for(const item of record.items){
        if(item.baseline)await verifyImage(item.baseline.image);for(const b of item.baselineHistory||[])await verifyImage(b.image);
        if(item.image){await verifyImage(item.image);items.push(item);continue}
        const [,type,encoded]=/^data:([^;]+);base64,(.*)$/.exec(item.data),bytes=Buffer.from(encoded,'base64'),key=hash(bytes),file=imagePath(key);
        const existing=await readFile(file).catch(()=>null);
        if(!existing||hash(existing)!==key)await atomic(file,bytes);
        const {data,...rest}=item;items.push({...rest,image:{hash:key,type,size:bytes.length}});
      }
      const old=await readFile(target,'utf8').catch(()=>null);
      if(old){const stored=JSON.parse(old);if(stored.storageVersion!==2)await atomic(target+'.legacy-backup',old)}
      await atomic(target,JSON.stringify({...record,storageVersion:2,items}));summaries.delete(id);
      return {id:record.id,updated:record.updated};
    })},
    async move(id,folder){return mutate(async()=>{
      const target=path(id),record=JSON.parse(await readFile(target,'utf8'));
      if(typeof folder!=='string'||!folder.trim()||folder.length>80)throw Error('폴더 이름은 1~80자로 입력하세요.');
      record.folder=folder.trim();record.updated=new Date().toISOString();await atomic(target,JSON.stringify(record));summaries.delete(id);
      return summary(record);
    })},
    async trash(){
      const records=[];for(const name of await readdir(join(root,'trash')).catch(()=>[]))if(/^[a-f0-9-]{36}\.json$/.test(name))try{const record=JSON.parse(await readFile(join(root,'trash',name),'utf8'));records.push({...summary(record),deleted:record.deleted})}catch{}
      return records.sort((a,b)=>String(b.deleted).localeCompare(String(a.deleted)));
    },
    async discard(id){return mutate(async()=>{
      const target=path(id),record=JSON.parse(await readFile(target,'utf8'));record.deleted=new Date().toISOString();
      await mkdir(join(root,'trash'),{recursive:true});await atomic(join(root,'trash',id+'.json'),JSON.stringify(record));
      await unlink(target);await unlink(target+'.legacy-backup').catch(()=>{});summaries.delete(id);
    })},
    async restore(id){return mutate(async()=>{
      const target=path(id),source=join(root,'trash',id+'.json');
      if(await stat(target).then(()=>true).catch(()=>false))throw Error('같은 작업이 이미 있습니다.');
      const record=JSON.parse(await readFile(source,'utf8'));delete record.deleted;await atomic(target,JSON.stringify(record));await unlink(source);return summary(record);
    })},
    async remove(id){return mutate(async()=>{const target=path(id);await unlink(target);await unlink(target+'.legacy-backup').catch(()=>{});summaries.delete(id);await cleanupImages()})}
  };
}
