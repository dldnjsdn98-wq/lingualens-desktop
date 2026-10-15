import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {platformPaths} from './platform.js';

export const localModelVersion='rapidocr-3.9.2-ppocrv6-small-korean-v5-v3-exif-shared';
export function localOcr({spawnProcess=spawn,requestTimeout=90000,idleTimeout=45000}={}){
  const root=fileURLToPath(new URL('..',import.meta.url)),paths=platformPaths({root}),python=paths.python;
  const workerEnv={...process.env,...(process.platform==='win32'?{}:{LINGUALENS_OCR_MODELS:paths.models})};
  const script=fileURLToPath(new URL('./local-ocr-worker.py',import.meta.url)),queue=[];
  let child=null,pending=null,idle=null,closed=false;
  const closedError=()=>Error('로컬 OCR이 종료되었습니다. 앱을 다시 실행하세요.');
  function finish(error,value){
    const request=pending;if(!request)return;pending=null;
    request.settle(error,value);pump();
  }
  function stop(error=Error('로컬 OCR이 종료되었습니다. 다시 분석하세요.')){
    clearTimeout(idle);const worker=child;child=null;worker?.kill();finish(error);
  }
  function start(){
    if(child)return;
    const worker=spawnProcess(python,['-B','-u',script],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:workerEnv});child=worker;
    worker.stderr.on('data',()=>{});
    const failed=message=>{if(child===worker)stop(Error(message))};
    worker.on('error',()=>failed('로컬 OCR을 시작하지 못했습니다. 앱을 다시 설치하세요.'));
    worker.on('exit',()=>failed('로컬 OCR이 종료되었습니다. 다시 분석하세요.'));
    worker.stdin.on('error',()=>failed('로컬 OCR에 이미지를 전달하지 못했습니다.'));
    createInterface({input:worker.stdout}).on('line',line=>{
      if(child!==worker||!pending)return;
      let data;try{data=JSON.parse(line)}catch{stop(Error('로컬 OCR 응답을 읽지 못했습니다. 다시 분석하세요.'));return}
      if(!data||typeof data!=='object')stop(Error('로컬 OCR 응답을 읽지 못했습니다. 다시 분석하세요.'));
      else if(data.error)finish(Error('로컬 OCR 처리 실패: '+data.error));
      else if(!Array.isArray(data.lines))stop(Error('로컬 OCR 응답을 읽지 못했습니다. 다시 분석하세요.'));
      else finish(null,data);
    });
  }
  function pump(){
    if(closed||pending)return;
    clearTimeout(idle);
    const request=queue.shift();
    if(!request){if(child){idle=setTimeout(()=>stop(),idleTimeout);idle.unref()}return}
    pending=request;
    try{
      start();request.timer=setTimeout(()=>stop(Error('로컬 OCR 시간이 초과되었습니다. 영역을 지정해 다시 시도하세요.')),requestTimeout);
      const worker=child;
      worker.stdin.write(JSON.stringify({image:request.bytes.toString('base64'),languages:request.languages})+'\n',error=>{
        if(error&&child===worker&&pending===request)stop(Error('로컬 OCR에 이미지를 전달하지 못했습니다.'));
      });
    }catch(error){stop(error)}
  }
  return {
    available:()=>!closed&&existsSync(python)&&existsSync(paths.models+'/korean_PP-OCRv5_rec_mobile.onnx'),
    close(){
      if(closed)return;closed=true;
      for(const request of queue.splice(0))request.settle(closedError());
      stop(closedError());
    },
    extract(provider,bytes,type,signal,{languages=[]}={}){
      if(closed)return Promise.reject(closedError());
      if(signal?.aborted)return Promise.reject(signal.reason);
      return new Promise((resolve,reject)=>{
        const request={bytes,languages,timer:null,settled:false};
        const abort=()=>{
          const reason=signal.reason||new DOMException('Aborted','AbortError');
          if(pending===request)stop(reason);
          else{const index=queue.indexOf(request);if(index>=0)queue.splice(index,1);request.settle(reason)}
        };
        request.settle=(error,value)=>{
          if(request.settled)return;request.settled=true;clearTimeout(request.timer);signal?.removeEventListener('abort',abort);
          if(error)reject(error);else resolve(value);
        };
        signal?.addEventListener('abort',abort,{once:true});queue.push(request);pump();
      });
    }
  };
}
