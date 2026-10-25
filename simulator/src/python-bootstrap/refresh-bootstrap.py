"""Refresh the exact bootstrap wheels used by ensurepip, without network access."""
import hashlib
from pathlib import Path
import re
import shutil
import sys

root = Path(sys.argv[1])
bootstrap = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('/bootstrap')
module = root / 'Lib/ensurepip/__init__.py'
text = module.read_text()
versions = {'pip': ('26.2.2', '3b0620d6061cdd040e834a681cd3bfc34f8196dfb6e9a743d15c77ed4fda2d90'), 'setuptools': ('84.2.1', 'ca140b45d5325a9478f880e351484f62fef15f336462e449ca0c03c873d589c2')}
bundled = root / 'Lib/ensurepip/_bundled'
projects = ['pip'] + (['setuptools'] if '_SETUPTOOLS_VERSION' in text else [])
for old in bundled.glob('*.whl'):
    old.unlink()
for name in projects:
    version, digest = versions[name]
    wheel = (bootstrap / 'patched' if name == 'pip' else bootstrap) / f'{name}-{version}-py3-none-any.whl'
    assert hashlib.sha256(wheel.read_bytes()).hexdigest() == digest
    constant = '_' + name.upper() + '_VERSION'
    text, count = re.subn(r'(?m)^' + constant + r'\s*=\s*[\'"][^\'"]+[\'"]', constant + ' = "' + version + '"', text)
    assert count == 1, (constant, count)
    shutil.copy2(wheel, bundled / wheel.name)
module.write_text(text)
