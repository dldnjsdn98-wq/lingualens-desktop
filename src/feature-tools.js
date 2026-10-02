// Pure helpers shared by the server, browser, and tests.
export function reviewSignature(item,id){
 if(id!==undefined){const t=item.targets.find(t=>t.id===id),r=item.payload?.result?.results?.find(r=>r.id===id);return JSON.stringify({version:2,image:item.imageRef?.hash||item.image?.hash||[item.file?.name||item.name,item.file?.size,item.file?.lastModified],target:t?{id:t.id,text:t.text,language:t.language,mode:t.mode,region:t.region||null}:null,ignore:item.ignoreRegions||[],reading:r?{found:r.found,reviewRequired:!!r.reviewRequired,observed:r.observedText||r.matchedText||'',confidence:r.confidence,evidence:r.evidence,nearest:r.nearestEvidence}:null})}
 return JSON.stringify({image:item.imageRef?.hash||item.image?.hash||[item.file?.name||item.name,item.file?.size,item.file?.lastModified],targets:item.targets.filter(t=>t.text).map(t=>({id:t.id,text:t.text,language:t.language,mode:t.mode,region:t.region||null})),ignore:item.ignoreRegions||[],result:item.payload?.id||null,readings:item.payload?.result?.results?.map(r=>({id:r.id,found:r.found,reviewRequired:r.reviewRequired,observed:r.observedText||r.matchedText||'',confidence:r.confidence,evidence:r.evidence,nearest:r.nearestEvidence}))||[]});
}
export function manualState(item,id){
 const record=item.reviews?.[id];if(!record||!item.payload)return null;if(record.signature===reviewSignature(item,id))return record;const current=reviewSignature(item);if(record.signature===current)return record;
 // Older workspaces signed the image, settings and request ID without readings.
 try{const legacy=JSON.parse(current);delete legacy.readings;if(record.signature===JSON.stringify(legacy))return record}catch{}
 return null;
}
export function reportRows(items){
 const rows=[['파일명','화면명','ID','언어','기대 문구','OCR 문구','자동 판정','수동 판정','검수 메모','검수 시각','인식 점수','영역','실행 오류 또는 재검증 사유']];
 for(const item of items)for(const t of item.targets.filter(t=>t.text)){
  const r=item.payload?.result?.results?.find(r=>r.id===t.id),m=manualState(item,t.id);
  rows.push([item.file?.name||item.name,t.label||'',t.id,t.language,t.text,r?.observedText||r?.matchedText||'',r?(r.found?'통과':r.reviewRequired?'확인 필요':'미통과'):'미검증',m?.verdict==='accepted'?'확인 완료':m?.verdict==='issue'?'문제 있음':'',item.reviewNotes?.[t.id]?.note??m?.note??'',m?.at||'',r?.confidence??'',JSON.stringify(t.region||null),item.problem||'']);
 }return rows;
}
export function excelAssignments(items,rows,{keyColumn,languageColumn='',textColumn,labelColumn='',modeColumn='',regionColumn='',language='en'}={}){
 const clean=s=>String(s??'').replaceAll('\\','/').trim().toLocaleLowerCase(),base=s=>clean(s).split('/').at(-1).replace(/\.[^.]+$/,'');
 const plan=[],unmatched=[],ambiguous=[],errors=[];
 const known=new Set(['ko','en','ja','zh-CN','zh-TW','de','fr','es','neutral']);
 for(const [index,row] of rows.entries()){
  const key=clean(row[keyColumn]),text=String(row[textColumn]??'');if(!text.trim())continue;
  const exact=items.filter(i=>clean(i.file?.name||i.name)===key),stem=items.filter(i=>base(i.file?.name||i.name)===base(key)||i.targets?.some(t=>clean(t.label)===key));
  const matches=exact.length?exact:stem;
  if(!key||!matches.length){unmatched.push(index+2);continue}if(matches.length!==1){ambiguous.push(index+2);continue}
  const lang=String(languageColumn===''?language:row[languageColumn]||language).trim(),raw=regionColumn===''?'':String(row[regionColumn]??'').trim();
  let region=null;if(raw){const v=raw.split(',').map(Number);region={x:v[0],y:v[1],width:v[2],height:v[3]};if(v.length!==4||!v.every(Number.isFinite)||region.x<0||region.y<0||region.width<=0||region.height<=0||region.x+region.width>1.001||region.y+region.height>1.001){errors.push(index+2);continue}}
  if(!known.has(lang)||text.length>3000){errors.push(index+2);continue}
  const mode=String(modeColumn===''?'':row[modeColumn]).toLowerCase();
  plan.push({itemId:matches[0].id,row:index+2,target:{text,language:lang,label:labelColumn===''?key:String(row[labelColumn]??''),mode:['required','필수','all'].includes(mode)?'required':'exact',region}});
 }
 for(const item of items)if(plan.filter(p=>p.itemId===item.id).length>80)errors.push('문구 80개 초과: '+(item.file?.name||item.name));
 return {plan,unmatched,ambiguous,errors};
}
export function excludedLine(line,regions){
 const b=line.boundingBox;if(!b)return false;
 const x=b.x+b.width/2,y=b.y+b.height/2;
 return regions.some(r=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height);
}
export function csvReport(rows){
 const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,'\t$&').replaceAll('"','""')+'"';return '\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n');
}
