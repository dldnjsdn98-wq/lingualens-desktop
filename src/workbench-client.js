// Shares the existing controls and storage; moving DOM nodes preserves handlers.
export const workbenchClient=String.raw`
var UI={ready:false,tab:'settings',mode:'select',regionId:null,drag:null};
function mountWorkbench(){
  document.body.classList.add('workbench');
  const app=document.querySelector('.app'),layout=document.querySelector('.layout'),side=document.querySelector('.workspace-card'),preview=document.querySelector('.preview-card'),inspector=document.querySelector('.inspector-card');
  document.querySelector('.hero').hidden=true;
  const shell=document.createElement('div');shell.className='workbench-shell';
  const center=document.createElement('div');center.className='workbench-center';
  const right=document.createElement('aside');right.className='workbench-right';right.setAttribute('aria-label','문구와 검증 결과');
  layout.before(shell);shell.append(side,center,right);center.append(preview);
  const tabs=document.createElement('div');tabs.className='workbench-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','작업 패널');
  tabs.innerHTML='<button id="settingsTab" role="tab" aria-controls="settingsPane" aria-selected="true">문구 설정</button><button id="resultsTab" role="tab" aria-controls="resultsPane" aria-selected="false" tabindex="-1">검증 결과</button>';
  right.append(tabs);
  const settingsPane=document.createElement('div');settingsPane.id='settingsPane';settingsPane.className='workbench-pane';settingsPane.setAttribute('role','tabpanel');settingsPane.setAttribute('aria-labelledby','settingsTab');
  const resultsPane=document.createElement('div');resultsPane.id='resultsPane';resultsPane.className='workbench-pane hidden';resultsPane.setAttribute('role','tabpanel');resultsPane.setAttribute('aria-labelledby','resultsTab');
  resultsPane.innerHTML='<p id="resultEmpty" class="pane-empty">검증 후 결과가 여기에 표시됩니다.</p>';
  right.append(settingsPane,resultsPane);settingsPane.append(inspector);resultsPane.append($('resultCard'));
  right.append($('progress'),document.querySelector('.runbar'));
  const top=document.querySelector('.topbar'),actions=document.createElement('div');actions.className='workbench-top-actions';
  actions.innerHTML='<span id="saveIndicator" class="save-indicator" role="status">새 작업</span><button id="openLibrary" class="ghost small">저장 작업</button><button id="openSettings" class="ghost small">설정</button>';
  actions.append($('versionCheck'));document.querySelector('.shortcuts').remove();top.append(actions);
  const provider=document.createElement('div');provider.className='workbench-provider';provider.append($('cloudProject'),$('connectState'));top.append(provider);
  $('cloudProject').setAttribute('aria-label','분석 도구');
  $('cloudProject').querySelector('[value="local"]').textContent='로컬 OCR · 빠른 분석';$('cloudProject').querySelector('[value="codex"]').textContent='Codex';$('cloudProject').querySelector('[value="gemini"]').textContent='Gemini';
  function dialog(id,title){const node=document.createElement('dialog');node.id=id;node.className='workbench-dialog';node.setAttribute('aria-label',title);node.innerHTML='<div class="dialog-heading"><h2>'+title+'</h2><form method="dialog"><button class="ghost small" aria-label="'+title+' 닫기">닫기</button></form></div>';app.append(node);return node}
  const settingsDialog=dialog('workbenchSettings','도구와 설정'),libraryDialog=dialog('workbenchLibrary','저장 작업'),historyDialog=dialog('workbenchHistory','최근 검증 기록');
  settingsDialog.append(document.querySelector('.connect-card'));document.querySelector('.connect-card h2').textContent='로그인과 연결';document.querySelector('label[for="cloudProject"]').hidden=true;
  const analysis=document.querySelector('.analysis-settings'),reviewOptions=analysis.nextElementSibling,reviewHelp=reviewOptions.nextElementSibling,advanced=document.createElement('details');advanced.open=true;advanced.innerHTML='<summary>분석 옵션</summary>';advanced.append(analysis,reviewOptions,reviewHelp);settingsDialog.append(advanced);
  const details=[...side.children].filter(x=>x.tagName==='DETAILS');
  details.find(x=>x.textContent.includes('자주 쓰는 문구'))?.classList.add('preset-tools');
  for(const node of details){if(node.id==='recoveryPanel'||node.id==='folderTools')continue;if(node.querySelector('#projectLibrary')){node.open=true;libraryDialog.append(node)}else{node.open=true;settingsDialog.append(node)}}
  historyDialog.append(document.querySelector('.history-card'));
  $('openSettings').onclick=()=>settingsDialog.showModal();$('openLibrary').onclick=()=>{refreshLibrary();refreshTrash();libraryDialog.showModal()};
  const historyButton=document.createElement('button');historyButton.id='openHistory';historyButton.className='ghost small';historyButton.textContent='최근 기록';historyButton.onclick=()=>historyDialog.showModal();settingsDialog.prepend(historyButton);
  const head=side.querySelector('.head');head.querySelector('h2').textContent='작업 이미지';head.querySelector('p').remove();
  const metadata=side.querySelector('.toolbar'),info=document.createElement('details');info.className='workspace-info';info.innerHTML='<summary>작업 이름·폴더</summary>';
  metadata.before(info);info.append(...metadata.querySelectorAll('label'),$('folderNames'));
  const imageActions=document.createElement('div');imageActions.className='image-actions';imageActions.innerHTML='<button id="addImageButton" class="secondary small">이미지 추가</button>';
  imageActions.append($('chooseFolder'));info.before(imageActions);$('chooseFolder').textContent='폴더 추가';$('addImageButton').onclick=()=>$('chooseFile').click();
  const saveActions=document.createElement('div');saveActions.className='workspace-save-actions';saveActions.append($('saveLocal'),$('newWorkspace'));info.after(saveActions);
  const batchToolbar=$('selectImages').parentElement;batchToolbar.classList.add('selection-actions');batchToolbar.after($('imageQueue'));
  $('copySettings').textContent='설정 복사';$('runSelected').classList.add('hidden');
  const more=document.createElement('details');more.className='batch-more';more.innerHTML='<summary>일괄 검증</summary>';more.append($('runAll'),$('runPending'));batchToolbar.before(more);metadata.remove();
  const navigation=document.createElement('div');navigation.className='image-navigation';navigation.innerHTML='<input id="imageSearch" type="search" placeholder="이미지 파일명 검색" aria-label="이미지 파일명 검색"><select id="imageStatusFilter" aria-label="이미지 상태 필터"><option value="all">모든 이미지</option><option value="attention">확인할 이미지</option><option value="review">확인 필요</option><option value="fail">미통과</option><option value="pass">통과</option><option value="issue">수동 문제 있음</option><option value="accepted">수동 확인 완료 · 자동 미통과</option><option value="unverified">미검증</option></select><button id="nextAttention" class="ghost small">다음 확인 대상 →</button><p id="queueEmpty" class="help hidden">해당 상태의 이미지가 없습니다.</p>';
  batchToolbar.before(navigation);$('imageStatusFilter').onchange=refreshWorkbench;$('imageSearch').oninput=refreshWorkbench;
  $('nextAttention').onclick=()=>{if(W.busy||W.operation||S.controller)return;const start=W.items.findIndex(x=>x.id===W.active);for(let n=1;n<=W.items.length;n++){const item=W.items[(start+n)%W.items.length];if(needsAttention(item)){$('imageStatusFilter').value='attention';activate(item.id);setWorkbenchTab(item.payload?'results':'settings');return}}$('workspaceStatus').textContent='모든 이미지가 통과했습니다.'};
  const tools=document.createElement('div');tools.className='canvas-modes';tools.setAttribute('role','group');tools.setAttribute('aria-label','이미지 편집 도구');tools.innerHTML='<button id="canvasSelect" class="tool-button" aria-pressed="true">선택</button><button id="canvasMove" class="tool-button" aria-pressed="false">이동</button><button id="canvasDraw" class="tool-button" aria-pressed="false">영역 그리기</button>';
  preview.querySelector('.canvas-toolbar').prepend(tools);preview.querySelector('.canvas-toolbar>div:not(.canvas-modes):not(.zoom-tools)').classList.add('canvas-caption');
  const evidenceLayer=document.createElement('div');evidenceLayer.id='canvasEvidence';$('imageFrame').append(evidenceLayer);
  $('canvasSelect').onclick=()=>setCanvasMode('select');$('canvasMove').onclick=()=>setCanvasMode('move');$('canvasDraw').onclick=()=>{setWorkbenchTab('settings');selectRegion(workbenchEntry(UI.regionId)||document.querySelector('.entry'))};
  $('settingsTab').onclick=()=>setWorkbenchTab('settings');$('resultsTab').onclick=()=>setWorkbenchTab('results');
  tabs.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();setWorkbenchTab(event.key==='Home'?'settings':event.key==='End'?'results':UI.tab==='settings'?'results':'settings');$(UI.tab==='settings'?'settingsTab':'resultsTab').focus()}};
  $('entries').addEventListener('focusin',event=>{const row=event.target.closest('.entry');if(row&&UI.regionId!==row.dataset.id){UI.regionId=row.dataset.id;regions()}});
  $('entries').addEventListener('click',event=>{const row=event.target.closest('.entry');if(row&&UI.regionId!==row.dataset.id){UI.regionId=row.dataset.id;regions()}});
  $('run').onclick=runPrimary;
  $('imageFrame').addEventListener('pointerdown',beginCanvasDrag,true);$('imageFrame').addEventListener('pointermove',moveCanvasDrag,true);$('imageFrame').addEventListener('pointerup',endCanvasDrag,true);$('imageFrame').addEventListener('pointercancel',cancelCanvasDrag,true);
  $('imageFrame').addEventListener('lostpointercapture',cancelCanvasDrag,true);
  $('canvasViewport').addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();const area=point(event),rect=$('imageFrame').getBoundingClientRect(),oldWidth=rect.width;setZoom(S.zoom*(event.deltaY>0?.9:1.1));requestAnimationFrame(()=>{const ratio=$('imageFrame').getBoundingClientRect().width/oldWidth;$('canvasViewport').scrollLeft+=area.x*oldWidth*(ratio-1);$('canvasViewport').scrollTop+=area.y*rect.height*(ratio-1)})},{passive:false});
  $('canvasViewport').ondblclick=event=>{if(event.target.closest('[data-handle]')||S.select)return;fitViewport();$('canvasViewport').scrollTo(0,0)};
  $('autoReview').parentElement.classList.add('hidden');$('autoReviewProvider').onchange=()=>$('autoReview').checked=$('autoReviewProvider').value!=='off';
  $('autoReviewProvider').insertAdjacentHTML('beforebegin','<label for="autoReviewProvider">불확실한 영역 재확인</label>');
  new MutationObserver(refreshSavedIndicator).observe($('draftStatus'),{childList:true,subtree:true});new MutationObserver(refreshSavedIndicator).observe($('workspaceStatus'),{childList:true,subtree:true});
  layout.remove();UI.ready=true;setCanvasMode('select');setWorkbenchTab('settings');refreshWorkbench();
}
function refreshSavedIndicator(){if(!UI?.ready)return;const indicator=$('saveIndicator');indicator.textContent=!W.items.length?'새 작업':!W.dirty?(W.projectId?'작업 목록에 저장됨':'저장 전'):$('draftStatus').textContent.startsWith('임시 저장됨')?'임시 저장됨':$('draftStatus').textContent.startsWith('임시 저장 실패')?'임시 저장 실패':'변경 사항 저장 중';indicator.dataset.state=W.dirty?'draft':'saved';indicator.title=$('workspaceStatus').textContent+' · '+$('draftStatus').textContent}
function refreshWorkbench(){if(!UI?.ready)return;
  const busy=!!(W.busy||W.operation||S.controller),selected=W.items.filter(x=>x.selected).length,filter=$('imageStatusFilter').value;
  let visible=0;for(const row of $('imageQueue').children){const item=W.items.find(x=>x.id===row.dataset.item);if(!item)continue;const state=imageSummary(item);const show=(filter==='all'||(filter==='attention'?needsAttention(item):state.state===filter))&&item.file.name.toLocaleLowerCase().includes($('imageSearch').value.trim().toLocaleLowerCase());row.classList.toggle('hidden',!show);if(show)visible++;row.dataset.state=state.state;const button=row.querySelector('[data-image]');button.setAttribute('aria-current',item.id===W.active?'true':'false');button.querySelector('small').textContent=state.label}
  $('queueEmpty').classList.toggle('hidden',visible>0||!W.items.length);$('nextAttention').disabled=busy||!W.items.some(x=>needsAttention(x));$('imageStatusFilter').disabled=busy;$('imageSearch').disabled=busy;
  W.sortable?.option('disabled',busy||filter!=='all'||!!$('imageSearch').value);
  $('run').textContent=busy?'분석 중…':selected?'선택한 '+selected+'장 검증':'현재 이미지 검증';$('run').disabled=busy||!W.items.length;
  $('saveLocal').disabled=busy||!W.items.length;$('addImageButton').disabled=busy;$('copySettings').disabled=busy||!W.items.some(x=>x.selected&&x.id!==W.active);
  ['canvasSelect','canvasMove','canvasDraw'].forEach(id=>$(id).disabled=busy||!W.items.length);
  document.body.classList.toggle('has-images',W.items.length>0);$('resultEmpty').classList.toggle('hidden',!!S.last);
  if(!UI.regionId||!workbenchEntry(UI.regionId))UI.regionId=document.querySelector('.entry')?.dataset.id;
  refreshSavedIndicator();if(typeof UX!=='undefined'&&UX.ready)refreshUx();if(typeof F!=='undefined'&&F.ready)refreshFeatures();
}
function runPrimary(){return W.items.some(x=>x.selected)?prepareBatch('selected'):run()}
function workbenchEntry(id){return [...$('entries').children].find(row=>row.dataset.id===id)}
function setWorkbenchTab(tab){if(!UI?.ready)return;UI.tab=tab;for(const [name,id] of [['settings','settingsTab'],['results','resultsTab']]){$(id).setAttribute('aria-selected',String(tab===name));$(id).tabIndex=tab===name?0:-1;$(name==='settings'?'settingsPane':'resultsPane').classList.toggle('hidden',tab!==name)}document.body.classList.toggle('viewing-results',tab==='results');$('resultEmpty').classList.toggle('hidden',!!S.last);if(tab==='results'){stopRegion();$('canvasEvidence').classList.remove('hidden')}else{$('canvasEvidence').classList.add('hidden')}regions();if(typeof F!=='undefined'&&F.ready)refreshFeatureResults()}
function setCanvasMode(mode){if(!UI?.ready)return;if(mode!=='draw')stopRegion();UI.mode=mode;document.body.dataset.canvasMode=mode;[['select','canvasSelect'],['move','canvasMove'],['draw','canvasDraw']].forEach(([name,id])=>$(id).setAttribute('aria-pressed',String(mode===name)));$('canvasHint').textContent=mode==='draw'?'드래그하여 새 영역 지정':mode==='move'?'드래그하여 이미지 이동':'영역을 선택하고 모서리로 크기 조절';regions()}
function beginCanvasDrag(event){if(!UI.ready||event.button!==0||W.busy||W.operation||S.controller||UI.mode==='draw'||F?.ignoreDrawing)return;const viewport=$('canvasViewport');
  if(UI.mode==='move'){UI.drag={kind:'pan',pointer:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop}}
  else{if(UI.tab!=='settings')return;const node=event.target.closest('[data-region-id]');if(!node)return;const row=workbenchEntry(node.dataset.regionId);if(!row?.dataset.region||row.dataset.locked==='true')return;if(event.ctrlKey||event.metaKey||event.shiftKey){event.preventDefault();event.stopImmediatePropagation();if(UX.regionSelection.has(row.dataset.id))UX.regionSelection.delete(row.dataset.id);else UX.regionSelection.add(row.dataset.id);regions();updateRegionTools();return}if(!UX.regionSelection.has(row.dataset.id)){UX.regionSelection.clear();UX.regionSelection.add(row.dataset.id)}UI.regionId=row.dataset.id;const rect=$('drawLayer').getBoundingClientRect();UI.drag={kind:'edit',pointer:event.pointerId,row,area:JSON.parse(row.dataset.region),handle:event.target.closest('[data-handle]')?.dataset.handle||'move',x:event.clientX,y:event.clientY,width:rect.width,height:rect.height,node,moved:false,members:!event.target.closest('[data-handle]')?selectedRegionRows().filter(r=>r.dataset.region&&r.dataset.locked!=='true').map(row=>({row,area:JSON.parse(row.dataset.region)})):[]};node.classList.add('active')}
  event.preventDefault();event.stopImmediatePropagation();$('imageFrame').setPointerCapture(event.pointerId);
}
function moveCanvasDrag(event){const drag=UI.drag;if(!drag||drag.pointer!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(drag.kind==='pan'){$('canvasViewport').scrollLeft=drag.left-dx;$('canvasViewport').scrollTop=drag.top-dy;return}
  if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
  drag.next=transformRegion(drag.area,drag.handle,dx/drag.width,dy/drag.height,3/drag.width,3/drag.height);
  if(drag.members.length>1){const moves=moveRegionGroup(drag.members.map(m=>m.area),dx/drag.width,dy/drag.height);drag.members.forEach((m,i)=>{m.next=moves[i];const node=$('regionLayer').querySelector('[data-region-id="'+CSS.escape(m.row.dataset.id)+'"]');if(node){node.style.left=m.next.x*100+'%';node.style.top=m.next.y*100+'%'}});drag.next=drag.members.find(m=>m.row===drag.row).next}const area=drag.next;drag.node.style.left=area.x*100+'%';drag.node.style.top=area.y*100+'%';drag.node.style.width=area.width*100+'%';drag.node.style.height=area.height*100+'%';
}
function endCanvasDrag(event){const drag=UI.drag;if(!drag||drag.pointer!==event.pointerId)return;moveCanvasDrag(event);UI.drag=null;if($('imageFrame').hasPointerCapture(event.pointerId))$('imageFrame').releasePointerCapture(event.pointerId);if(drag.kind==='edit'){if(drag.moved)rememberEdit();if(drag.members.length>1){drag.members.forEach(m=>syncRegion(m.row,m.next||m.area))}else syncRegion(drag.row,drag.next||drag.area);if(drag.moved)edited();drag.row.classList.remove('collapsed');drag.row.querySelector('.collapse').textContent='접기';drag.row.scrollIntoView({block:'nearest'})}}
function cancelCanvasDrag(){const drag=UI?.drag;if(!drag)return;UI.drag=null;if(drag.kind==='edit')regions()}
function workbenchEvidence(item,focus){if(!UI?.ready)return;const root=$('canvasEvidence');root.replaceChildren();if(!item)return;const lines=item.evidence?.length?item.evidence:item.nearestEvidence?.length?item.nearestEvidence:item.region?[{text:'지정 영역',boundingBox:item.region}]:[];lines.forEach(line=>box(root,line.boundingBox,item.found?'evidence-box':item.reviewRequired?'review-box':'nearest-box',line.text||'인식 영역'));if(focus){setWorkbenchTab('results');const area=selectedArea(item);if(area)focusRegion(area)}}
function focusRegion(area){const viewport=$('canvasViewport'),image=$('preview');if(!image.naturalWidth)return;setZoom(Math.min(viewport.clientWidth*.85/(image.naturalWidth*area.width),viewport.clientHeight*.85/(image.naturalHeight*area.height)));requestAnimationFrame(()=>{const frame=$('imageFrame');viewport.scrollLeft=(area.x+area.width/2)*frame.clientWidth-viewport.clientWidth/2;viewport.scrollTop=(area.y+area.height/2)*frame.clientHeight-viewport.clientHeight/2})}
`;
