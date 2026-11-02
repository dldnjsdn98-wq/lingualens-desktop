import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {featureClient} from '../src/feature-client.js';
import {enhancementClient} from '../src/enhancement-client.js';

function context(){
 const elements=new Map(),buttons=[];
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,textContent:'',querySelectorAll:()=>buttons});return elements.get(id)};
 const item={targets:[],baseline:{name:'old.png',image:{hash:'old'},x:180,y:-90,scale:true,threshold:.4},baselineHistory:[],comparison:{changed:20}};
 let resets=0,changes=0,releases=0;
 const c={activeItem:()=>item,featureBusy:()=>false,$:get,structuredClone,crypto:{randomUUID},esc:String,
  resetComparisonView:()=>resets++,dirty:()=>changes++,lockWorkspace:()=>()=>releases++,
  decodeWorkspaceImage:async()=>({width:200,height:100,close(){}}),imageReference:async()=>({hash:'new'})};
 vm.createContext(c);
 vm.runInContext(enhancementClient.slice(enhancementClient.indexOf('function baselineRecord('),enhancementClient.indexOf('async function baselineFromCurrent(')),c);
 vm.runInContext(featureClient.slice(featureClient.indexOf('async function setBaselineFile('),featureClient.indexOf('async function runComparison(')),c);
 get('diffX').value='180';get('diffY').value='-90';get('diffScale').checked=true;get('diffThreshold').value='.4';
 return{c,item,get,buttons,resets:()=>resets,changes:()=>changes,releases:()=>releases};
}

test('replacing a baseline clears the previous image alignment and tolerance before comparing',async()=>{
 const {c,item,get,resets,changes,releases}=context();
 await c.setBaselineFile({name:'new.png',type:'image/png',size:100});
 assert.equal(item.baseline.image.hash,'new');
 assert.equal(Number(get('diffX').value),0);assert.equal(Number(get('diffY').value),0);
 assert.equal(get('diffScale').checked,false);assert.equal(Number(get('diffThreshold').value),.1);
 assert.equal(item.comparison,null);assert.equal(resets(),1);assert.equal(changes(),1);assert.equal(releases(),1);
});

test('restoring a historical baseline uses its saved comparison settings, including zero tolerance',()=>{
 const {c,item,get,buttons,resets,changes}=context();
 const history={id:randomUUID(),name:'saved.png',image:{hash:'saved'},at:'2026-10-15T00:00:00.000Z',x:-12,y:8,scale:false,threshold:0};
 item.baselineHistory=[history];buttons.push({dataset:{baseline:history.id}});c.refreshBaselineHistory();
 buttons[0].onclick();
 assert.equal(item.baseline.image.hash,'saved');assert.notEqual(item.baseline,history);
 assert.equal(Number(get('diffX').value),-12);assert.equal(Number(get('diffY').value),8);
 assert.equal(get('diffScale').checked,false);assert.equal(Number(get('diffThreshold').value),0);
 assert.equal(item.comparison,null);assert.equal(resets(),1);assert.equal(changes(),1);
});

test('a failed replacement keeps the active baseline and visible comparison settings',async()=>{
 const {c,item,get,resets,changes,releases}=context(),before=structuredClone(item);
 c.imageReference=async()=>{throw Error('disk full')};
 await c.setBaselineFile({name:'new.png',type:'image/png',size:100});
 assert.deepEqual(item,before);assert.equal(get('diffX').value,'180');assert.equal(get('diffY').value,'-90');
 assert.equal(get('diffScale').checked,true);assert.equal(get('diffThreshold').value,'.4');
 assert.equal(resets(),0);assert.equal(changes(),0);assert.equal(releases(),1);assert.equal(get('baselineInfo').textContent,'disk full');
});
