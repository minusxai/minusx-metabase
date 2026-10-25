import assert from 'node:assert/strict';
import {lstat, readdir, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DefaultArtifactClient} from '@actions/artifact';

export async function uploadReports({workspace, sha, client}) {
  assert(workspace && /^[a-f0-9]{40}$/.test(sha), 'Missing workspace or source revision');
  const base = await realpath(workspace);
  const root = path.join(base, 'runtime-reports');
  assert(!(await lstat(root)).isSymbolicLink(), 'Report directory must not be a symlink');
  assert.equal(await realpath(root), root, 'Report directory escapes workspace');
  const expected = ['notebook-dependencies.json', 'web-dependencies.json'];
  const names = (await readdir(root)).filter(name => name.endsWith('.json')).sort();
  assert.deepEqual(names, expected, 'Expected both validated runtime reports only');
  const files = [];
  for (const name of names) {
    const file = path.join(root, name);
    const stat = await lstat(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0, 'Invalid runtime report file');
    assert.equal(await realpath(file), file, 'Runtime report escapes directory');
    files.push(file);
  }
  const result = await client.uploadArtifact(`tested-images-${sha}`, files, root, {retentionDays: 14});
  assert(result.id, 'Artifact service did not return an uploaded artifact ID');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await uploadReports({workspace: process.env.GITHUB_WORKSPACE, sha: process.env.GITHUB_SHA,
    client: new DefaultArtifactClient()});
}
