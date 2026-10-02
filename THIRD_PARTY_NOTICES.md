# Third-party components

- pixelmatch v7.2.0 (`vendor/pixelmatch.js`): ISC, copyright Mapbox / Volodymyr Agafonkin. Official repository: https://github.com/mapbox/pixelmatch. License: `vendor/PIXELMATCH-LICENSE.txt`. The exact upstream commit and SHA-256 are recorded in `vendor/pixelmatch-manifest.json`. Only the browser comparison core is bundled.

- Node.js v24.19.0 (`node.exe`): copyright Node.js contributors. The license and bundled component notices are included as `NODE-LICENSE.txt`.
- SheetJS Community Edition v0.20.3 (`vendor/xlsx.full.min.js`): copyright SheetJS, Apache License 2.0. Official standalone distribution: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js. The license text is included as `vendor/SHEETJS-LICENSE.txt`.
- FilePond v4.32.12 (`vendor/FILEPOND.min.js`, `vendor/FILEPOND.min.css`): MIT, copyright Pqina. License: `vendor/FILEPOND-LICENSE.txt`. Source: https://github.com/pqina/filepond. Core upload UI is bundled; commercial image-editor components are not included.
- Google Antigravity CLI: used from the user's installation; its executable and credentials are not bundled.
- Microsoft Edge: used from the user's own Windows installation; its files are not bundled.
- SortableJS v1.15.6 (`vendor/Sortable.min.js`): MIT, copyright Sortable contributors. License: `vendor/SORTABLE-LICENSE.txt`.
- Python v3.12.10 embeddable Windows x64 distribution: Python Software Foundation license and bundled component notices, included as `vendor/ocr/LICENSE.txt`. Source: https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip.
- RapidOCR v3.9.2: Apache License 2.0, RapidOCR Authors. License: `vendor/ocr/RAPIDOCR-LICENSE.txt`. Source: https://github.com/RapidAI/RapidOCR.
- PaddleOCR models converted to ONNX by RapidAI: Apache License 2.0, PaddlePaddle Authors / Baidu and respective upstream rights holders. Upstream license: `vendor/ocr/PADDLEOCR-LICENSE.txt`. Each model's source and SHA-256 are recorded in `vendor/ocr/manifest.json`. Sources: https://github.com/PaddlePaddle/PaddleOCR and https://www.modelscope.cn/models/RapidAI/RapidOCR.
- ONNX Runtime, OpenCV, NumPy, Pillow, Shapely and the Python dependencies listed in `vendor/ocr/manifest.json`: their distribution metadata and bundled license/notice files are retained under `vendor/ocr/packages/*dist-info/` and library directories. These components retain their own licenses; the app's notices do not replace them.
- Linux preview: Node.js and Python are installed through the user's operating system. The Python 3.13 dependency wheels under `vendor/ocr/wheels/` retain upstream `dist-info` metadata, licenses, notices, and bundled library notices inside each wheel; installation retains these files in the virtual environment. Exact wheel versions and SHA-256 values are recorded in `linux/requirements-debian13.txt`. OpenCV's existing Python dependency is also used for automatic translation alignment; no OpenCV code is copied into the app source.
