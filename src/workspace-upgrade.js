export const workspaceUpgrade=String.raw`
let draftTimer=null,draftTail=Promise.resolve(),copyPlan=null,libraryRecords=[],presetRecords=[],pond=null;
W.draftId=crypto.randomUUID();W.revision=0;W.removed=[];
function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,2500)}
async function saveDraft(force=false){
  if(!W.dirty||!W.items.length)return {ok:true,saved:false};
  if(!force&&(W.busy||W.operation||S.controller)){scheduleDraft();return {ok:true,saved:false}}
  const revision=W.revision,id=W.draftId,sourceProjectId=W.projectId;
  const task=async()=>{
    try{const data=await workspaceData();if(id!==W.draftId)return {ok:false,saved:false};await projectRequest('/api/workspace/drafts',{...data,id,sourceProjectId});
      if(id===W.draftId)$('draftStatus').textContent='임시 저장됨 · '+new Date().toLocaleTimeString('ko-KR')+' · 앱에 저장을 누르면 작업 목록에 보관됩니다.';
      if(revision!==W.revision)scheduleDraft();return {ok:true,saved:true};
    }catch(error){$('draftStatus').textContent='임시 저장 실패 · '+error.message+' · 앱에 저장 또는 백업을 이용하세요.';return {ok:false,saved:false,error:error.message}}
  };
  draftTail=draftTail.then(task,task);return await draftTail;
}
async function clearDraft(){clearTimeout(draftTimer);const id=W.draftId;await draftTail;try{await projectRequest('/api/workspace/drafts/delete',{id})}catch{}$('draftStatus').textContent='작업이 저장되었습니다.';await refreshRecovery()}
async function refreshRecovery(){try{
  const drafts=await projectRequest('/api/workspace/drafts');
  $('recoveryList').innerHTML=drafts.length?drafts.map(p=>'<div class="library-row"><span>'+esc(p.folder)+' / '+esc(p.name)+' · '+p.count+'장 · '+esc(new Date(p.updated).toLocaleString('ko-KR'))+'</span><button class="secondary small" data-recover="'+p.id+'">임시 작업 복구</button><button class="ghost small" data-discard-draft="'+p.id+'">지우기</button></div>').join(''):'<p class="help">복구할 임시 작업이 없습니다.</p>';
  $('recoveryPanel').open=!!drafts.length;
  $('recoveryList').querySelectorAll('[data-recover]').forEach(button=>button.onclick=async()=>{if(W.busy||W.operation||S.controller)return;if(W.dirty&&!confirm('현재 변경 사항을 임시 저장하고 복구할까요?'))return;await saveDraft();const data=await projectRequest('/api/workspace/drafts?id='+button.dataset.recover);await loadWorkspace(new File([JSON.stringify(data)],'draft.json'),'draft')});
  $('recoveryList').querySelectorAll('[data-discard-draft]').forEach(button=>button.onclick=async()=>{if(W.busy||W.operation||S.controller)return;if(!confirm('이 임시 작업을 지울까요?'))return;await projectRequest('/api/workspace/drafts/delete',{id:button.dataset.discardDraft});await refreshRecovery()});
}catch(error){$('recoveryList').textContent=error.message}}
async function imageSize(item){if(!item.imageSize){const bitmap=await createImageBitmap(item.file);item.imageSize={width:bitmap.width,height:bitmap.height};bitmap.close()}return item.imageSize}
async function prepareCopy(source,dest,targets,kind='copy'){
  const sourceSize=source.image||await imageSize(source),sizes=await Promise.all(dest.map(imageSize));
  copyPlan={sourceSize,dest,targets:structuredClone(targets),kind,ignoreRegions:structuredClone(source.ignoreRegions||[]),profile:source.profile||null};
  const mismatches=dest.map((item,index)=>regionCopy(sourceSize,sizes[index],targets).mismatch);
  $('copyMode').value=mismatches.some(Boolean)?'text':'all';
  $('copyPreview').innerHTML='<p>원본 설정: '+sourceSize.width+'×'+sourceSize.height+' · '+targets.filter(x=>x.text).length+'개 문구</p>'+dest.map((item,index)=>'<p>'+esc(item.file.name)+' · '+sizes[index].width+'×'+sizes[index].height+' · <strong>'+(!targets.some(x=>x.region)?'복사할 영역이 없는 설정입니다.':mismatches[index]?'화면 비율이 다릅니다. 영역 위치를 확인하세요.':'화면 비율이 같습니다.')+'</strong></p>').join('');
  if(copyPlan.profile){const p=normalizeProfile(copyPlan.profile);$('copyPreview').insertAdjacentHTML('beforeend','<p>분석: '+esc(p.provider)+' · '+esc(p.mode)+' · 재확인: '+esc(p.autoReview)+' · OCR 순서: '+esc(p.ocrLayout)+' · 무시 영역 '+copyPlan.ignoreRegions.length+'곳</p>')}$('copyWarning').textContent=mismatches.some(Boolean)?'기본 선택은 문구만 복사입니다. 영역까지 복사하면 상대 좌표를 그대로 사용하므로 적용 후 미리보기에서 위치를 확인하세요.':'복사 후 이전 결과를 지우고 재검증 대상으로 표시합니다.';
  $('copyDialog').showModal();
}
$('copySettings').onclick=async()=>{if(W.busy||W.operation||S.controller)return;snapshot();const source=W.items.find(x=>x.id===W.active),dest=W.items.filter(x=>x.selected&&x!==source);if(!source||!dest.length)return error('설정을 복사할 다른 이미지를 선택하세요.');const unlock=lockWorkspace();try{await prepareCopy(source,dest,source.targets)}catch(e){error(e.message)}finally{unlock()}};
$('applyCopy').onclick=async()=>{
  if(W.busy||W.operation||S.controller||!copyPlan)return;
  const plan=copyPlan,omitRegions=$('copyMode').value==='text';
  for(const item of plan.dest){const copied=regionCopy(plan.sourceSize,await imageSize(item),plan.targets,{omitRegions});item.targets=copied.targets.map(t=>({...t,id:crypto.randomUUID()}));if(plan.kind==='preset')item.ignoreRegions=omitRegions?[]:structuredClone(plan.ignoreRegions||[]);item.payload=null;item.resultTargets=[];item.problem='설정 적용 · 재검증 필요'}
  const active=plan.dest.find(x=>x.id===W.active);if(active){resetResult();$('entries').replaceChildren();active.targets.forEach(add)}
  if(plan.profile)applyProfileOptions(plan.profile);dirty();queue();copyPlan=null;$('copyDialog').close();$('workspaceStatus').textContent=plan.dest.length+'장에 설정을 적용했습니다 · 영역 위치를 확인하세요.';
};
async function refreshPresets(){try{presetRecords=await projectRequest('/api/workspace/presets');$('presetSelect').innerHTML='<option value="">저장한 설정 선택</option>'+presetRecords.map(p=>'<option value="'+p.id+'">'+esc(p.name)+' · '+p.targets.filter(t=>t.text).length+'개</option>').join('')}catch(e){error(e.message)}}
$('savePreset').onclick=async()=>{if(W.busy||W.operation||S.controller)return;snapshot();const item=W.items.find(x=>x.id===W.active);if(!item?.targets.some(x=>x.text))return error('이미지와 문구를 먼저 설정하세요.');const unlock=lockWorkspace();try{const saved=await projectRequest('/api/workspace/presets',{name:$('presetName').value,targets:item.targets,image:await imageSize(item),ignoreRegions:$('profileInclude').checked?item.ignoreRegions||[]:[],profile:$('profileInclude').checked?profileOptions():null});await refreshPresets();$('presetSelect').value=saved.id;$('workspaceStatus').textContent='자주 쓰는 설정을 저장했습니다.'}catch(e){error(e.message)}finally{unlock()}};
$('loadPreset').onclick=async()=>{if(W.busy||W.operation||S.controller)return;const preset=presetRecords.find(x=>x.id===$('presetSelect').value),item=W.items.find(x=>x.id===W.active);if(!preset||!item)return error('이미지와 저장한 설정을 선택하세요.');snapshot();const unlock=lockWorkspace();try{await prepareCopy(preset,[item],preset.targets,'preset')}catch(e){error(e.message)}finally{unlock()}};
$('deletePreset').onclick=async()=>{if(W.busy||W.operation||S.controller)return;const id=$('presetSelect').value;if(!id||!confirm('저장한 설정을 삭제할까요?'))return;await projectRequest('/api/workspace/presets/delete',{id});await refreshPresets()};
$('undoImage').onclick=()=>{if(W.busy||W.operation||S.controller)return;const removed=W.removed.pop();if(!removed)return;if(W.items.length>=200||W.items.reduce((n,x)=>n+x.file.size,0)+removed.item.file.size>512*1024*1024){W.removed.push(removed);return error('이미지 개수·용량 제한으로 복구하지 못했습니다.')}snapshot();W.items.splice(Math.min(removed.index,W.items.length),0,removed.item);activate(removed.item.id);dirty();queue();$('undoImage').disabled=!W.removed.length};
$('projectSearch').oninput=()=>renderLibrary();$('projectStatus').onchange=()=>renderLibrary();
async function refreshTrash(){try{const items=await projectRequest('/api/projects/trash');$('trashList').innerHTML=items.length?items.map(p=>'<div class="library-row"><span>'+esc(p.folder)+' / '+esc(p.name)+' · '+p.count+'장</span><button class="secondary small" data-restore-project="'+p.id+'">복원</button></div>').join(''):'<p class="help">휴지통이 비어 있습니다.</p>';$('trashList').querySelectorAll('[data-restore-project]').forEach(button=>button.onclick=async()=>{if(W.busy||W.operation||S.controller)return;const unlock=lockWorkspace();try{await projectRequest('/api/projects/restore',{id:button.dataset.restoreProject});await refreshLibrary();await refreshTrash()}catch(e){error(e.message)}finally{unlock()}})}catch(e){$('trashList').textContent=e.message}}
function flushPond(){
  if(!pond)return;const files=pond.getFiles();if(!files.length)return;
  if(W.busy||W.operation||S.controller){setTimeout(flushPond,500);return}
  const incoming=files.map(p=>{const file=p.file,path=file.webkitRelativePath||file._relativePath;return path?new File([file],String(path).slice(0,240),{type:file.type,lastModified:file.lastModified}):file});
  addImages(incoming).then(added=>{if(added)pond.removeFiles()});
}
if(typeof FilePond!=='undefined'){
  pond=FilePond.create($('folderImport'),{allowMultiple:true,maxFiles:200,allowProcess:false,allowRevert:false,instantUpload:false,storeAsFile:false,credits:false,labelIdle:'폴더나 이미지를 놓거나 <span class="filepond--label-action">파일을 선택하세요</span>',onupdatefiles:()=>{clearTimeout(W.pondTimer);W.pondTimer=setTimeout(flushPond,500)}});
}
$('chooseFolder').onclick=()=>{if(!W.busy&&!W.operation&&!S.controller)$('directoryInput').click()};
$('directoryInput').onchange=async event=>{const files=[...event.target.files];event.target.value='';if(!files.length)return;const images=files.filter(file=>['image/png','image/jpeg','image/webp'].includes(file.type));if(!images.length)return error('폴더에 지원하는 이미지가 없습니다.');const folder=images[0].webkitRelativePath.split('/')[0];if(!W.items.length&&folder){$('workspaceFolder').value=folder;$('workspaceName').value=folder}await addImages(images.map(file=>new File([file],file.webkitRelativePath||file.name,{type:file.type,lastModified:file.lastModified})))};
refreshRecovery();refreshPresets();refreshTrash();
`;
