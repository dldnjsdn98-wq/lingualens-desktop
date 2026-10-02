import {makeServer} from '../src/server.js';
import {execFile} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const args=process.argv.slice(2),selftest=args.includes('--selftest');
if(args.includes('--help')){console.log('node linux/launch.mjs [--headless] [--port 41837] [--selftest]');process.exit(0)}
const index=args.indexOf('--port'),port=index<0?0:Number(args[index+1]);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Port must be 0..65535');
const temporary=selftest?await mkdtemp(join(tmpdir(),'language-launch-test-')):null;
const server=makeServer(temporary?{projectRoot:join(temporary,'projects'),cacheRoot:join(temporary,'cache')}:{});
let closing=false;
async function stop(){if(closing)return;closing=true;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));if(temporary)await rm(temporary,{recursive:true,force:true})}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
 const url='http://127.0.0.1:'+server.address().port;
 if(selftest){
  const health=await(await fetch(url+'/healthz',{signal:AbortSignal.timeout(5000)})).json();
  if(health.status!=='ok'||health.version!==(await readFile(new URL('../version.txt',import.meta.url),'utf8')).trim())throw Error('Launcher health check failed');
  console.log(JSON.stringify({test:'launcher',status:'pass',version:health.version}));await stop();
 }else{
  console.log('READY '+url+'\n종료: Ctrl+C');
  if(!args.includes('--headless')){
   if(process.env.DISPLAY||process.env.WAYLAND_DISPLAY)execFile('xdg-open',[url],error=>{if(error)console.error('브라우저에서 위 주소를 직접 여세요.');});
   else console.log('화면 없는 환경입니다. --headless 실행 또는 SSH 포트 전달로 접속하세요.');
  }
 }
}catch(error){console.error(error.message);await stop();process.exitCode=1}
