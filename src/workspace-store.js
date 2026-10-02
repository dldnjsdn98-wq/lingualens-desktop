import {normalizePreferences,normalizeProfile} from './enhancement-tools.js';
import {projectStore,defaultProjectRoot} from './project-store.js';
import {join} from 'node:path';
import {mkdir,readFile,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {validateWorkspace} from './workspace-state.js';
export function workspaceStore(root=defaultProjectRoot){
  const drafts=projectStore(join(root,'drafts'),{imageRoot:join(root,'images')}),presets=join(root,'presets');let tail=Promise.resolve();
  const serialize=fn=>{const result=tail.then(fn,fn);tail=result.catch(()=>{});return result};
  const presetPath=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('잘못된 설정 ID입니다.');return join(presets,id+'.json')};
  return {
    async preferences(){return normalizePreferences(JSON.parse(await readFile(join(root,'preferences.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return '{}';throw e})))},
    savePreferences:data=>serialize(async()=>{const value=normalizePreferences(data);await mkdir(root,{recursive:true});const file=join(root,'preferences.json'),temp=file+'.'+randomUUID()+'.tmp';try{await writeFile(temp,JSON.stringify(value));await rename(temp,file)}finally{await unlink(temp).catch(()=>{})}return value}),
    drafts:()=>drafts.list(),draft:(id,options)=>drafts.get(id,options),
    saveDraft:data=>drafts.save(data),removeDraft:id=>drafts.remove(id),
    async presets(){const items=[];for(const file of await readdir(presets).catch(()=>[]))if(/^[a-f0-9-]{36}\.json$/.test(file))try{items.push(JSON.parse(await readFile(join(presets,file),'utf8')))}catch{}return items.sort((a,b)=>String(b.updated).localeCompare(String(a.updated)))},
    savePreset(data){return serialize(async()=>{
      // Reuse the project validator to bound targets; the image is a valid tiny fixture.
      validateWorkspace({format:'language-test-workspace',version:1,items:[{name:'validation',data:'data:image/png;base64,AAAA',targets:data.targets,ignoreRegions:data.ignoreRegions||[]}]});
      const size=data.image;if(!size||!Number.isFinite(size.width)||!Number.isFinite(size.height)||size.width<=0||size.height<=0)throw Error('설정의 이미지 크기를 확인하세요.');
      const id=data.id||randomUUID(),record={id,name:String(data.name||'자주 쓰는 설정').trim().slice(0,100),targets:data.targets,image:size,ignoreRegions:data.ignoreRegions||[],profile:data.profile?normalizeProfile(data.profile):null,updated:new Date().toISOString()};
      await mkdir(presets,{recursive:true});const file=presetPath(id),temp=file+'.'+randomUUID()+'.tmp';
      try{await writeFile(temp,JSON.stringify(record));await rename(temp,file)}finally{await unlink(temp).catch(()=>{})}return record;
    })},
    removePreset:id=>serialize(()=>unlink(presetPath(id)))
  };
}
