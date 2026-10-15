import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {clientSource} from '../src/client-source.js';
function storage(){
 let prepared;const ready=new Promise(resolve=>prepared=resolve);const request={},store={getAll:()=>request,put:()=>request,clear:()=>request,delete:()=>request},transaction={objectStore:()=>{prepared();return store},error:null},db={transaction:()=>transaction,close:()=>{c.closed++}},c={historyDb:async()=>db,HISTORY_STORE:'history',closed:0};vm.createContext(c);vm.runInContext(clientSource.slice(clientSource.indexOf('async function historyStore('),clientSource.indexOf('async function historyImage(')),c);return{c,db,transaction,request,ready};
}
test('history read waits for transaction completion, sorts records and closes storage',async()=>{
 const {c,transaction,request,ready}=storage();const task=c.historyAll();await ready;request.result=[{at:'2026-01-01'},{at:'2026-10-14'}];request.onsuccess();transaction.oncomplete();const result=await task;assert.equal(result[0].at,'2026-10-14');assert.equal(c.closed,1);
});
test('aborted history transaction rejects instead of leaving a pending promise',async()=>{
 const {c,transaction,ready}=storage();const task=c.historyClear();await ready;transaction.onabort();await assert.rejects(task,/저장이 중단/);assert.equal(c.closed,1);
});
test('history request failure and transaction setup failure both close the database',async()=>{
 const {c,request,ready}=storage();const task=c.historyPut({id:'fixture'});await ready;request.error=Error('QA quota');request.onerror();await assert.rejects(task,/QA quota/);assert.equal(c.closed,1);
 const next=storage();next.db.transaction=()=>{throw Error('QA closed database')};await assert.rejects(next.c.historyClear(),/QA closed database/);assert.equal(next.c.closed,1);
});
test('history write resolves only after successful commit',async()=>{
 const {c,transaction,request,ready}=storage();let settled=false;const task=c.historyPut({id:'fixture'}).then(()=>settled=true);await ready;request.onsuccess();await Promise.resolve();assert.equal(settled,false);transaction.oncomplete();await task;assert.equal(c.closed,1);
});
test('history deletion failure is visible, preserves legacy data and permits a retry',async()=>{
 const elements=new Map(),c={W:{},S:{},historyClear:async()=>{throw Error('QA blocked database')},localStorage:{removeItem:()=>{c.removed++}},removed:0,renderHistory:async()=>{c.rendered++},rendered:0,errors:[],$:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id)}};c.error=message=>c.errors.push(message);vm.createContext(c);const start=clientSource.indexOf("$('clearHistory').onclick=");vm.runInContext(clientSource.slice(start,clientSource.indexOf('\n',start)),c);
 await c.$('clearHistory').onclick();assert.equal(c.removed,0);assert.equal(c.rendered,0);assert.equal(c.$('clearHistory').disabled,false);assert.match(c.errors.at(-1),/최근 기록.*QA blocked/);assert.match(c.$('historyStatus').textContent,/정리 실패/);
 c.historyClear=async()=>{};await c.$('clearHistory').onclick();assert.equal(c.removed,1);assert.equal(c.rendered,1);assert.equal(c.W.historyBusy,false);assert.match(c.$('historyStatus').textContent,/지웠습니다/);
});
