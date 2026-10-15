// Shared pure helpers are also embedded into the browser bundle.
export function sharedRegion(targets){
  const first=targets[0]?.region;if(!first)return null;
  return targets.every(item=>item.region&&['x','y','width','height'].every(key=>item.region[key]===first[key]))?first:null;
}
export function restoreRegionResult(payload,area,image){
  const remap=line=>({...line,boundingBox:line.boundingBox?{x:area.x+line.boundingBox.x*area.width,y:area.y+line.boundingBox.y*area.height,width:line.boundingBox.width*area.width,height:line.boundingBox.height*area.height}:null});
  payload.result.lines=payload.result.lines.map(remap);
  payload.result.results=payload.result.results.map(item=>({...item,region:area,evidence:(item.evidence||[]).map(remap),nearestEvidence:(item.nearestEvidence||[]).map(remap)}));
  payload.result.image=image;payload.result.analysisScope='region';return payload;
}
export function replaceRegionLines(lines,replacements,area){
  return [...lines.filter(line=>{
    const box=line.boundingBox;if(!box||box.width<=0||box.height<=0)return true;
    const overlap=Math.max(0,Math.min(box.x+box.width,area.x+area.width)-Math.max(box.x,area.x))*Math.max(0,Math.min(box.y+box.height,area.y+area.height)-Math.max(box.y,area.y));
    return overlap/(box.width*box.height)<.5;
  }),...replacements];
}
