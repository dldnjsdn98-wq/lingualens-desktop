import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {featureClient} from '../src/feature-client.js';
function context(){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'0',disabled:false,textContent:''});return elements.get(id)};
 get('diffThreshold').value='.1';let released=0,resets=0;
 const item={file:{name:'current.png'},imageRef:{hash:'current'},baseline:{image:{hash:'before'},x:4},comparison:{changed:17},targets:[]};
 const c={activeItem:()=>item,featureBusy:()=>false,lockWorkspace:()=>()=>released++,resetComparisonView:()=>resets++,$:get,F:{},AbortController,imageRefUrl:()=>'/baseline',decodeWorkspaceImage:()=>{throw Error('Decoding must not run after cancelled fetch')}};
 vm.createContext(c);return{c,item,get,released:()=>released,resets:()=>resets};
}
test('comparison cancellation aborts baseline download, restores controls and keeps prior comparison',async()=>{
 const state=context(),{c,item,get}=state;let signal;
 c.fetch=async(url,options)=>{signal=options.signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))};
 vm.runInContext(featureClient.slice(featureClient.indexOf('async function runComparison('),featureClient.indexOf('async function startWatch(')),c);
 const request=c.runComparison();c.F.compareController.abort();await request;
 assert.equal(signal.aborted,true);assert.equal(item.baseline.x,4);assert.equal(item.comparison.changed,17);assert.equal(state.released(),1);assert.equal(get('runCompare').disabled,false);assert.equal(get('cancelCompare').disabled,true);assert.match(get('diffInfo').textContent,/취소/);
});
test('automatic alignment cancellation propagates to the server request and leaves offsets unchanged',async()=>{
 const state=context(),{c,get}=state;let signal;
 c.projectRequest=async(url,body,requestSignal)=>{signal=requestSignal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))};
 vm.runInContext(featureClient.slice(featureClient.indexOf('async function autoAlign('),featureClient.indexOf('function resetComparisonView(')),c);
 const request=c.autoAlign();c.F.compareController.abort();await request;
 assert.equal(signal.aborted,true);assert.equal(get('diffX').value,'0');assert.equal(get('diffY').value,'0');assert.equal(state.released(),1);assert.equal(get('cancelCompare').disabled,true);assert.equal(get('autoAlign').disabled,false);assert.match(get('diffInfo').textContent,/취소/);
});
test('a failed baseline upload preserves legacy baseline and history exactly',async()=>{
 const state=context(),{c,item,get}=state;item.baselineHistory=[];const original=JSON.stringify(item);
 c.decodeWorkspaceImage=async()=>({width:100,height:100,close:()=>{}});c.imageReference=async()=>{throw Error('disk full')};
 c.rememberBaseline=()=>{throw Error('Must not mutate baseline before upload succeeds')};
 vm.runInContext(featureClient.slice(featureClient.indexOf('async function setBaselineFile('),featureClient.indexOf('async function runComparison(')),c);
 await c.setBaselineFile({type:'image/png',size:10,name:'replacement.png'});assert.equal(JSON.stringify(item),original);assert.equal(state.released(),1);assert.equal(get('baselineInfo').textContent,'disk full');
});
