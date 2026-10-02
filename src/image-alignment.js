import {execFile} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {platformPaths} from './platform.js';
export async function alignImages(before,after,{ignore=[],scale=false,signal}={}){
 const root=fileURLToPath(new URL('..',import.meta.url)),folder=await mkdtemp(join(tmpdir(),'language-align-'));
 try{
  const a=join(folder,'before.image'),b=join(folder,'after.image'),config=join(folder,'config.json');
  await Promise.all([writeFile(a,before),writeFile(b,after),writeFile(config,JSON.stringify({before:a,after:b,ignore,scale}))]);
  return await new Promise((resolve,reject)=>execFile(platformPaths({root}).python,['-B','-u',fileURLToPath(new URL('./local-align-worker.py',import.meta.url)),config],{windowsHide:true,timeout:30000,maxBuffer:1000000,signal,env:{...process.env,PYTHONIOENCODING:'utf-8'}},(error,stdout)=>{
   let data;try{data=JSON.parse(stdout.trim())}catch{return reject(Error('자동 정렬 엔진을 시작하지 못했습니다. 로컬 OCR 설치를 확인하세요.'))}
   if(error||data.error)return reject(Error(data.error||'자동 정렬 시간이 초과되었습니다.'));resolve(data);
  }));
 }finally{await rm(folder,{recursive:true,force:true})}
}
