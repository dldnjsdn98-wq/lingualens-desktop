"""One private, offline OCR engine per app. JSON lines in and out."""
import sys, json, base64, time, os
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
from rapidocr import RapidOCR
from rapidocr.utils.typings import LangRec, OCRVersion, ModelType
from rapidocr.main import RapidOCRError
from PIL import Image, ImageOps
import numpy as np
from copy import deepcopy
from io import BytesIO

engines = {}
models = Path(os.environ.get('LINGUALENS_OCR_MODELS') or Path(__file__).resolve().parent.parent / 'vendor/ocr/packages/rapidocr/models')

def reread_rows(ocr, pixels, lines, width, height):
    """Read fragmented horizontal lines from pixels; never infer spaces from the expected phrase."""
    groups = []
    for line in sorted(lines,key=lambda item:(round((item['boundingBox']['y']+item['boundingBox']['height']/2)*height/20),item['boundingBox']['x'])):
        box = line['boundingBox']
        x,y,w,h = box['x']*width,box['y']*height,box['width']*width,box['height']*height
        found = None
        for group in groups:
            a,b,c,d = group['bounds']
            if (abs((y+h/2)-(b+d/2)) <= .3*min(h,d) and max(h,d) <= 1.6*min(h,d)
                    and -.5*min(w,c) <= x-(a+c) <= min(h,d) and x > a+c*.4):
                found = group
                break
        if found:
            a,b,c,d = found['bounds']
            left,top = min(a,x),min(b,y)
            found['bounds'] = [left,top,max(a+c,x+w)-left,max(b+d,y+h)-top]
            found['count'] += 1
        else:
            groups.append({'bounds':[x,y,w,h],'count':1})
    extra = []
    for group in [g for g in groups if g['count']>1][:32]:
        x,y,w,h = group['bounds']
        crop = pixels[max(0,int(y)):min(height,int(y+h)+1),max(0,int(x)):min(width,int(x+w)+1)]
        if not crop.size:
            continue
        result = ocr(crop,use_det=False,use_cls=False,use_rec=True)
        if result.txts:
            extra.append({'text':result.txts[0],'confidence':float(result.scores[0]),'boundingBox':{
                'x':x/width,'y':y/height,'width':w/width,'height':h/height}})
    return extra

def engine(name):
    if name not in engines:
        params = {'Global.log_level': 'warning', 'EngineConfig.onnxruntime.intra_op_num_threads': 4,
                  'EngineConfig.onnxruntime.inter_op_num_threads': 1}
        if os.environ.get('LINGUALENS_OCR_MODELS'):
            params.update({'Global.model_root_dir': str(models),
                           'Det.model_path': str(models / 'PP-OCRv6_det_small.onnx'),
                           'Cls.model_path': str(models / 'ch_ppocr_mobile_v2.0_cls_mobile.onnx'),
                           'Rec.model_path': str(models / 'PP-OCRv6_rec_small.onnx')})
        if name == 'ko':
            params.update({'Rec.model_path': str(models / 'korean_PP-OCRv5_rec_mobile.onnx'),
                           'Rec.lang_type': LangRec.KOREAN, 'Rec.ocr_version': OCRVersion.PPOCRV5,
                           'Rec.model_type': ModelType.MOBILE})
        engines[name] = RapidOCR(params=params)
    return engines[name]

for raw in sys.stdin:
    try:
        request = json.loads(raw)
        image = Image.open(BytesIO(base64.b64decode(request['image'], validate=True)))
        if image.width * image.height > 64000000:
            raise ValueError('image_dimensions')
        image = ImageOps.exif_transpose(image)
        width, height = image.size
        pixels = np.array(image.convert('RGB'))[:, :, ::-1].copy()
        langs = set(request.get('languages', []))
        selected = (['ko', 'multi'] if 'ko' in langs and langs.intersection({'ja','zh-CN','zh-TW'})
                    else ['ko'] if 'ko' in langs else ['multi'])
        lines = []
        # The pinned RapidOCR engine exposes these stages. Detection and angle
        # classification run once; each script recognizer uses the same crops.
        detector = engine(selected[0])
        prepared, record = detector.preprocess_img(pixels)
        try:
            crops, detection = detector.detect_and_crop(prepared, record)
            rotated, classification = detector.cls_and_rotate(crops)
        except RapidOCRError:
            crops, rotated, detection, classification = [], [], None, None
        for name in selected:
            ocr = engine(name)
            if not rotated:
                continue
            recognition = ocr.recognize_txt(rotated)
            result = ocr.build_final_output(pixels,deepcopy(detection),deepcopy(classification),recognition,crops,record)
            current = []
            for text, score, polygon in zip(result.txts or [], result.scores if result.scores is not None else [],
                                             result.boxes if result.boxes is not None else []):
                x0, y0 = polygon.min(axis=0)
                x1, y1 = polygon.max(axis=0)
                current.append({'text':text, 'confidence':float(score), 'boundingBox':{
                    'x':max(0,float(x0)/width), 'y':max(0,float(y0)/height),
                    'width':max(0,(min(width,float(x1))-max(0,float(x0)))/width),
                    'height':max(0,(min(height,float(y1))-max(0,float(y0)))/height)}})
            lines.extend(current)
            lines.extend(reread_rows(ocr,pixels,current,width,height))
        # Preserve alternate readings in mixed scripts; identical readings at the same location occur once.
        unique = {}
        for line in lines:
            box = line['boundingBox']
            key = (line['text'], round(box['x'],2), round(box['y'],2))
            if key not in unique or unique[key]['confidence'] < line['confidence']:
                unique[key] = line
        lines = sorted(unique.values(), key=lambda line:(round(line['boundingBox']['y']*height/12),line['boundingBox']['x']))
        print(json.dumps({'provider':'local-rapidocr', 'lines':lines, 'image':{'width':width,'height':height},
                          'extractedText':'\n'.join(line['text'] for line in lines)},ensure_ascii=False), flush=True)
    except Exception as error:
        print(json.dumps({'error':str(error)[:300]},ensure_ascii=False), flush=True)
