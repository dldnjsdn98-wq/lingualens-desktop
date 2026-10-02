import unittest, importlib.util
from pathlib import Path
import numpy as np
import cv2
spec=importlib.util.spec_from_file_location('alignment',Path(__file__).resolve().parent.parent/'src/local-align-worker.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class AlignmentTests(unittest.TestCase):
    def setUp(self):
        rng=np.random.default_rng(141)
        self.before=cv2.GaussianBlur(rng.integers(0,256,(240,320,3),dtype=np.uint8),(5,5),0)

    def test_recovers_positive_and_negative_translation(self):
        for x,y in [(12,8),(-15,9),(0,0)]:
            with self.subTest(x=x,y=y):
                after=cv2.warpAffine(self.before,np.float32([[1,0,x],[0,1,y]]),(320,240))
                result=module.align(self.before,after)
                self.assertLessEqual(abs(result['x']-x),1)
                self.assertLessEqual(abs(result['y']-y),1)

    def test_flat_screens_and_excessive_masks_are_rejected(self):
        with self.assertRaises(ValueError): module.align(np.zeros_like(self.before),np.zeros_like(self.before))
        with self.assertRaises(ValueError): module.align(self.before,self.before,[{'x':0,'y':0,'width':1,'height':1}])

    def test_size_change_requires_explicit_resize(self):
        larger=cv2.resize(self.before,(640,480))
        with self.assertRaises(ValueError): module.align(self.before,larger)
        result=module.align(self.before,larger,resize=True)
        self.assertLessEqual(abs(result['x']),1);self.assertLessEqual(abs(result['y']),1)

if __name__=='__main__':unittest.main(verbosity=2)
