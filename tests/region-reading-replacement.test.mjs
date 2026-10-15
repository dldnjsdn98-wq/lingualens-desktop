import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {replaceRegionLines} from '../src/region-analysis.js';
import {reviewMatch} from '../src/review-policy.js';
import {reviewSignature,manualState} from '../src/feature-tools.js';
import {clientSource} from '../src/client-source.js';

test('region rereading replaces overlapping old readings and preserves outside or unlocated lines',()=>{
 const inside={text:'Old',boundingBox:{x:.1,y:.1,width:.2,height:.1}},outside={text:'Outside',boundingBox:{x:.8,y:.8,width:.1,height:.1}},unlocated={text:'Unknown position'},next={text:'New',boundingBox:inside.boundingBox},original=[inside,outside,unlocated];
 assert.deepEqual(replaceRegionLines(original,[next],{x:0,y:0,width:.5,height:.5}),[outside,unlocated,next]);assert.deepEqual(original,[inside,outside,unlocated]);
});
test('mostly outside text is retained and majority overlap is replaced',()=>{
 const crossing={text:'Crossing',boundingBox:{x:.4,y:0,width:.4,height:.1}};assert.equal(replaceRegionLines([crossing],[],{x:0,y:0,width:.5,height:1}).length,1);assert.equal(replaceRegionLines([crossing],[],{x:0,y:0,width:.7,height:1}).length,0);
});
test('rereading Stop then Start does not resurrect conflicts or change a saved manual verdict',async()=>{
 const area={x:0,y:0,width:.5,height:.5},target={id:'target',text:'Start',language:'en',mode:'exact',region:area},line=text=>({text,confidence:.99,boundingBox:{x:.1,y:.1,width:.2,height:.1}}),payload={id:'original',result:{totalCount:1,lines:[line('Start')],results:[{...target,found:true,textMatched:true,confidence:.99,evidence:[line('Start')]}]}};let reading='Stop';
 const c={replaceRegionLines,reviewMatch,crypto:{randomUUID},DOMException,$:()=>({value:'codex'}),cropRegion:async()=>new Blob(['fixture']),requestOcr:async()=>({result:{provider:'mock',lines:[line(reading)],results:[{...target,found:reading==='Start',textMatched:reading==='Start',matchedText:reading,confidence:.99,evidence:[line(reading)]}]}})};vm.createContext(c);vm.runInContext(clientSource.slice(clientSource.indexOf('function recount('),clientSource.indexOf('async function run(')),c);
 await c.retryRegionGroup(payload,{},[target],new AbortController().signal);assert.equal(payload.result.lines.length,1);assert.equal(payload.result.lines[0].text,'Stop');reading='Start';await c.retryRegionGroup(payload,{},[target],new AbortController().signal);assert.equal(payload.result.lines.length,1);assert.equal(payload.result.results[0].found,true);
 const item={targets:[target],payload,imageRef:{hash:'a'.repeat(64)},reviews:{}};item.reviews.target={verdict:'issue',signature:reviewSignature(item,'target')};payload.result.results=payload.result.results.map(row=>reviewMatch(row,payload.result.lines));assert.equal(manualState(item,'target').verdict,'issue');
});
