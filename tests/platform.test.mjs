import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {platformPaths,terminalCandidates} from '../src/platform.js';
test('Linux keeps workspaces and OCR caches under XDG paths and uses native commands',()=>{
 const paths=platformPaths({platform:'linux',env:{XDG_DATA_HOME:'/data',XDG_CACHE_HOME:'/cache'},home:'/home/test',root:'/opt/app'});
 assert.equal(paths.data,join('/data','language-test'));assert.equal(paths.cache,join('/cache','language-test','ocr-cache'));
 assert.equal(paths.python,join('/opt/app','vendor','ocr','venv/bin/python'));assert.equal(paths.codex,'codex');assert.equal(paths.agy,'agy');
});
test('Windows retains the existing storage and OCR bundle locations',()=>{
 const paths=platformPaths({platform:'win32',env:{LOCALAPPDATA:'C:/Local'},home:'C:/Home',root:'C:/App'});
 assert.equal(paths.data,join('C:/Local','LinguaLens'));assert.equal(paths.python,join('C:/App','vendor','ocr','python.exe'));assert.equal(paths.codex,'codex.exe');
});
test('explicit OCR and CLI overrides and terminal arguments preserve spaces',()=>{
 const paths=platformPaths({env:{LINGUALENS_PYTHON:'custom python',LINGUALENS_OCR_MODELS:'custom models',LINGUALENS_CODEX_CMD:'custom codex',LINGUALENS_AGY_CMD:'custom agy'}});
 assert.equal(paths.python,'custom python');assert.equal(paths.agy,'custom agy');assert.equal(paths.models,'custom models');assert.equal(paths.codex,'custom codex');
 for(const terminal of terminalCandidates('/home/test name/agy',['--help'])){assert.ok(terminal.args.includes('/home/test name/agy'));assert.equal(terminal.args.at(-1),'--help')}
});
