"""Run in a real notebook kernel; check science libraries and package installs."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import zipfile

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import pip._vendor.msgpack as cache_codec
import pip._vendor.urllib3 as http_client

assert os.getuid() == 1000
assert Path.home() == Path('/home/jovyan')
assert cache_codec.__version__ == '1.2.1'
assert http_client.__version__ == '2.8.0'
assert cache_codec.unpackb(cache_codec.packb({'fixture': 7})) == {'fixture': 7}

with tempfile.TemporaryDirectory(dir='/home/jovyan/data') as directory:
    folder = Path(directory)
    wheel = folder / 'notebook_fixture-1.0.0-py3-none-any.whl'
    files = {
        'notebook_fixture/__init__.py': 'VALUE = 7\n',
        'notebook_fixture-1.0.0.dist-info/METADATA': 'Metadata-Version: 2.1\nName: notebook-fixture\nVersion: 1.0.0\n',
        'notebook_fixture-1.0.0.dist-info/WHEEL': 'Wheel-Version: 1.0\nGenerator: fixture\nRoot-Is-Purelib: true\nTag: py3-none-any\n',
    }
    files['notebook_fixture-1.0.0.dist-info/RECORD'] = ''.join(f'{name},,\n' for name in files) + 'notebook_fixture-1.0.0.dist-info/RECORD,,\n'
    with zipfile.ZipFile(wheel, 'w') as archive:
        for name, content in files.items():
            archive.writestr(name, content)

    class FixtureHandler(SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Cache-Control', 'public, max-age=600')
            super().end_headers()

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(FixtureHandler, directory=directory))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        for attempt in range(2):
            target = folder / f'installed-{attempt}'
            result = subprocess.run([
                sys.executable, '-m', 'pip', 'install', '--no-deps', '--disable-pip-version-check',
                '--target', str(target), '--cache-dir', str(folder / 'cache'), '--trusted-host', '127.0.0.1',
                f'http://127.0.0.1:{server.server_port}/{wheel.name}',
            ], capture_output=True, text=True, timeout=60)
            assert result.returncode == 0, result.stderr
            spec = importlib.util.spec_from_file_location('notebook_fixture', target / 'notebook_fixture/__init__.py')
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            assert module.VALUE == 7
    finally:
        server.shutdown()
        server.server_close()

print(json.dumps({
    'sum': int(np.arange(5).sum()), 'rows': len(pd.DataFrame({'x': [1, 2]})),
    'traces': len(go.Figure(data=go.Scatter(x=[1], y=[2])).data), 'uid': os.getuid(), 'installer': True,
}))
