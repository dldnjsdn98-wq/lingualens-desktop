"""Offline model preparation tests; downloads use memory fixtures."""
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('prepare_models', Path(__file__).resolve().parent.parent / 'linux/prepare-models.py')
models = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models)


class Response(io.BytesIO):
    def geturl(self):
        return 'https://example.test/model.onnx'


class ModelPreparation(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='language-test-models-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.payload = b'synthetic-model-fixture'
        self.model = {'file': 'model.onnx', 'source': 'https://example.test/model.onnx', 'sha256': hashlib.sha256(self.payload).hexdigest()}
        self.manifest = {'models': [self.model]}
        self.target = self.root / 'model.onnx'

    def open_fixture(self, url, timeout):
        self.assertEqual(url, self.model['source'])
        self.assertEqual(timeout, 60)
        return Response(self.payload)

    def test_existing_valid_model_never_downloads(self):
        self.target.write_bytes(self.payload)
        result = models.prepare(self.manifest, self.root, opener=lambda *_args, **_kwargs: self.fail('network called'))
        self.assertEqual(result[0]['status'], 'verified')

    def test_download_and_replace_corrupt_model(self):
        self.target.write_bytes(b'old-corrupt-content')
        result = models.prepare(self.manifest, self.root, opener=self.open_fixture)
        self.assertEqual(result[0]['status'], 'downloaded')
        self.assertEqual(self.target.read_bytes(), self.payload)
        self.assertEqual(list(self.root.glob('.model-*')), [])

    def test_hash_failure_preserves_existing_file(self):
        self.target.write_bytes(b'previous-file')
        with self.assertRaisesRegex(ValueError, '해시'):
            models.prepare(self.manifest, self.root, opener=lambda *_args, **_kwargs: Response(b'wrong'))
        self.assertEqual(self.target.read_bytes(), b'previous-file')
        self.assertEqual(list(self.root.glob('.model-*')), [])

    def test_network_failure_cleans_temporary_and_preserves_file(self):
        self.target.write_bytes(b'previous-file')
        def fail(*_args, **_kwargs):
            raise OSError('connection lost')
        with self.assertRaises(OSError):
            models.prepare(self.manifest, self.root, opener=fail)
        self.assertEqual(self.target.read_bytes(), b'previous-file')
        self.assertEqual(list(self.root.glob('.model-*')), [])

    def test_offline_missing_model_does_not_create_directory(self):
        with self.assertRaisesRegex(ValueError, '없거나'):
            models.prepare(self.manifest, self.root / 'missing', check_only=True)
        self.assertFalse((self.root / 'missing').exists())

    def test_invalid_names_urls_hashes_and_duplicates_rejected_before_writes(self):
        for update in [{'file': '../model.onnx'}, {'file': 'sub/model.onnx'}, {'file': 'sub\\model.onnx'}, {'source': 'http://example.test/model'}, {'source': 'https://user:pass@example.test/model'}, {'sha256': 'oops'}]:
            with self.subTest(update=update), self.assertRaises(ValueError):
                models.prepare({'models': [self.model, {**self.model, **update}]}, self.root / 'missing')
        with self.assertRaises(ValueError):
            models.prepare({'models': [self.model, dict(self.model)]}, self.root / 'missing')
        self.assertFalse((self.root / 'missing').exists())

    def test_non_https_redirect_rejected(self):
        class Redirect(Response):
            def geturl(self):
                return 'http://example.test/model'
        with self.assertRaises(ValueError):
            models.prepare(self.manifest, self.root, opener=lambda *_args, **_kwargs: Redirect(self.payload))
        self.assertFalse(self.target.exists())
        self.assertEqual(list(self.root.glob('.model-*')), [])

    def test_download_size_limit_preserves_target(self):
        self.target.write_bytes(b'old')
        with patch.object(models, 'MAX_BYTES', 4), self.assertRaisesRegex(ValueError, '용량'):
            models.prepare(self.manifest, self.root, opener=self.open_fixture)
        self.assertEqual(self.target.read_bytes(), b'old')

    def test_atomic_replace_failure_preserves_target(self):
        self.target.write_bytes(b'old')
        with patch.object(models.os, 'replace', side_effect=OSError('read-only')), self.assertRaises(OSError):
            models.prepare(self.manifest, self.root, opener=self.open_fixture)
        self.assertEqual(self.target.read_bytes(), b'old')
        self.assertEqual(list(self.root.glob('.model-*')), [])

    def test_symlink_cannot_overwrite_outside_model_directory(self):
        outside = self.root / 'outside.onnx'
        outside.write_bytes(b'original')
        with patch.object(Path, 'is_symlink', return_value=True), self.assertRaises(ValueError):
            models.prepare(self.manifest, self.root, opener=self.open_fixture)
        self.assertEqual(outside.read_bytes(), b'original')


if __name__ == '__main__':
    unittest.main()
