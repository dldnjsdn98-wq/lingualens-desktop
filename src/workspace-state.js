// These helpers also run in the browser; keep them independent of Node APIs.
export function targetSignature(targets) {
  return JSON.stringify(targets.filter(item=>item.text.length).map(item=>({
    id:item.id,label:item.label||'',text:item.text,language:item.language,
    mode:item.mode,region:item.region||null
  })));
}

export function validateWorkspace(data) {
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const region=value=>value==null||(object(value)&&
    ['x','y','width','height'].every(key=>Number.isFinite(value[key]))&&
    value.x>=0&&value.y>=0&&value.width>0&&value.height>0&&
    value.x+value.width<=1.001&&value.y+value.height<=1.001);
  const targets=list=>Array.isArray(list)&&list.length<=80&&list.every(item=>
    object(item)&&typeof item.id==='string'&&typeof item.text==='string'&&item.text.length<=3000&&
    typeof item.language==='string'&&['exact','required'].includes(item.mode)&&region(item.region));
  if(!object(data)||data.format!=='language-test-workspace'||data.version!==1||
    !Array.isArray(data.items)||!data.items.length||data.items.length>200)throw Error('지원하는 Language Test 작업 파일이 아닙니다.');
  const image=value=>object(value)&&/^[a-f0-9]{64}$/.test(value.hash)&&['image/png','image/jpeg','image/webp'].includes(value.type)&&Number.isInteger(value.size)&&value.size>0&&value.size<=10485760;
  if(data.batch!=null&&(!object(data.batch)||!['paused','running','complete'].includes(data.batch.status)||!Array.isArray(data.batch.ids)||data.batch.ids.length>200||!data.batch.ids.every(x=>typeof x==='string')||(!object(data.batch.done)||Object.keys(data.batch.done).length>200||!Object.values(data.batch.done).every(v=>typeof v==='string'&&v.length<300000))))throw Error('저장된 실행 목록을 확인하세요.');
  let total=0;
  for(const item of data.items){
    if(!object(item))throw Error('저장된 이미지 형식을 확인하세요.');
    if(item.id!=null&&(typeof item.id!=='string'||!/^[a-f0-9-]{36}$/.test(item.id)))throw Error('이미지 ID를 확인하세요.');
    if(!object(item)||typeof item.name!=='string'||
      !(image(item.image)||(typeof item.data==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.data)&&item.data.length<=14000000))||!targets(item.targets)||
      (item.resultTargets!=null&&!targets(item.resultTargets)))throw Error('저장된 이미지·문구·영역 형식을 확인하세요.');
    const encoded=item.data?.slice(item.data.indexOf(',')+1);
    if(encoded&&encoded.length%4!==0)throw Error('저장된 이미지 형식을 확인하세요.');
    const size=image(item.image)?item.image.size:encoded.length/4*3-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);
    total+=size;
    if(size>10485760||total>512*1024*1024)throw Error('이미지 합계는 512MB, 한 장은 10MB 이하여야 합니다.');
    if(item.ignoreRegions!=null&&(!Array.isArray(item.ignoreRegions)||item.ignoreRegions.length>40||!item.ignoreRegions.every(r=>r&&region(r))))throw Error('무시 영역을 확인하세요.');
    if(item.reviews!=null&&(!object(item.reviews)||Object.keys(item.reviews).length>80||!Object.values(item.reviews).every(r=>object(r)&&['accepted','issue'].includes(r.verdict)&&typeof r.note==='string'&&r.note.length<=2000&&typeof r.signature==='string'&&r.signature.length<=300000&&typeof r.at==='string')))throw Error('검수 기록을 확인하세요.');
    if(item.reviewNotes!=null&&(!object(item.reviewNotes)||Object.keys(item.reviewNotes).length>80||!Object.values(item.reviewNotes).every(r=>object(r)&&typeof r.note==='string'&&r.note.length<=2000&&typeof r.at==='string')))throw Error('검수 메모를 확인하세요.');
    if(item.view!=null&&(!object(item.view)||!['fit','original','manual'].includes(item.view.mode)||!Number.isFinite(item.view.zoom)||item.view.zoom<.02||item.view.zoom>16||!['x','y'].every(k=>Number.isFinite(item.view[k])&&item.view[k]>=0&&item.view[k]<=1)))throw Error('저장된 확대 위치를 확인하세요.');
    if(item.targets.some(t=>(t.locked!=null&&typeof t.locked!=='boolean')||(t.hidden!=null&&typeof t.hidden!=='boolean')))throw Error('영역 잠금·표시 설정을 확인하세요.');
    if(item.baselineHistory!=null&&(!Array.isArray(item.baselineHistory)||item.baselineHistory.length>10||!item.baselineHistory.every(b=>object(b)&&typeof b.id==='string'&&/^[a-f0-9-]{36}$/.test(b.id)&&typeof b.name==='string'&&typeof b.at==='string'&&(b.tag==null||typeof b.tag==='string'&&b.tag.length<=80)&&image(b.image)&&(b.data==null||typeof b.data==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.data)&&b.data.length<=14000000))))throw Error('비교 기준 이력을 확인하세요.');
    if(item.comparison!=null&&(!object(item.comparison)||(item.comparison.regions!=null&&(!Array.isArray(item.comparison.regions)||item.comparison.regions.length>80||!item.comparison.regions.every(r=>object(r)&&['x','y','width','height','count'].every(k=>Number.isFinite(r[k])&&r[k]>=0))))))throw Error('저장된 화면 비교를 확인하세요.');
    if(item.baseline!=null&&(!object(item.baseline)||!image(item.baseline.image)||typeof item.baseline.name!=='string'))throw Error('비교 기준 이미지를 확인하세요.');
    if(item.baseline?.data!=null&&(typeof item.baseline.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.baseline.data)||item.baseline.data.length>14000000))throw Error('비교 기준 백업 이미지를 확인하세요.');
    if(item.problem!=null&&(typeof item.problem!=='string'||item.problem.length>2000))throw Error('저장된 오류 상태를 확인하세요.');
    if(item.payload!=null){
      const p=item.payload,r=p.result,line=l=>object(l)&&typeof l.text==='string'&&region(l.boundingBox);
      if(!object(p)||!object(r)||!Array.isArray(r.results)||r.results.length>80||
        !Array.isArray(r.lines)||!r.lines.every(line)||!r.results.every(x=>object(x)&&
          typeof x.id==='string'&&typeof x.text==='string'&&typeof x.found==='boolean'&&
          typeof x.reason==='string'&&region(x.region)&&
          [x.evidence,x.nearestEvidence].every(list=>list==null||(Array.isArray(list)&&list.every(line)))&&
          (x.missingCandidates==null||Array.isArray(x.missingCandidates))))throw Error('저장된 검증 결과 형식을 확인하세요.');
    }
  }
  return data;
}
