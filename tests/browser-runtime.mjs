import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
const require=createRequire(import.meta.url),moduleName=process.env.LANGUAGE_TEST_PLAYWRIGHT_MODULE||'playwright';
export function browserRuntime(){
 let api,expect;
 try{api=require(moduleName);({expect}=require(moduleName==='playwright'?'playwright/test':join(moduleName,'test')))}catch(error){
  throw Error('브라우저 검사에 Playwright가 필요합니다. npm install --no-save --package-lock=false playwright 후 실행하거나 LANGUAGE_TEST_PLAYWRIGHT_MODULE에 설치된 패키지 경로를 지정하세요.',{cause:error});
 }
 const supplied=process.env.LANGUAGE_TEST_BROWSER_PATH;
 const edge=process.platform==='win32'?[process.env['PROGRAMFILES(X86)'],process.env.PROGRAMFILES].filter(Boolean).map(p=>join(p,'Microsoft','Edge','Application','msedge.exe')).find(existsSync):null;
 return{chromium:api.chromium,expect:expect.configure({timeout:10000}),launch:{headless:true,...(supplied||edge?{executablePath:supplied||edge}:{})}};
}
