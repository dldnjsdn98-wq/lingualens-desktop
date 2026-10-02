// Shared, environment independent helpers for the review workspace.
export function reviewNote(item,id,note,at=new Date().toISOString()) {
  item.reviewNotes||={};item.reviewNotes[id]={note:String(note).slice(0,2000),at};
  return item.reviewNotes[id];
}
export function resultMatches(row,item,filter='all',search='') {
  const record=manualState(item,row.id),stale=!!item.reviews?.[row.id]&&!record;
  const matches={all:true,pass:row.found,review:row.reviewRequired,fail:!row.found&&!row.reviewRequired,
    unreviewed:!record,issue:record?.verdict==='issue',accepted:record?.verdict==='accepted',stale,
    unresolved:record?.verdict==='issue'||stale||!row.found&&record?.verdict!=='accepted'};
  return !!matches[filter]&&[row.text,row.label,row.observedText,row.matchedText,item.reviewNotes?.[row.id]?.note,item.reviews?.[row.id]?.note].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}
export function unicodeChanges(expected,observed,limit=3000) {
  // Code points keep surrogate pairs intact. Common prefix/suffix reduce the work.
  const tokenize=value=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(String(value??''))].map(s=>s.segment):Array.from(String(value??''));
  const a=tokenize(expected).slice(0,limit),b=tokenize(observed).slice(0,limit);
  let prefix=0,suffix=0;while(prefix<a.length&&prefix<b.length&&a[prefix]===b[prefix])prefix++;
  while(suffix<a.length-prefix&&suffix<b.length-prefix&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
  const x=a.slice(prefix,a.length-suffix),y=b.slice(prefix,b.length-suffix),parts=[];
  const append=(type,text)=>{if(!text)return;if(parts.at(-1)?.type===type)parts.at(-1).text+=text;else parts.push({type,text})};
  append('same',a.slice(0,prefix).join(''));
  if(x.length*y.length>1000000){append('removed',x.join(''));append('added',y.join(''))}
  else{const dp=Array.from({length:x.length+1},()=>new Uint16Array(y.length+1));
    for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)dp[i][j]=x[i]===y[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    let i=0,j=0;while(i<x.length||j<y.length){if(i<x.length&&j<y.length&&x[i]===y[j]){append('same',x[i++]);j++}else if(j<y.length&&(i===x.length||dp[i][j+1]>=dp[i+1][j]))append('added',y[j++]);else append('removed',x[i++])}}
  append('same',suffix?a.slice(-suffix).join(''):'');return parts;
}
export function normalizePreferences(value={}) {
  const number=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
  return {layout:['standard','image','text'].includes(value.layout)?value.layout:'standard',
    leftWidth:number(value.leftWidth,180,380,238),rightWidth:number(value.rightWidth,300,620,390),
    fontSize:number(value.fontSize,12,18,14),density:value.density==='comfortable'?'comfortable':'compact',
    minimap:value.minimap!==false};
}
export function normalizeProfile(value={}) {
  return {provider:['local','codex','gemini'].includes(value.provider)?value.provider:'local',
    mode:['fast','standard'].includes(value.mode)?value.mode:'fast',
    autoReview:['off','local','codex','gemini'].includes(value.autoReview)?value.autoReview:'off',
    ocrLayout:['raw','lines','columns','vertical'].includes(value.ocrLayout)?value.ocrLayout:'raw'};
}
export function orderedOcrLines(lines,mode='raw') {
  if(mode==='raw')return [...lines];const located=lines.filter(l=>l.boundingBox),unlocated=lines.filter(l=>!l.boundingBox);
  if(mode==='vertical')return [...located].sort((a,b)=>Math.abs(a.boundingBox.x-b.boundingBox.x)>.02?b.boundingBox.x-a.boundingBox.x:a.boundingBox.y-b.boundingBox.y).concat(unlocated);
  const rowSort=items=>[...items].sort((a,b)=>{const A=a.boundingBox,B=b.boundingBox;return Math.abs(A.y-B.y)<Math.min(A.height,B.height)*.5?A.x-B.x:A.y-B.y});
  if(mode==='lines')return rowSort(located).concat(unlocated);
  // Split at a clear vertical gap. Titles spanning columns prevent an unsafe split.
  const split=(items,depth=0)=>{if(items.length<2||depth>12)return rowSort(items);
    const spans=items.map(l=>[l.boundingBox.x,l.boundingBox.x+l.boundingBox.width]).sort((a,b)=>a[0]-b[0]);let end=spans[0][1],gap=null;
    for(const [left,right] of spans.slice(1)){if(left-end>.015&&(!gap||left-end>gap.size))gap={x:(left+end)/2,size:left-end};end=Math.max(end,right)}
    if(!gap)return rowSort(items);const left=items.filter(l=>l.boundingBox.x<gap.x),right=items.filter(l=>l.boundingBox.x>=gap.x);return [...split(left,depth+1),...split(right,depth+1)]};
  return split(located).concat(unlocated);
}
export function changedRegions(mask,width,height,tile=24,limit=80) {
  const cols=Math.ceil(width/tile),rows=Math.ceil(height/tile),cells=new Uint32Array(cols*rows);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[(y*width+x)*4+3])cells[Math.floor(y/tile)*cols+Math.floor(x/tile)]++;
  const found=[];
  for(let start=0;start<cells.length;start++){if(!cells[start])continue;const queue=[start];let count=0,minX=cols,minY=rows,maxX=0,maxY=0;
    for(let i=0;i<queue.length;i++){const cell=queue[i],x=cell%cols,y=Math.floor(cell/cols);if(!cells[cell])continue;count+=cells[cell];cells[cell]=0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(x+dx>=0&&x+dx<cols&&y+dy>=0&&y+dy<rows&&cells[(y+dy)*cols+x+dx])queue.push((y+dy)*cols+x+dx)}
    found.push({x:minX*tile,y:minY*tile,width:Math.min(width,(maxX+1)*tile)-minX*tile,height:Math.min(height,(maxY+1)*tile)-minY*tile,count})}
  found.sort((a,b)=>b.count-a.count);return {regions:found.slice(0,limit),totalRegions:found.length};
}
export function migrateReviews(item) {
  for(const [id,record] of Object.entries(item.reviews||{}))if(manualState(item,id))record.signature=reviewSignature(item,id);
}
export function moveRegionGroup(areas,dx,dy) {
  if(!areas.length)return [];dx=Math.max(-Math.min(...areas.map(r=>r.x)),Math.min(1-Math.max(...areas.map(r=>r.x+r.width)),dx));
  dy=Math.max(-Math.min(...areas.map(r=>r.y)),Math.min(1-Math.max(...areas.map(r=>r.y+r.height)),dy));
  return areas.map(r=>({...r,x:r.x+dx,y:r.y+dy}));
}

// Explicit imports remain usable in Node; browser bundle injects the helpers too.
import {manualState,reviewSignature} from './feature-tools.js';
