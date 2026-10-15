import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {workspaceUpgrade} from '../src/workspace-upgrade.js';

function setup(){
 const elements=new Map(),recover={dataset:{recover:'draft'}},discard={dataset:{discardDraft:'draft'}};
 const c={W:{busy:false,operation:false,dirty:false,active:'source'},S:{controller:null},errors:[],esc:String,File,structuredClone,crypto:{randomUUID},confirm:()=>true,saveDraft:async()=>({ok:true}),loadWorkspace:async()=>{c.loads++},loads:0,refreshPresets:async()=>{},dirty:()=>{c.dirtyCalls++},dirtyCalls:0,queue:()=>{},regionCopy:(_a,_b,targets)=>({targets}),$:id=>{if(!elements.has(id))elements.set(id,{value:'preset',textContent:'',replaceChildren(){},close(){this.closed=true},querySelectorAll:selector=>selector==='[data-recover]'?[recover]:selector==='[data-discard-draft]'?[discard]:[]});return elements.get(id)}};
 c.error=message=>c.errors.push(message);c.lockWorkspace=()=>{c.W.operation=true;let released=false;return()=>{if(!released){c.W.operation=false;released=true}}};
 c.projectRequest=async url=>{if(url==='/api/workspace/drafts')return[{id:'draft',folder:'QA',name:'Fixture',count:1,updated:new Date().toISOString()}];throw Error('QA storage unavailable')};
 vm.createContext(c);
 vm.runInContext(workspaceUpgrade.slice(workspaceUpgrade.indexOf('async function refreshRecovery()'),workspaceUpgrade.indexOf('async function imageSize(')),c);
 const start=workspaceUpgrade.indexOf("$('deletePreset').onclick=");vm.runInContext(workspaceUpgrade.slice(start,workspaceUpgrade.indexOf('\n',start)),c);
 vm.runInContext(workspaceUpgrade.slice(workspaceUpgrade.indexOf("$('applyCopy').onclick="),workspaceUpgrade.indexOf('async function refreshPresets()')),c);
 return{c,recover,discard};
}

for(const [name,button,expected] of [['recovery','recover',/복구하지 못했습니다/],['draft deletion','discard',/지우지 못했습니다/]])test(name+' failure is reported and releases controls without replacing current work',async()=>{
 const context=setup(),{c}=context;await c.refreshRecovery();await context[button].onclick();
 assert.match(c.errors.at(-1),expected);assert.equal(c.W.operation,false);assert.equal(c.loads,0);assert.equal(c.W.active,'source');
});

test('preset deletion failure preserves the selected preset and releases controls',async()=>{
 const {c}=setup();await c.$('deletePreset').onclick();assert.match(c.errors.at(-1),/삭제하지 못했습니다/);assert.equal(c.$('presetSelect').value,'preset');assert.equal(c.W.operation,false);
});

test('recovery locks before fetching and ignores repeated clicks',async()=>{
 const {c,recover}=setup();await c.refreshRecovery();let resolve;const gate=new Promise(r=>resolve=r);let calls=0;
 c.projectRequest=async()=>{calls++;await gate;throw Error('offline')};
 const first=recover.onclick();assert.equal(c.W.operation,true);await recover.onclick();assert.equal(calls,1);resolve();await first;assert.equal(c.W.operation,false);
});

function copyPlan(c,items){c.imageSize=async item=>{if(item.id==='second')throw Error('broken image');return{width:100,height:100}};c.copyPlan={sourceSize:{width:100,height:100},dest:items,targets:[{id:'new',text:'New'}],kind:'copy'};}

test('copy preparation failure preserves all destination targets and existing results',async()=>{
 const {c}=setup(),items=[{id:'first',targets:[{text:'Old 1'}],payload:{id:'result1'}},{id:'second',targets:[{text:'Old 2'}],payload:{id:'result2'}}],before=structuredClone(items);copyPlan(c,items);
 await c.$('applyCopy').onclick();assert.deepEqual(items,before);assert.equal(c.W.operation,false);assert.equal(c.dirtyCalls,0);assert.match(c.errors.at(-1),/설정을 적용하지 못했습니다/);assert.ok(c.copyPlan);
});

test('copy commits all destinations after preparation succeeds and then closes the dialog',async()=>{
 const {c}=setup(),items=[{id:'first',targets:[{text:'Old'}],payload:{id:'result'}}];copyPlan(c,items);
 await c.$('applyCopy').onclick();assert.equal(items[0].targets[0].text,'New');assert.equal(items[0].payload,null);assert.equal(c.dirtyCalls,1);assert.equal(c.copyPlan,null);assert.equal(c.W.operation,false);assert.equal(c.$('copyDialog').closed,true);
});
