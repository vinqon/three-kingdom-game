import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';

const sourceDir = path.resolve('src/game');
const outputDir = path.resolve('public/game');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
    continue;
  }

  const source = await readFile(path.join(sourceDir, entry.name), 'utf8');
  const javascript = stripTypeScriptTypes(source, {
    mode: 'transform',
    sourceMap: false,
  }).replaceAll(/\.ts(['"])/g, '.js$1');
  await writeFile(
    path.join(outputDir, entry.name.replace(/\.ts$/, '.js')),
    javascript,
    'utf8',
  );
}

console.log('Built browser game modules.');
