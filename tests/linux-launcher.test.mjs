import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {parseLaunchOptions} from '../linux/launch-options.mjs';
import {startLauncher} from '../linux/launch.mjs';
const output=()=>({lines:[],errors:[],log(value){this.lines.push(value)},error(value){this.errors.push(value)}});

test('Linux launch options reject typos, missing ports and ambiguous duplicate ports',()=>{
 assert.equal(parseLaunchOptions(['--headless','--port=41837']).port,41837);assert.equal(parseLaunchOptions([]).port,0);
 for(const args of [['--port'],['--port',''],['--port','1e3'],['--port','-1'],['--port','65536'],['--port','2','--port','3'],['--headles']])assert.throws(()=>parseLaunchOptions(args),/포트|--port|알 수 없는/);
});

test('Linux headless launcher starts on loopback and SIGTERM closes it with shared cleanup',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-launch-life-')),signals=new EventEmitter(),log=output();let launched;
 try{launched=await startLauncher(['--headless','--port','0'],{signals,output:log,openBrowser:()=>assert.fail('headless opened browser'),serverOptions:{projectRoot:join(root,'projects'),cacheRoot:join(root,'cache')}});assert.match(launched.url,/^http:\/\/127\.0\.0\.1:\d+$/);const health=await(await fetch(launched.url+'/healthz')).json();assert.equal(health.status,'ok');assert.equal(signals.listenerCount('SIGTERM'),1);signals.emit('SIGTERM');const first=launched.stop(),second=launched.stop();assert.equal(first,second);await first;assert.equal(launched.server.listening,false);assert.equal(signals.listenerCount('SIGTERM'),0);assert.deepEqual(log.errors,[])}finally{await launched?.stop();await rm(root,{recursive:true,force:true})}
});

test('occupied Linux port has actionable feedback without disturbing the running instance',async()=>{
 const root=await mkdtemp(join(tmpdir(),'language-launch-port-')),signals=new EventEmitter(),log=output();let launched;
 try{const options={signals,output:log,serverOptions:{projectRoot:join(root,'projects'),cacheRoot:join(root,'cache')}};launched=await startLauncher(['--headless'],options);await assert.rejects(startLauncher(['--headless','--port',String(launched.server.address().port)],options),/다른 프로그램.*--port 0/);assert.equal((await fetch(launched.url+'/healthz')).status,200);assert.equal(signals.listenerCount('SIGTERM'),1)}finally{await launched?.stop();await rm(root,{recursive:true,force:true})}
});

test('launcher selftest closes its server and removes its own temporary directory',async()=>{
 const signals=new EventEmitter(),log=output(),launched=await startLauncher(['--selftest'],{signals,output:log});assert.equal(launched.server.listening,false);await assert.rejects(stat(launched.temporary),{code:'ENOENT'});assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(JSON.parse(log.lines[0]).status,'pass');
});

test('bad launch arguments exit without an internal stack trace',async()=>{
 const launcher=fileURLToPath(new URL('../linux/launch.mjs',import.meta.url));await assert.rejects(promisify(execFile)(process.execPath,[launcher,'--port','bad'],{windowsHide:true}),error=>error.code===1&&/포트.*정수/.test(error.stderr)&&!error.stderr.includes('at file:'));
});
