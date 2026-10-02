import {readdir,readFile,stat,unlink} from 'node:fs/promises';
import {join} from 'node:path';
const queues=new Map();
export function withStorageLock(key,task){const prior=queues.get(key)||Promise.resolve(),result=prior.then(task,task),tail=result.catch(()=>{});queues.set(key,tail);tail.finally(()=>{if(queues.get(key)===tail)queues.delete(key)});return result}
export async function storageMaintenance(root,{remove=false,now=Date.now()}={}){
 return withStorageLock(join(root,'images'),async()=>{
  const used=new Set();let records=0;
  for(const folder of [root,join(root,'drafts'),join(root,'trash')]){
   for(const name of await readdir(folder).catch(e=>{if(e.code==='ENOENT')return [];throw e}))if(/^[a-f0-9-]{36}\.json$/.test(name)){
    let data;try{data=JSON.parse(await readFile(join(folder,name),'utf8'));if(!Array.isArray(data.items))throw Error('invalid')}catch{throw Error('읽지 못하는 작업 파일이 있어 원본 정리를 중단했습니다. 백업과 작업 복구를 먼저 확인하세요.')}
    records++;for(const item of data.items){if(item.image?.hash)used.add(item.image.hash);if(item.baseline?.image?.hash)used.add(item.baseline.image.hash);for(const b of item.baselineHistory||[])if(b.image?.hash)used.add(b.image.hash)}
   }
  }
  let bytes=0,files=0,unusedBytes=0,unusedFiles=0,removedBytes=0,removedFiles=0;
  for(const name of await readdir(join(root,'images')).catch(e=>{if(e.code==='ENOENT')return [];throw e}))if(/^[a-f0-9]{64}\.image$/.test(name)){
   const file=join(root,'images',name),info=await stat(file);if(!info.isFile())continue;files++;bytes+=info.size;
   if(!used.has(name.slice(0,-6))&&now-Math.max(info.mtimeMs,info.ctimeMs)>86400000){unusedBytes+=info.size;unusedFiles++;if(remove){await unlink(file);removedBytes+=info.size;removedFiles++}}
  }
  return {records,files,bytes,unusedFiles,unusedBytes,removedFiles,removedBytes};
 });
}
