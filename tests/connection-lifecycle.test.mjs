import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {clientSource} from '../src/client-source.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const signedIn={configured:true,connected:true,authenticated:true};
function setup(request){
 const elements=new Map(),classes=new Set(),classList={toggle(name,value){if(value)classes.add(name);else classes.delete(name)},add(name){classes.add(name)}};
 const c={S:{connected:true,authenticated:true},AbortSignal,AbortController,setTimeout,clearTimeout,jsonRequest:request,document:{querySelector:()=>({classList})},window:{open:()=>assert.fail('must not open an installer on status failure')},installUrl:()=>'',error:()=>{},$:id=>{if(!elements.has(id))elements.set(id,{value:id==='cloudProject'?'codex':'',classList,textContent:'',disabled:false});return elements.get(id)}};
 vm.createContext(c);const start=clientSource.indexOf('async function refreshConnection(');
 vm.runInContext(clientSource.slice(start,clientSource.indexOf("$('cloudProject').onchange=",start)),c);
 const login=clientSource.indexOf('function stopLoginTracking(');vm.runInContext(clientSource.slice(login,clientSource.indexOf("$('refreshCli').onclick=",login)),c);
 return c;
}

test('a late failure from the previous provider cannot replace the new successful login state',async()=>{
 const old=deferred(),c=setup(url=>url.includes('codex')?old.promise:Promise.resolve(signedIn));
 const first=c.refreshConnection();assert.equal(c.S.authenticated,false);assert.equal(c.$('connectGoogle').disabled,true);
 c.$('cloudProject').value='gemini';await c.refreshConnection();old.reject(Error('old provider offline'));await first;
 assert.equal(c.S.authenticated,true);assert.equal(c.S.connected,true);assert.equal(c.S.connectionKnown,true);assert.equal(c.$('connectState').textContent,'로그인됨');
});

test('only the latest status request for the same provider may update the UI',async()=>{
 for(const oldSucceeds of [true,false]){
  const old=deferred();let calls=0;const c=setup(()=>++calls===1?old.promise:Promise.resolve({...signedIn,authenticated:false}));
  const first=c.refreshConnection();await c.refreshConnection();oldSucceeds?old.resolve(signedIn):old.reject(Error('stale failure'));await first;
  assert.equal(c.S.authenticated,false);assert.equal(c.S.connected,true);assert.equal(c.$('connectState').textContent,'로그인 필요');assert.equal(c.S.connectionPending,false);
 }
});

test('status failure offers a status retry and never treats an unknown CLI as missing',async()=>{
 let calls=0;const c=setup(async()=>{if(++calls===1)throw Error('서버 연결 실패');return signedIn});
 await c.refreshConnection();assert.equal(c.S.connectionKnown,false);assert.equal(c.S.connected,false);assert.equal(c.$('connectGoogle').textContent,'연결 상태 다시 확인');assert.match(c.$('connectHelp').textContent,/서버 연결 실패/);
 await c.$('connectGoogle').onclick();assert.equal(calls,2);assert.equal(c.S.authenticated,true);assert.equal(c.$('connectState').textContent,'로그인됨');
});

test('timeout restores retry controls and gives a bounded-wait explanation',async()=>{
 let requestSignal;const c=setup(async(_url,{signal})=>{requestSignal=signal;throw new DOMException('Timeout','TimeoutError')});
 await c.refreshConnection();assert.ok(requestSignal instanceof AbortSignal);assert.equal(c.S.connectionPending,false);assert.equal(c.$('connectGoogle').disabled,false);assert.match(c.$('connectHelp').textContent,/시간이 초과/);
});

test('explicit cancellation propagates and restores current controls without running login',async()=>{
 const controller=new AbortController(),c=setup(async(_url,{signal})=>{controller.abort();signal.throwIfAborted()});
 await assert.rejects(c.refreshConnection({signal:controller.signal}),{name:'AbortError'});assert.equal(c.S.authenticated,false);assert.equal(c.S.connectionPending,false);assert.equal(c.$('connectGoogle').disabled,false);assert.equal(c.$('connectState').textContent,'연결 확인 취소됨');
});

test('already cancelled refresh preserves current UI and a pending lookup cannot launch login',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;const gate=deferred(),c=setup(()=>{calls++;return gate.promise});
 await assert.rejects(c.refreshConnection({signal:controller.signal}),{name:'AbortError'});assert.equal(calls,0);assert.equal(c.S.authenticated,true);
 const current=c.refreshConnection();await c.$('connectGoogle').onclick();assert.equal(calls,1);gate.resolve(signedIn);await current;
});

function loginSetup(request){
 const c=setup(request);Object.assign(c.S,{authenticated:false,connectionKnown:true,connected:true});c.errors=[];c.error=m=>c.errors.push(m);return c;
}

test('late login launch response from another provider cannot start polling or overwrite current status',async()=>{
 const launch=deferred();let polls=0;const c=loginSetup(url=>url.startsWith('/auth/login')?launch.promise:url.startsWith('/auth/session')?(polls++,Promise.resolve({state:'error'})):Promise.resolve(signedIn));
 const task=c.startProviderLogin();c.$('cloudProject').value='gemini';await c.refreshConnection();launch.resolve({id:'old-login'});await task;
 assert.equal(polls,0);assert.equal(c.$('connectState').textContent,'로그인됨');assert.equal(c.S.loginController,null);assert.deepEqual(c.errors,[]);
});

test('login session checks are sequential and completion refreshes authenticated state',async()=>{
 const held=deferred(),started=deferred();let polls=0,waits=0;const c=loginSetup(url=>{
  if(url.startsWith('/auth/login'))return Promise.resolve({id:'login-a'});
  if(url.startsWith('/auth/session')){polls++;if(polls===1){started.resolve();return held.promise}return Promise.resolve({state:'complete'})}
  return Promise.resolve(signedIn);
 });c.waitForLoginPoll=async()=>{waits++};const task=c.startProviderLogin();await started.promise;await c.startProviderLogin();assert.equal(polls,1);assert.equal(waits,1);held.resolve({state:'waiting'});await task;
 assert.equal(polls,2);assert.equal(waits,2);assert.equal(c.S.authenticated,true);assert.equal(c.S.loginController,null);assert.equal(c.$('connectState').textContent,'로그인됨');
});

test('manual status refresh cancels an in-flight login session and ignores its late error',async()=>{
 const held=deferred(),started=deferred();let sessionSignal;const c=loginSetup((url,{signal})=>{
  if(url.startsWith('/auth/login'))return Promise.resolve({id:'login-a'});
  if(url.startsWith('/auth/session')){sessionSignal=signal;started.resolve();return held.promise}
  return Promise.resolve(signedIn);
 });c.waitForLoginPoll=async()=>{};const task=c.startProviderLogin();await started.promise;await c.refreshConnection();assert.equal(sessionSignal.aborted,true);held.resolve({state:'error',message:'old login failed'});await task;
 assert.equal(c.$('connectState').textContent,'로그인됨');assert.deepEqual(c.errors,[]);assert.equal(c.S.loginController,null);
});

test('missing session ID or login request timeout returns to an enabled login button with useful feedback',async()=>{
 for(const failure of ['invalid','timeout']){
  const c=loginSetup(async url=>{if(url.startsWith('/auth/login')){if(failure==='timeout')throw new DOMException('Timeout','TimeoutError');return{}}return{...signedIn,authenticated:false}});
  await c.startProviderLogin();assert.equal(c.S.loginController,null);assert.equal(c.$('connectGoogle').disabled,false);assert.match(c.errors.at(-1),failure==='timeout'?/시간이 초과/:/확인 정보를 받지/);
 }
});

test('login session errors stay visible and permit a fresh login attempt',async()=>{
 let launches=0;const c=loginSetup(async url=>{if(url.startsWith('/auth/login'))return{id:'login-'+(++launches)};if(url.startsWith('/auth/session'))throw Error('진행 상태 서버 오류');return{...signedIn,authenticated:false}});c.waitForLoginPoll=async()=>{};
 await c.startProviderLogin();assert.match(c.errors.at(-1),/진행 상태 서버 오류/);assert.match(c.$('connectHelp').textContent,/진행 상태 서버 오류/);assert.equal(c.$('connectGoogle').disabled,false);await c.startProviderLogin();assert.equal(launches,2);assert.equal(c.S.loginController,null);
});

test('cancelling login delay clears the scheduled timer promptly',async()=>{
 const c=loginSetup(async()=>signedIn),timers=new Map();let next=0;c.setTimeout=callback=>{timers.set(++next,callback);return next};c.clearTimeout=id=>timers.delete(id);
 const controller=new AbortController(),wait=c.waitForLoginPoll(controller.signal);assert.equal(timers.size,1);controller.abort();await assert.rejects(wait,{name:'AbortError'});assert.equal(timers.size,0);
});
