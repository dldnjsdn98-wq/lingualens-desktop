"""Estimate translation; reject unsupported sizes, flat or unreliable matches."""
import sys, json
import cv2
import numpy as np
from PIL import Image, ImageOps
from pathlib import Path

def image(path):
    value = ImageOps.exif_transpose(Image.open(path))
    if value.width * value.height > 64000000:
        raise ValueError('Image resolution too large')
    return np.array(value.convert('RGB'))

def align(before, after, ignored=(), resize=False):
    height, width = after.shape[:2]
    if before.shape[:2] != after.shape[:2]:
        if not resize:
            raise ValueError('해상도가 다릅니다. 크기 맞추기를 먼저 선택하세요.')
        before = cv2.resize(before, (width,height), interpolation=cv2.INTER_AREA)
    scale = min(1,640/max(width,height))
    size = (max(8,round(width*scale)),max(8,round(height*scale)))
    a = cv2.cvtColor(cv2.resize(before,size),cv2.COLOR_RGB2GRAY).astype(np.float32)
    b = cv2.cvtColor(cv2.resize(after,size),cv2.COLOR_RGB2GRAY).astype(np.float32)
    keep = np.ones(a.shape,np.uint8)
    for r in ignored:
        x0,y0 = int(r['x']*size[0]),int(r['y']*size[1])
        x1,y1 = int(np.ceil((r['x']+r['width'])*size[0])),int(np.ceil((r['y']+r['height'])*size[1]))
        keep[y0:y1,x0:x1] = 0
    if np.count_nonzero(keep)<.1*keep.size or np.std(a[keep!=0])<2 or np.std(b[keep!=0])<2:
        raise ValueError('자동 정렬에 필요한 화면 특징이 부족합니다. 직접 위치를 조정하세요.')
    ea,eb = cv2.Laplacian(a,cv2.CV_32F),cv2.Laplacian(b,cv2.CV_32F)
    ea *= keep;eb *= keep
    window = cv2.createHanningWindow(size,cv2.CV_32F)
    (sx,sy),response = cv2.phaseCorrelate(ea,eb,window)
    if not np.isfinite([sx,sy,response]).all() or response<.08 or abs(sx)>size[0]*.35 or abs(sy)>size[1]*.35:
        raise ValueError('자동 정렬 결과가 불확실합니다. 직접 위치를 조정하세요.')
    transform = np.float32([[1,0,sx],[0,1,sy]])
    moved = cv2.warpAffine(a,transform,size)
    valid = (cv2.warpAffine(keep,transform,size)>0)&(keep>0)
    if np.count_nonzero(valid)<.2*keep.size:
        raise ValueError('비교할 겹치는 영역이 부족합니다.')
    original = float(np.mean(np.abs(a[valid]-b[valid])))
    corrected = float(np.mean(np.abs(moved[valid]-b[valid])))
    improvement = 0 if original<1 else 1-corrected/original
    if max(abs(sx),abs(sy))>.8 and improvement<.05:
        raise ValueError('위치 보정 후 차이가 줄지 않았습니다. 직접 위치를 조정하세요.')
    return {'x':round(sx*width/size[0]),'y':round(sy*height/size[1]),'response':float(response),
            'improvement':improvement,'method':'OpenCV phase correlation','size':list(size)}

if __name__ == '__main__':
    try:
        config=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
        value=align(image(config['before']),image(config['after']),config.get('ignore',[]),config.get('scale',False))
        print(json.dumps(value,ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'error':str(error)[:300]},ensure_ascii=False));sys.exit(1)
