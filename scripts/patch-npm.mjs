/** Patch the two dependency bundles still affected in the pinned npm release. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const npm = path.join(root, 'npm');
assert.equal(JSON.parse(readFileSync(path.join(npm, 'package.json'))).version, '12.2.1');
// Official registry tarball SHA512 values; neither replacement introduces dependencies.
const patches = [
  ['ip-address', '10.7.2', '10.7.4', 'sha512-DWBMKyeM25D70nrIiTkgQth59/G+naKOTep6huF9j+GmeK3DMD60Zvxg5d5qQnz+38AHgou6ean2LECX+lrKDg=='],
  ['undici', '6.29.0', '6.29.1', 'sha512-EvRlUt/QqAEvXdQeRMYUfwOQsfzpDztykrG2owGEE/rBOBoYv9uF39ZzsNDh4lTFHhTr2XOZjKkYgueD12ZmGA=='],
];
const temporary = mkdtempSync(path.join(tmpdir(), 'npm-fixes-'));
try {
  for (const [name, before, version, integrity] of patches) {
    const destination = path.join(npm, 'node_modules', name);
    assert.equal(JSON.parse(readFileSync(path.join(destination, 'package.json'))).version, before);
    const packed = JSON.parse(execFileSync('npm', ['pack', `${name}@${version}`, '--ignore-scripts', '--json', '--pack-destination', temporary], { encoding: 'utf8' }));
    const archive = path.join(temporary, packed[name].filename);
    assert.equal(`sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`, integrity);
    const manifest = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8' }));
    assert.equal(manifest.version, version);
    assert.deepEqual(manifest.dependencies ?? {}, {});
    rmSync(destination, { recursive: true });
    mkdirSync(destination);
    execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', destination]);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
