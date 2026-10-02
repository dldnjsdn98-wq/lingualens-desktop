import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedRegion,restoreRegionResult} from '../src/region-analysis.js';
test('crop only when every target refers to the same region',()=>{
  const area={x:.2,y:.3,width:.4,height:.5};
  assert.deepEqual(sharedRegion([{region:area},{region:{...area}}]),area);
  assert.equal(sharedRegion([{region:area},{}]),null);
  assert.equal(sharedRegion([{region:area},{region:{...area,x:.1}}]),null);
  assert.equal(sharedRegion([]),null);
});
test('crop evidence returns to full-image coordinates without inventing boxes',()=>{
  const area={x:.2,y:.3,width:.4,height:.5},line={text:'Text',boundingBox:{x:.25,y:.2,width:.5,height:.4}};
  const payload={result:{lines:[line,{text:'No box',boundingBox:null}],results:[{found:true,evidence:[line],nearestEvidence:[]}]}};
  const result=restoreRegionResult(payload,area,{width:2340,height:1080}).result;
  assert.equal(result.analysisScope,'region');assert.deepEqual(result.image,{width:2340,height:1080});
  assert.ok(Math.abs(result.lines[0].boundingBox.x-.3)<1e-9);assert.equal(result.lines[0].boundingBox.y,.4);
  assert.equal(result.lines[0].boundingBox.width,.2);assert.equal(result.lines[0].boundingBox.height,.2);
  assert.equal(result.lines[1].boundingBox,null);assert.deepEqual(result.results[0].region,area);assert.equal(line.boundingBox.x,.25);
});
