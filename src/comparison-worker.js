import pixelmatch from './pixelmatch.js';
import {changedRegions} from './enhancement-tools.js';
self.onmessage=event=>{
  try{const {before,after,width,height,threshold}=event.data,mask=new Uint8ClampedArray(width*height*4);
    self.postMessage({stage:'픽셀 차이 계산 중'});
    const changed=pixelmatch(new Uint8ClampedArray(before),new Uint8ClampedArray(after),mask,width,height,{threshold,diffMask:true,includeAA:false});
    self.postMessage({stage:'변경 위치 정리 중'});const regions=changedRegions(mask,width,height);
    self.postMessage({changed,...regions,mask:mask.buffer},[mask.buffer]);
  }catch(error){self.postMessage({error:error.message})}
};
