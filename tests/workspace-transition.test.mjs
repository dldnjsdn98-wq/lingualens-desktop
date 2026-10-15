import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {workspaceClient} from '../src/workspace-client.js';
function context(saveDraft){
 const item={id:'old-image',file:{name:'old.png'},targets:[{text:'Start'}]},elements=new Map();
 const c={W:{items:[item],active:item.id,draftId:'old-draft',projectId:'old-project',dirty:true,busy:false,operation:false},S:{controller:null},errors:[],saveDraft,confirm:()=>true,stopWatch:async()=>{},$:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id)}};
 c.error=message=>c.errors.push(message);c.lockWorkspace=()=>{c.W.operation=true;return()=>{c.W.operation=false}};
 vm.createContext(c);
 vm.runInContext(workspaceClient.slice(workspaceClient.indexOf('async function preserveCurrentWorkspace('),workspaceClient.indexOf('function snapshot()')),c);
 vm.runInContext(workspaceClient.slice(workspaceClient.indexOf('async function loadWorkspace('),workspaceClient.indexOf("$('runAll').onclick=")),c);
 const newStart=workspaceClient.indexOf("$('newWorkspace').onclick="),newEnd=workspaceClient.indexOf('\n',newStart);
 vm.runInContext(workspaceClient.slice(newStart,newEnd),c);return c;
}
function retained(c){
 assert.equal(c.W.items.length,1);assert.equal(c.W.active,'old-image');assert.equal(c.W.draftId,'old-draft');assert.equal(c.W.projectId,'old-project');assert.equal(c.W.operation,false);assert.equal(c.W.dirty,true);
 assert.match(c.errors.at(-1),/保存|임시 저장.*작업 전환.*백업/);
}

test('new workspace preserves unsaved content when draft writing fails',async()=>{
 let forced=false;const c=context(async force=>{forced=force;return{ok:false,error:'disk full'}});
 await c.$('newWorkspace').onclick();retained(c);assert.equal(forced,true);
});

test('loading another workspace keeps the current work if its draft cannot be saved',async()=>{
 const c=context(async()=>({ok:false,error:'permission denied'}));
 await c.loadWorkspace({get size(){throw Error('Must not start replacing data')}});retained(c);
});

test('workspace transition is locked before asynchronous saving and ignores overlapping actions',async()=>{
 let finishSave,startedSave,calls=0;const ready=new Promise(r=>startedSave=r),gate=new Promise(r=>finishSave=r);
 const c=context(async()=>{calls++;startedSave();return gate});
 const first=c.$('newWorkspace').onclick();assert.equal(c.W.operation,true);await ready;
 await c.$('newWorkspace').onclick();await c.loadWorkspace({});assert.equal(calls,1);
 finishSave({ok:false,error:'disk full'});await first;retained(c);
});
