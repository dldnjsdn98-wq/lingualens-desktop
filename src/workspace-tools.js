export function workspaceMatches(project,{search='',folder='',status='all'}={}){
  if(folder&&project.folder!==folder)return false;
  if(search&&!String(project.folder+' '+project.name).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))return false;
  return status==='all'||(status==='passed'?project.passed===project.count:project.passed!==project.count);
}
export function regionCopy(source,destination,targets,{omitRegions=false}={}){
  const mismatch=targets.some(x=>x.region)&&Math.abs((source.width/source.height)/(destination.width/destination.height)-1)>.02;
  return {mismatch,targets:targets.map(item=>({...structuredClone(item),region:omitRegions?null:item.region||null}))};
}
