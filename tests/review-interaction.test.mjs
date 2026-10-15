import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {featureClient} from '../src/feature-client.js';
import {uxClient} from '../src/ux-client.js';
const reviewSource=featureClient.slice(featureClient.indexOf('async function saveManualReview('),featureClient.indexOf('async function setBaselineFile('));
const nextSource=uxClient.slice(uxClient.indexOf('async function acceptReviewAndNext('),uxClient.indexOf('async function nextReviewTarget('));

test('review actions with no visible selection do not write records or lock the workspace',async()=>{
 for(const selected of [undefined,'missing']){
  let locked=false;const item={targets:[],reviews:{}};
  const c={featureBusy:()=>false,activeItem:()=>item,S:{selectedResult:selected,last:{result:{results:[]}}},$:()=>null,lockWorkspace:()=>{locked=true;throw Error('Should not lock')}};
  vm.createContext(c);vm.runInContext(reviewSource,c);assert.equal(await c.saveManualReview('accepted'),false);assert.equal(locked,false);assert.deepEqual(item.reviews,{});
 }
});

test('saving a manual verdict rerenders the active filter after unlocking',async()=>{
 const row={id:'a'},item={targets:[row],reviews:{},imageRef:{hash:'stored'}},events=[];
 const c={featureBusy:()=>false,activeItem:()=>item,S:{selectedResult:'a',last:{result:{results:[row]}}},$:()=>({value:'memo'}),lockWorkspace:()=>()=>events.push('unlock'),reviewSignature:()=> 'signature',reviewNote:()=>{},UX:{filter:'unreviewed',notes:new Map()},W:{active:'image'},dirty:()=>{},queue:()=>{},error:e=>{throw Error(e)},render:filter=>events.push(filter),refreshFeatureResults:()=>events.push('detail-only')};
 vm.createContext(c);vm.runInContext(reviewSource,c);assert.equal(await c.saveManualReview('accepted'),true);
 assert.equal(item.reviews.a.verdict,'accepted');assert.deepEqual(events,['unlock','unreviewed']);
});

test('accept and next preserves automatic filter advancement and still advances when the view is empty',async()=>{
 for(const [after,expected] of [['b',0],['a',1],[undefined,1]]){
  let advances=0;const c={W:{active:'image'},S:{selectedResult:'a'},saveManualReview:async()=>{c.S.selectedResult=after;return true},nextReviewTarget:async()=>advances++};
  vm.createContext(c);vm.runInContext(nextSource,c);await c.acceptReviewAndNext();assert.equal(advances,expected);
 }
});

test('a failed manual verdict does not move to another review target',async()=>{
 let advances=0;const c={W:{active:'image'},S:{selectedResult:'a'},saveManualReview:async()=>false,nextReviewTarget:async()=>advances++};
 vm.createContext(c);vm.runInContext(nextSource,c);await c.acceptReviewAndNext();assert.equal(advances,0);
});
