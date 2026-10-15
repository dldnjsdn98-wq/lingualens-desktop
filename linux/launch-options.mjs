export function parseLaunchOptions(args){
 const options={port:0,headless:false,selftest:false,help:false};let portSeen=false;
 for(let index=0;index<args.length;index++){
  const value=args[index];
  if(value==='--headless')options.headless=true;
  else if(value==='--selftest')options.selftest=true;
  else if(value==='--help'||value==='-h')options.help=true;
  else if(value==='--port'||value.startsWith('--port=')){
   if(portSeen)throw Error('--port는 한 번만 지정하세요.');portSeen=true;
   const raw=value==='--port'?args[++index]:value.slice(7);
   if(typeof raw!=='string'||!/^\d{1,5}$/.test(raw)||Number(raw)>65535)throw Error('포트는 0~65535의 정수로 지정하세요. 예: --port 41837');
   options.port=Number(raw);
  }else throw Error('알 수 없는 실행 옵션: '+value+' · --help로 사용법을 확인하세요.');
 }
 return options;
}
export function startupMessage(error,port){
 if(error.code==='EADDRINUSE')return '포트 '+port+'를 다른 프로그램이 사용 중입니다. --port 0으로 자동 선택하거나 다른 포트를 지정하세요.';
 if(error.code==='EACCES')return '포트 '+port+'에 연결할 권한이 없습니다. 다른 포트를 지정하세요.';
 return error.message||'앱을 실행하지 못했습니다.';
}
