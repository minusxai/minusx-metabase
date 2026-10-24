"""Refresh two same-major pip clients from the hash-verified environment.

Pip 26.2.2 still bundles vulnerable urllib3 2.7.0 and msgpack 1.1.2.
Keep its installer available while replacing these clients with patched
compatible distributions. vendor.txt is updated to describe the actual code.
"""
from importlib.metadata import distribution
from importlib.util import find_spec
from pathlib import Path
import json
import shutil
import pip._vendor

vendor = Path(pip._vendor.__file__).parent
versions = {'urllib3': '2.8.0', 'msgpack': '1.2.1'}
metadata_file = vendor / 'vendor.txt'
metadata = metadata_file.read_text()
for name, version in versions.items():
    installed = distribution(name)
    if installed.version != version:
        raise RuntimeError(f'Review the pip compatibility refresh for {name} {installed.version}')
    source = Path(next(iter(find_spec(name).submodule_search_locations)))
    target = vendor / name
    if target.parent != vendor or not target.is_dir():
        raise RuntimeError('Unexpected pip vendor layout')
    shutil.rmtree(target)
    shutil.copytree(source, target, ignore=shutil.ignore_patterns('__pycache__'))
    for file in installed.files:
        if '/licenses/' in str(file):
            license_target = vendor / f'{name}-{Path(file).name}'
            shutil.copyfile(installed.locate_file(file), license_target)
    lines = metadata.splitlines()
    metadata = '\n'.join(
        line[:len(line) - len(line.lstrip())] + f'{name}=={version}'
        if line.strip().startswith(name + '==') else line
        for line in lines
    ) + '\n'
metadata_file.write_text(metadata)

# Keep pip's bundled CycloneDX inventory consistent with the replaced code.
bom_file = vendor / 'bom.cdx.json'
bom = json.loads(bom_file.read_text())
references = {}
for component in bom['components']:
    if component['name'] in versions:
        name = component['name']
        previous = component['bom-ref']
        current = f'pkg:pypi/{name}@{versions[name]}'
        references[previous] = current
        component.update({'version': versions[name], 'bom-ref': current, 'purl': current})
for dependency in bom.get('dependencies', []):
    dependency['ref'] = references.get(dependency['ref'], dependency['ref'])
    if 'dependsOn' in dependency:
        dependency['dependsOn'] = [references.get(ref, ref) for ref in dependency['dependsOn']]
bom_file.write_text(json.dumps(bom, indent=2) + '\n')
