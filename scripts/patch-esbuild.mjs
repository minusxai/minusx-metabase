import { readdir, readFile, stat, copyFile, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
let replaced = 0;
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await visit(path);
    else if (entry.name === 'esbuild' && dirname(path).endsWith('/bin')) {
      const manifest = JSON.parse(await readFile(join(dirname(dirname(path)), 'package.json'), 'utf8'));
      if (manifest.name !== 'esbuild' && !manifest.name.startsWith('@esbuild/')) continue;
      if (!['0.28.2'].includes(manifest.version)) throw new Error(`Unreviewed esbuild version ${manifest.version}`);
      const replacement = `${process.env.ESBUILD_REBUILT_DIR || "/opt/esbuild"}/${manifest.version}/esbuild`;
      if (!(await stat(replacement)).isFile()) throw new Error('Missing rebuilt esbuild');
      await copyFile(replacement, path);
      await chmod(path, 0o755);
      if (execFileSync(path, ['--version'], { encoding: 'utf8' }).trim() !== manifest.version) throw new Error('esbuild protocol version mismatch');
      replaced++;
    }
  }
}
await visit(join(process.cwd(), 'node_modules'));
if (!replaced) throw new Error('No esbuild binaries found');
console.log(`Replaced ${replaced} esbuild binaries with matching versions`);
