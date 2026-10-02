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
