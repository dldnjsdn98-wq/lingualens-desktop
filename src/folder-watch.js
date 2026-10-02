import {readdir,stat,readFile,realpath,mkdir,unlink} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
const types={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
export function folderWatch({now=Date.now}={}){
 let session=null;
 async function scan(root,depth=0,list=[]){
  if(depth>4)return list;
  for(const entry of await readdir(root,{withFileTypes:true})){
   if(list.length>=2000)throw Error('자동 가져오기 폴더는 이미지 2,000개 이하로 선택하세요.');
   if(entry.isSymbolicLink())continue;const path=join(root,entry.name);
   if(entry.isDirectory())await scan(path,depth+1,list);
   else if(entry.isFile()){const type=types[/\.[^.]+$/.exec(entry.name.toLowerCase())?.[0]];if(!type)continue;const s=await stat(path);if(s.size>0&&s.size<=10485760)list.push({path,type,size:s.size,mtime:s.mtimeMs})}
  }return list;
 }
 return {
  async start(path,includeExisting=false){const root=await realpath(resolve(path));if(!(await stat(root)).isDirectory())throw Error('이미지 폴더를 선택하세요.');const list=await scan(root);session={id:randomUUID(),root,seen:new Set(includeExisting?[]:list.map(x=>x.path+'|'+x.size+'|'+x.mtime)),samples:new Map(),pending:new Map()};return {id:session.id,path:root}},
  stop(){session=null},
  async poll(id){if(!session||session.id!==id)throw Error('자동 가져오기를 다시 시작하세요.');const s=session,list=await scan(s.root),present=new Set(list.map(x=>x.path));
   const stamps=new Map(list.map(f=>[f.path,f.path+'|'+f.size+'|'+f.mtime]));
   for(const [key,v] of s.pending)if(!present.has(v.path)||stamps.get(v.path)!==v.stamp)s.pending.delete(key);
   const timestamp=now();for(const file of list){const stamp=file.path+'|'+file.size+'|'+file.mtime;if(s.seen.has(stamp))continue;const prev=s.samples.get(file.path);if(!prev||prev.stamp!==stamp){s.samples.set(file.path,{stamp,at:timestamp});continue}if(timestamp-prev.at<2000)continue;if(![...s.pending.values()].some(x=>x.stamp===stamp))s.pending.set(randomUUID(),{...file,stamp,name:relative(s.root,file.path).replaceAll('\\','/')})}
   for(const key of s.samples.keys())if(!present.has(key))s.samples.delete(key);
   return {files:[...s.pending].slice(0,20).map(([key,f])=>({key,name:f.name,size:f.size,type:f.type})),pending:s.pending.size};
  },
  async read(id,key){if(!session||session.id!==id)throw Error('자동 가져오기가 종료됐습니다.');const file=session.pending.get(key);if(!file)throw Error('이미지 목록을 다시 확인하세요.');const actual=await realpath(file.path),rel=relative(session.root,actual);if(rel.startsWith('..')||isAbsolute(rel))throw Error('선택한 폴더 안의 이미지만 가져올 수 있습니다.');const s=await stat(actual);if(s.size!==file.size||s.mtimeMs!==file.mtime)throw Error('이미지 저장이 끝난 뒤 다시 가져옵니다.');const bytes=await readFile(actual);return {bytes,type:file.type,name:file.name}},
  ack(id,keys){if(!session||session.id!==id)return;for(const key of keys){const f=session.pending.get(key);if(f){session.seen.add(f.stamp);session.pending.delete(key)}}}
 };
}
export async function pickFolder(root){
 if(process.platform!=='win32'){
  if(!process.env.DISPLAY&&!process.env.WAYLAND_DISPLAY)throw Error('화면 없는 환경에서는 폴더 경로를 직접 입력하세요.');
  for(const [file,args] of [['zenity',['--file-selection','--directory','--title=작업 이미지 폴더']],['kdialog',['--getexistingdirectory',homedir()]]]){
   try{return (await new Promise((resolve,reject)=>execFile(file,args,{timeout:120000,maxBuffer:16384},(error,out)=>error?reject(error):resolve(out)))).trim()}catch(e){if(e.code===1)return '';if(e.code!=='ENOENT')throw Error('폴더 선택을 완료하지 못했습니다.')}
  }
  throw Error('zenity 또는 kdialog를 설치하거나 폴더 경로를 직접 입력하세요.');
 }
 const helper=fileURLToPath(new URL('../LinguaLensFolderPicker.exe',import.meta.url)),output=join(root,'picker',randomUUID()+'.txt');await mkdir(join(root,'picker'),{recursive:true});
 try{await new Promise((resolve,reject)=>execFile(helper,[output],{windowsHide:true,timeout:120000},error=>error?reject(Error(error.code==='ENOENT'?'배포 앱의 폴더 선택 버튼을 사용하거나 폴더 경로를 입력하세요.':'폴더 선택을 완료하지 못했습니다.')):resolve()));return (await readFile(output,'utf8')).trim()}
 finally{await unlink(output).catch(()=>{})}
}
