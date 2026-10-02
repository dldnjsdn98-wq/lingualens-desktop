import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {platformPaths} from './platform.js';

export const localModelVersion='rapidocr-3.9.2-ppocrv6-small-korean-v5-v3-exif-shared';
export function localOcr(){
  const root=fileURLToPath(new URL('..',import.meta.url)),paths=platformPaths({root}),python=paths.python;
  const workerEnv={...process.env,...(process.platform==='win32'?{}:{LINGUALENS_OCR_MODELS:paths.models})};
  const script=fileURLToPath(new URL('./local-ocr-worker.py',import.meta.url));
  let child=null,pending=null,idle=null,tail=Promise.resolve();
  const stop=()=>{clearTimeout(idle);if(pending){const p=pending;pending=null;p.reject(Error('로컬 OCR이 종료되었습니다. 다시 분석하세요.'))}child?.kill();child=null};
  function start(){
    if(child)return;
    const process=spawn(python,['-B','-u',script],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:workerEnv});child=process;
    process.stderr.on('data',()=>{});
    const failed=error=>{if(child!==process)return;child=null;if(pending){const p=pending;pending=null;p.reject(error)}};
    process.on('error',()=>failed(Error('로컬 OCR을 시작하지 못했습니다. 앱을 다시 설치하세요.')));
    process.on('exit',()=>failed(Error('로컬 OCR이 종료되었습니다. 다시 분석하세요.')));
    process.stdin.on('error',()=>failed(Error('로컬 OCR에 이미지를 전달하지 못했습니다.')));
    createInterface({input:process.stdout}).on('line',line=>{
      if(child!==process||!pending)return;
      const p=pending;pending=null;
      try{const data=JSON.parse(line);if(data.error)throw Error('로컬 OCR 처리 실패: '+data.error);p.resolve(data)}catch(e){p.reject(e)}
    });
  }
  return {
    available:()=>existsSync(python)&&existsSync(paths.models+'/korean_PP-OCRv5_rec_mobile.onnx'),
    close:stop,
    extract(provider,bytes,type,signal,{languages=[]}={}){
      const execute=async()=>{
        signal?.throwIfAborted();clearTimeout(idle);start();
        try{return await new Promise((resolve,reject)=>{
          const finish=(callback,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);callback(value)};
          const abort=()=>{const p=pending;pending=null;p?.reject(signal?.reason||new DOMException('Aborted','AbortError'));stop()};
          const timer=setTimeout(()=>{pending=null;finish(reject,Error('로컬 OCR 시간이 초과되었습니다. 영역을 지정해 다시 시도하세요.'));stop()},90000);
          pending={resolve:value=>finish(resolve,value),reject:error=>finish(reject,error)};
          signal?.addEventListener('abort',abort,{once:true});
          child.stdin.write(JSON.stringify({image:bytes.toString('base64'),languages})+'\n');
        })}finally{idle=setTimeout(stop,45000);idle.unref()}
      };
      const result=tail.then(execute,execute);tail=result.catch(()=>{});return result;
    }
  };
}
