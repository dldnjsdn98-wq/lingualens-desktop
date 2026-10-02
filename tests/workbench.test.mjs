import test from 'node:test';
import assert from 'node:assert/strict';
import {imageSummary,transformRegion} from '../src/workbench-tools.js';
test('image states keep review distinct from failure, pass, and unverified',()=>{
  assert.equal(imageSummary({}).state,'unverified');
  assert.equal(imageSummary({running:true}).state,'running');
  const item={payload:{result:{results:[{found:true},{found:false,reviewRequired:true},{found:false}]}}};
  assert.deepEqual(imageSummary(item),{state:'fail',pass:1,review:1,fail:1,label:'통과 1 · 확인 필요 1 · 미통과 1'});
  item.payload.result.results.pop();assert.equal(imageSummary(item).state,'review');
  item.payload.result.results.pop();assert.equal(imageSummary(item).state,'pass');
  item.problem='설정 변경';assert.equal(imageSummary(item).state,'pending');
});
test('region dragging and resizing stay within the image without flipping',()=>{
  const region={x:.1,y:.2,width:.4,height:.3};
  assert.deepEqual(transformRegion(region,'move',4,-4),{...region,x:.6,y:0});
  for(const handle of ['nw','n','ne','e','se','s','sw','w'])for(const delta of [-4,-.05,0,.05,4]){
    const next=transformRegion(region,handle,delta,-delta,.01,.02);
    assert.ok(next.x>=0&&next.y>=0&&next.width>=.009999&&next.height>=.019999);
    assert.ok(next.x+next.width<=1.000001&&next.y+next.height<=1.000001);
  }
  assert.deepEqual(region,{x:.1,y:.2,width:.4,height:.3});
});
