import {manualState} from './feature-tools.js';

export function reviewOverview(item) {
  const rows=item?.payload?.result?.results||[];
  const accepted=rows.filter(r=>manualState(item,r.id)?.verdict==='accepted').length;
  const issues=rows.filter(r=>manualState(item,r.id)?.verdict==='issue').length;
  const unresolved=rows.filter(r=>{const m=manualState(item,r.id);return m?.verdict==='issue'||!!item.reviews?.[r.id]&&!m||(!r.found&&m?.verdict!=='accepted')});
  return {total:rows.length,automaticPass:rows.filter(r=>r.found).length,accepted,issues,unreviewed:rows.length-accepted-issues,unresolved};
}

export function batchReadiness(items) {
  const ready=[],missing=[];
  for(const item of items)(item.targets?.some(t=>t.text?.trim())?ready:missing).push(item);
  return {ready,missing};
}

export function fitScale(width,height,viewportWidth,viewportHeight) {
  if(!(width>0&&height>0&&viewportWidth>0&&viewportHeight>0))return 1;
  return Math.min(viewportWidth/width,viewportHeight/height);
}

export function comparisonArea(width,height,region=null) {
  if(!region)return {x:0,y:0,width,height,ratio:Math.min(1,1600/Math.max(width,height))};
  const x=Math.max(0,Math.floor(region.x*width)),y=Math.max(0,Math.floor(region.y*height));
  const right=Math.min(width,Math.ceil((region.x+region.width)*width)),bottom=Math.min(height,Math.ceil((region.y+region.height)*height));
  if(right<=x||bottom<=y||(right-x)*(bottom-y)>8000000)throw Error('800만 픽셀 이하의 영역을 선택하세요.');
  return {x,y,width:right-x,height:bottom-y,ratio:1};
}

export function editCheckpoint(history,state) {
  const value=structuredClone(state);
  if(JSON.stringify(history.undo.at(-1))!==JSON.stringify(value))history.undo.push(value);
  if(history.undo.length>30)history.undo.shift();
  history.redo=[];
}

export function editStep(history,state,direction) {
  const source=history[direction],destination=history[direction==='undo'?'redo':'undo'];
  if(!source.length)return null;
  destination.push(structuredClone(state));
  return source.pop();
}
