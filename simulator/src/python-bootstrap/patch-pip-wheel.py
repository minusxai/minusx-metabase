"""Rebuild pip's universal wheel with two bounded, compatible vendor updates.

Inputs are immutable upstream archives. Only pure Python msgpack files are
retained, so the resulting offline ensurepip wheel remains architecture neutral.
"""
import base64
import csv
import hashlib
import io
import json
from pathlib import Path
import sys
import tarfile
from zipfile import ZipFile, ZipInfo, ZIP_STORED

pip_path, urllib_path, msgpack_path, output = map(Path, sys.argv[1:5])
inputs = {
    'pip': {'version': '26.2.2', 'path': pip_path, 'sha256': 'fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70'},
    'urllib3': {'version': '2.8.0', 'path': urllib_path, 'sha256': '0cf3cae568d36aa9576b28dfb35f11328f1cb974ca7647d9475ebb86c75ac6e3'},
    'msgpack': {'version': '1.2.1', 'path': msgpack_path, 'sha256': '04c721c2c7448767e9e3f2520a475663d8ee0f09c31890f6d2bd70fd636a9647'},
}
for name, item in inputs.items():
    assert hashlib.sha256(item['path'].read_bytes()).hexdigest() == item['sha256'], name
record = 'pip-26.2.2.dist-info/RECORD'
with ZipFile(pip_path) as archive:
    data = {name: archive.read(name) for name in archive.namelist() if not name.endswith('/') and name != record and not name.startswith(('pip/_vendor/urllib3/', 'pip/_vendor/msgpack/'))}
with ZipFile(urllib_path) as archive:
    for name in archive.namelist():
        if name.startswith('urllib3/') and not name.endswith('/'):
            data['pip/_vendor/' + name] = archive.read(name)
    data['pip-26.2.2.dist-info/licenses/src/pip/_vendor/urllib3/LICENSE.txt'] = archive.read('urllib3-2.8.0.dist-info/licenses/LICENSE.txt')
with tarfile.open(msgpack_path, mode='r:gz') as archive:
    for member in archive.getmembers():
        relative = Path(member.name).relative_to('msgpack-1.2.1') if member.name != 'msgpack-1.2.1' else Path('.')
        if member.isfile() and relative.parts and relative.parts[0] == 'msgpack' and (relative.suffix in ('.py', '.pyi') or relative.name == 'py.typed'):
            data['pip/_vendor/' + relative.as_posix()] = archive.extractfile(member).read()
    data['pip-26.2.2.dist-info/licenses/src/pip/_vendor/msgpack/COPYING'] = archive.extractfile('msgpack-1.2.1/COPYING').read()
assert any(name.startswith('pip/_vendor/msgpack/') for name in data)
assert not any(name.startswith('pip/_vendor/msgpack/') and name.endswith(('.so', '.pyd', '.dll', '.c', '.cpp')) for name in data)
versions = {'urllib3': '2.8.0', 'msgpack': '1.2.1'}
lines = data['pip/_vendor/vendor.txt'].decode().splitlines()
for name, version in versions.items():
    matching = [i for i, line in enumerate(lines) if line.strip().startswith(name + '==')]
    assert len(matching) == 1, name
    index = matching[0]
    lines[index] = lines[index][:len(lines[index]) - len(lines[index].lstrip())] + name + '==' + version
data['pip/_vendor/vendor.txt'] = ('\n'.join(lines) + '\n').encode()
bom = json.loads(data['pip/_vendor/bom.cdx.json'])
references = {}
for component in bom['components']:
    if component['name'] in versions:
        name = component['name']
        previous = component['bom-ref']
        current = 'pkg:pypi/' + name + '@' + versions[name]
        references[previous] = current
        component.update({'version': versions[name], 'bom-ref': current, 'purl': current, 'hashes': [{'alg': 'SHA-256', 'content': inputs[name]['sha256']}]})
for dependency in bom.get('dependencies', []):
    dependency['ref'] = references.get(dependency['ref'], dependency['ref'])
    if 'dependsOn' in dependency:
        dependency['dependsOn'] = [references.get(ref, ref) for ref in dependency['dependsOn']]
data['pip/_vendor/bom.cdx.json'] = (json.dumps(bom, sort_keys=True, indent=2) + '\n').encode()
receipt = {'upstream_pip': '26.2.2', 'vendor_updates': versions, 'inputs': {name: {'version': item['version'], 'sha256': item['sha256']} for name, item in inputs.items()}, 'msgpack_implementation': 'Pure Python fallback only; no architecture-specific extension.', 'transformation': 'Bounded vendored package replacement, upstream license refresh, vendor.txt/CycloneDX/RECORD refresh; deterministic ZIP_STORED wheel.', 'unchanged_subset': 'The setuptools70.3 coordinate describes only pkg_resources. Affected setuptools/package_index.py, setuptools/wheel.py and setuptools/command/egg_info.py are absent from pip, not claimed fixed by this vendor refresh.'}
data['pip-26.2.2.dist-info/runtime-vendor.json'] = (json.dumps(receipt, sort_keys=True, indent=2) + '\n').encode()
rows = io.StringIO(newline='')
writer = csv.writer(rows, lineterminator='\n')
for name in sorted(data):
    digest = base64.urlsafe_b64encode(hashlib.sha256(data[name]).digest()).decode().rstrip('=')
    writer.writerow([name, 'sha256=' + digest, str(len(data[name]))])
writer.writerow([record, '', ''])
data[record] = rows.getvalue().encode()
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, mode='w', compression=ZIP_STORED) as archive:
    for name in sorted(data):
        info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o644 << 16
        info.compress_type = ZIP_STORED
        archive.writestr(info, data[name])
print(hashlib.sha256(output.read_bytes()).hexdigest(), output.name)
