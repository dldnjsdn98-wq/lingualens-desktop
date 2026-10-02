import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localOcr} from '../src/local-ocr.js';
import {alignImages} from '../src/image-alignment.js';
const engine=localOcr(),bytes=await readFile(new URL('./fixtures/local-ocr.png',import.meta.url));
try{
 assert.ok(engine.available(),'Run linux/install.sh first');
 const started=Date.now(),result=await engine.extract('local',bytes,'image/png',undefined,{languages:['en']});
 const text=result.lines.map(line=>line.text).join('\n');
 assert.match(text,/Start/i);assert.match(text,/42/);
 const alignment=await alignImages(bytes,bytes);assert.equal(alignment.x,0);assert.equal(alignment.y,0);
 console.log(JSON.stringify({test:'actual-local-ocr-and-alignment',status:'pass',milliseconds:Date.now()-started,text}));
}finally{engine.close()}
