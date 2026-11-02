import {validateWorkspace} from './workspace-state.js';

// Portable backups keep each image once. App storage continues to use version 1 records.
export function packWorkspaceBackup(workspace) {
  validateWorkspace(workspace);
  const assets={},keys=new Map();
  const store=data=>{
    if(typeof data!=='string')throw Error('백업에 필요한 원본 이미지가 없습니다.');
    if(!keys.has(data)){const id='image-'+(keys.size+1);keys.set(data,id);assets[id]=data}
    return keys.get(data);
  };
  const reference=record=>{
    const {data,...rest}=record;
    return {...rest,asset:store(data)};
  };
  const items=workspace.items.map(item=>{
    const {image,...rest}=reference(item);
    return {...rest,baseline:item.baseline?reference(item.baseline):null,
      baselineHistory:(item.baselineHistory||[]).map(reference)};
  });
  return {format:workspace.format,version:2,encoding:'asset-lines',name:workspace.name,folder:workspace.folder,
    batch:workspace.batch||null,watchPath:workspace.watchPath||'',items,assets};
}

export function unpackWorkspaceBackup(backup) {
  if(backup?.version===1)return validateWorkspace(backup);
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(!object(backup)||backup.format!=='language-test-workspace'||backup.version!==2||
    !object(backup.assets)||!Array.isArray(backup.items)||!backup.items.length||backup.items.length>200)
    throw Error('지원하는 Language Test 작업 파일이 아닙니다.');
  const entries=Object.entries(backup.assets),used=new Set();
  if(!entries.length||entries.length>2400)throw Error('백업 이미지 목록을 확인하세요.');
  for(const [key,data] of entries){
    if(!/^image-[1-9]\d{0,3}$/.test(key)||typeof data!=='string'||data.length>14000000||
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data))
      throw Error('백업 이미지가 손상되었거나 지원하지 않는 형식입니다.');
    const encoded=data.slice(data.indexOf(',')+1),size=encoded.length/4*3-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);
    if(encoded.length%4||!size||size>10485760)throw Error('백업 이미지 한 장은 10MB 이하의 정상 파일이어야 합니다.');
  }
  const restore=(record,main=false)=>{
    if(!object(record)||typeof record.asset!=='string'||!Object.hasOwn(backup.assets,record.asset))
      throw Error('백업에 필요한 원본 이미지가 없습니다.');
    const {asset,data,...rest}=record;used.add(asset);
    if(main)delete rest.image;
    return {...rest,data:backup.assets[asset]};
  };
  const items=backup.items.map(item=>({...restore(item,true),
    baseline:item.baseline?restore(item.baseline):null,
    baselineHistory:item.baselineHistory==null?[]:Array.isArray(item.baselineHistory)?item.baselineHistory.map(b=>restore(b)):(()=>{throw Error('비교 기준 이력을 확인하세요.')})()}));
  if(used.size!==entries.length)throw Error('사용하지 않는 이미지가 백업에 포함되어 있습니다.');
  const {assets,encoding,...metadata}=backup;
  return validateWorkspace({...metadata,version:1,items});
}

export function workspaceBackupBlob(backup,{maxBytes=750*1024*1024}={}) {
  unpackWorkspaceBackup(backup);
  const {assets,...metadata}=backup;
  // Each asset is a bounded JSON string; never join every image into one giant string.
  const parts=[JSON.stringify({...metadata,encoding:'asset-lines'}).slice(0,-1)+',"assets":{\n'];
  if(new Blob(parts).size>16*1024*1024)throw Error('백업의 검수 기록 용량이 너무 큽니다. 이미지를 여러 작업으로 나누어 백업하세요.');
  let first=true;
  for(const [key,data] of Object.entries(assets)){
    parts.push((first?'':',')+JSON.stringify(key)+':'+JSON.stringify(data)+'\n');first=false;
  }
  parts.push('}}\n');
  const blob=new Blob(parts,{type:'application/json'});
  if(blob.size>maxBytes)throw Error('백업 파일이 750MB를 초과합니다. 이미지를 여러 작업으로 나누어 백업하세요.');
  return blob;
}

export async function readWorkspaceBackup(file) {
  if(file.size>750*1024*1024)throw Error('작업 파일은 750MB 이하여야 합니다.');
  const maxLine=16*1024*1024,probe=await file.slice(0,maxLine).text(),newline=probe.indexOf('\n');
  const header=newline<0?'':probe.slice(0,newline).trim();
  let metadata;
  if(header.endsWith(',"assets":{'))try{metadata=JSON.parse(header.slice(0,-11)+'}')}catch{}
  if(metadata?.version!==2||metadata.encoding!=='asset-lines')return unpackWorkspaceBackup(JSON.parse(await file.text()));
  const assets=Object.create(null),reader=file.stream().getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
  let pending='',first=true,ended=false,count=0;
  const line=value=>{
    value=value.trim();if(!value)return;
    if(first){first=false;return}
    if(ended)throw Error('백업 파일 끝에 잘못된 데이터가 있습니다.');
    if(value==='}}'){ended=true;return}
    if(!/^(,)?"image-[1-9]\d{0,3}":/.test(value)||(count===0?value.startsWith(','):!value.startsWith(',')))throw Error('백업 이미지 목록이 손상되었습니다.');
    const entry=JSON.parse('{'+value.replace(/^,/,'')+'}'),keys=Object.keys(entry);
    if(keys.length!==1||Object.hasOwn(assets,keys[0])||++count>2400)throw Error('백업 이미지 목록의 중복이나 개수를 확인하세요.');
    assets[keys[0]]=entry[keys[0]];
  };
  try{
    while(true){const {value,done}=await reader.read();pending+=decoder.decode(value,{stream:!done});
      let end;while((end=pending.indexOf('\n'))>=0){if(end>maxLine)throw Error('백업 항목의 용량이 너무 큽니다.');line(pending.slice(0,end));pending=pending.slice(end+1)}
      if(pending.length>maxLine)throw Error('백업 항목의 용량이 너무 큽니다.');
      if(done)break;
    }
    if(pending.trim())line(pending);
    if(!ended)throw Error('백업 파일이 끝까지 저장되지 않았습니다.');
    return unpackWorkspaceBackup({...metadata,assets});
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
