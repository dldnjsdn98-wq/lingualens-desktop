import {makeServer} from '../src/server.js';
import {execFile} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseLaunchOptions,startupMessage} from './launch-options.mjs';

export async function startLauncher(args=process.argv.slice(2),{signals=process,output=console,env=process.env,openBrowser=execFile,serverOptions={}}={}){
 const {port,headless,selftest,help}=parseLaunchOptions(args);
 if(help){output.log('node linux/launch.mjs [--headless] [--port 41837] [--selftest]\n--port 0: 사용 가능한 포트 자동 선택 (기본값)\n--selftest: 분리된 임시 폴더에서 상태 확인 후 종료');return null}
 const temporary=selftest?await mkdtemp(join(tmpdir(),'language-launch-test-')):null;
 const server=makeServer(temporary?{...serverOptions,projectRoot:join(temporary,'projects'),cacheRoot:join(temporary,'cache')}:serverOptions);
 let closing=null;
 function stop(){if(closing)return closing;closing=(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));signals.off('SIGINT',onSignal);signals.off('SIGTERM',onSignal);if(temporary)await rm(temporary,{recursive:true,force:true})})();return closing}
 function onSignal(){void stop().catch(error=>{output.error('종료 정리에 실패했습니다: '+error.message);process.exitCode=1})}
 try{
 await new Promise((resolve,reject)=>{const failed=error=>{server.off('listening',ready);reject(error)},ready=()=>{server.off('error',failed);resolve()};server.once('error',failed);server.once('listening',ready);server.listen(port,'127.0.0.1')});
 signals.on('SIGINT',onSignal);signals.on('SIGTERM',onSignal);
 const url='http://127.0.0.1:'+server.address().port;
 if(selftest){
  const health=await(await fetch(url+'/healthz',{signal:AbortSignal.timeout(5000)})).json();
  if(health.status!=='ok'||health.version!==(await readFile(new URL('../version.txt',import.meta.url),'utf8')).trim())throw Error('Launcher health check failed');
  output.log(JSON.stringify({test:'launcher',status:'pass',version:health.version}));await stop();
 }else{
  output.log('READY '+url+'\n종료: Ctrl+C');
  if(!headless){
   if(env.DISPLAY||env.WAYLAND_DISPLAY)openBrowser('xdg-open',[url],error=>{if(error)output.error('브라우저에서 위 주소를 직접 여세요.');});
   else output.log('화면 없는 환경입니다. --headless 실행 또는 SSH 포트 전달로 접속하세요.');
  }
 }
 return {server,url,stop,temporary};
 }catch(error){await stop();throw Error(startupMessage(error,port))}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await startLauncher()}catch(error){console.error(error.message);process.exitCode=1}}
