// Shared by the browser and tests. Coordinates remain relative to the image.
import {manualState} from './feature-tools.js';
export function imageSummary(item) {
  if(item.running)return {state:'running',label:'분석 중',pass:0,review:0,fail:0};
  if(item.problem)return {state:'pending',label:item.problem,pass:0,review:0,fail:0};
  const rows=item.payload?.result?.results;
  if(!rows?.length)return {state:'unverified',label:'미검증',pass:0,review:0,fail:0};
  const pass=rows.filter(x=>x.found).length,review=rows.filter(x=>!x.found&&x.reviewRequired).length,fail=rows.length-pass-review;
  const issues=rows.filter(x=>manualState(item,x.id)?.verdict==='issue').length;
  const stale=rows.filter(x=>item.reviews?.[x.id]&&!manualState(item,x.id)).length;const accepted=rows.filter(x=>manualState(item,x.id)?.verdict==='accepted').length;
  const resolved=rows.every(x=>x.found||manualState(item,x.id)?.verdict==='accepted');
  return {state:issues?'issue':stale?'review':resolved&&accepted&&fail+review?'accepted':fail?'fail':review?'review':'pass',pass,review,fail,label:[stale?'재검수 '+stale:'',issues?'수동 문제 '+issues:'',accepted?'수동 확인 '+accepted:'',pass?'통과 '+pass:'',review?'확인 필요 '+review:'',fail?'미통과 '+fail:''].filter(Boolean).join(' · ')};
}

export function transformRegion(region,handle,dx,dy,minWidth=.002,minHeight=.002) {
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  if(handle==='move')return {...region,x:clamp(region.x+dx,0,1-region.width),y:clamp(region.y+dy,0,1-region.height)};
  let left=region.x,top=region.y,right=left+region.width,bottom=top+region.height;
  if(handle.includes('w'))left=clamp(left+dx,0,right-Math.min(minWidth,region.width));
  if(handle.includes('e'))right=clamp(right+dx,left+Math.min(minWidth,region.width),1);
  if(handle.includes('n'))top=clamp(top+dy,0,bottom-Math.min(minHeight,region.height));
  if(handle.includes('s'))bottom=clamp(bottom+dy,top+Math.min(minHeight,region.height),1);
  return {x:left,y:top,width:right-left,height:bottom-top};
}
