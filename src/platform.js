import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
export function platformPaths({platform=process.platform,env=process.env,home=homedir(),root=fileURLToPath(new URL('..',import.meta.url))}={}){
 const windows=platform==='win32';
 return {
  data:windows?join(env.LOCALAPPDATA||home,'LinguaLens'):join(env.XDG_DATA_HOME||join(home,'.local','share'),'language-test'),
  cache:windows?join(env.LOCALAPPDATA||home,'LinguaLens','ocr-cache'):join(env.XDG_CACHE_HOME||join(home,'.cache'),'language-test','ocr-cache'),
  python:env.LINGUALENS_PYTHON||join(root,'vendor','ocr',windows?'python.exe':'venv/bin/python'),
  models:env.LINGUALENS_OCR_MODELS||join(root,'vendor','ocr',windows?'packages/rapidocr/models':'models'),
  codex:env.LINGUALENS_CODEX_CMD||(windows?'codex.exe':'codex'),
  agy:env.LINGUALENS_AGY_CMD||(windows?join(env.LOCALAPPDATA||join(home,'AppData','Local'),'agy','bin','agy.exe'):'agy')
 };
}
export function terminalCandidates(file,args=[]){
 return [{file:'x-terminal-emulator',args:['-e',file,...args]},
  {file:'gnome-terminal',args:['--',file,...args]},
  {file:'konsole',args:['-e',file,...args]},
  {file:'xfce4-terminal',args:['--execute',file,...args]},
  {file:'xterm',args:['-e',file,...args]}];
}
