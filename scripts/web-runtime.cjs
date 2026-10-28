const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
let container;
(async () => {
  try {
    container = docker('run', '--detach', '--publish', '127.0.0.1::3005', process.env.WEB_IMAGE || 'project-web-fixture');
    const port = docker('port', container, '3005/tcp').split(':').pop();
    let response;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/`);
        if (response.ok) break;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.ok(response?.ok, 'Web application did not become ready');
    const html = await response.text();
    assert.match(html, /<html/i);
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
    assert.ok(scripts.length > 0);
    for (const [, source] of scripts) {
      const asset = await fetch(new URL(source, response.url));
      assert.equal(asset.status, 200);
      assert.match(asset.headers.get('content-type'), /javascript/);
    }
    const extension = await fetch(`http://127.0.0.1:${port}/extension-build/manifest.json`);
    assert.equal(extension.status, 200);
    assert.equal((await extension.json()).manifest_version, 3);
    assert.equal(docker('exec', container, 'node', '--version'), 'v22.23.4');
    assert.equal(docker('exec', container, 'npm', '--version'), '12.2.1');
    console.log('Built web page, extension manifest and pinned runtimes passed');
  } finally {
    if (container) docker('rm', '--force', container);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
