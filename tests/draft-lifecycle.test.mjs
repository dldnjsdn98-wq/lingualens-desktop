import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {workspaceUpgrade} from '../src/workspace-upgrade.js';

function setup(request=async()=>({ok:true})){
 const elements=new Map(),timers=[];
 const c={W:{items:[{id:'image'}],dirty:true,revision:1,draftId:'current',projectId:null},S:{controller:null},workspaceData:async()=>({items:[{id:'image'}]}),projectRequest:request,refreshRecovery:async()=>{},setTimeout:(callback,delay)=>{timers.push({callback,delay});return timers.length},clearTimeout:()=>{},$:id=>{if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id)}};
 vm.createContext(c);
 vm.runInContext('let draftTimer=null,draftTail=Promise.resolve();'+workspaceUpgrade.slice(workspaceUpgrade.indexOf('function scheduleDraft()'),workspaceUpgrade.indexOf('async function refreshRecovery()')),c);
 return {c,timers};
}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};

test('autosave reports further edits as pending until the current revision is saved',async()=>{
 const started=deferred(),gate=deferred();let calls=0;
 const {c,timers}=setup(async()=>{if(!calls++){started.resolve();await gate.promise}});
 const saving=c.saveDraft(true);await started.promise;c.W.revision++;
 gate.resolve();await saving;assert.match(c.$('draftStatus').textContent,/추가 변경.*저장 중/);assert.equal(timers.length,1);
 await c.saveDraft(true);assert.match(c.$('draftStatus').textContent,/^임시 저장됨/);
});

test('failed autosave can be retried with the same workspace and content',async()=>{
 let calls=0;const {c}=setup(async()=>{if(!calls++)throw Error('disk full')});
 const first=await c.saveDraft(true);assert.equal(first.ok,false);assert.match(c.$('draftStatus').textContent,/실패.*재시도/);
 assert.equal(c.W.items[0].id,'image');assert.equal(c.W.dirty,true);
 const retry=await c.saveDraft(true);assert.equal(retry.ok,true);assert.equal(calls,2);assert.match(c.$('draftStatus').textContent,/^임시 저장됨/);
});

test('late autosave failure cannot overwrite the status of another workspace',async()=>{
 const started=deferred(),gate=deferred();const {c}=setup(async()=>{started.resolve();await gate.promise});
 const saving=c.saveDraft(true);await started.promise;c.W.draftId='next';c.$('draftStatus').textContent='새 작업';gate.reject(Error('old failure'));
 await saving;assert.equal(c.$('draftStatus').textContent,'새 작업');
});

test('a queued autosave does not recreate a draft after an explicit project save',async()=>{
 const started=deferred(),gate=deferred();let calls=0;const {c}=setup(async()=>{calls++;started.resolve();await gate.promise});
 const first=c.saveDraft(true),queued=c.saveDraft(true);await started.promise;c.W.dirty=false;c.$('draftStatus').textContent='앱에 저장됨';gate.resolve();
 await first;const result=await queued;assert.equal(result.saved,false);assert.equal(calls,1);assert.equal(c.$('draftStatus').textContent,'앱에 저장됨');
});

test('draft cleanup failure preserves the saved project status and explains leftover recovery data',async()=>{
 const {c}=setup(async url=>{assert.equal(url,'/api/workspace/drafts/delete');throw Error('permission denied')});
 c.W.dirty=false;await c.clearDraft();assert.match(c.$('draftStatus').textContent,/앱에 저장됨.*정리.*실패.*보관/);assert.equal(c.W.dirty,false);
});
