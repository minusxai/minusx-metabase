import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, symlink, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {uploadReports} from './index.mjs';
const workspace = await realpath(await mkdtemp(path.join(tmpdir(), 'runtime-upload-')));
const root = path.join(workspace, 'runtime-reports');
const sha = 'a'.repeat(40);
let calls = 0;
const client = {async uploadArtifact(name, files, directory, options) {
  calls++;
  assert.equal(name, `tested-images-${sha}`);
  assert.equal(directory, root);
  assert.deepEqual(files, ['notebook-dependencies.json', 'web-dependencies.json'].map(n => path.join(root, n)));
  assert.deepEqual(options, {retentionDays: 14});
  return {id: 123};
}};
try {
  await mkdir(root);
  await assert.rejects(uploadReports({workspace, sha, client}));
  assert.equal(calls, 0);
  for (const name of ['notebook-dependencies.json', 'web-dependencies.json']) await writeFile(path.join(root, name), '{}');
  await writeFile(path.join(workspace, 'raw-private-fixture.json'), '{}');
  await uploadReports({workspace, sha, client});
  assert.equal(calls, 1);
  await rm(path.join(root, 'web-dependencies.json'));
  await symlink(path.join(workspace, 'raw-private-fixture.json'), path.join(root, 'web-dependencies.json'));
  await assert.rejects(uploadReports({workspace, sha, client}));
  assert.equal(calls, 1);
  await rm(root, {recursive: true});
  await symlink(workspace, root);
  await assert.rejects(uploadReports({workspace, sha, client}));
  assert.equal(calls, 1);
  console.log('Exact report files uploaded; missing reports and file/directory escapes rejected');
} finally {
  await rm(workspace, {recursive: true, force: true});
}
