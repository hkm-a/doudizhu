import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const releaseName = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : 'v0.2.0-alpha';
const artifact = 'src-tauri/target/release/bundle/deb/doudizhu_0.1.0_amd64.deb';
const manifest = `${artifact}.manifest.json`;
const notes = 'docs/releases/v0.2.0-alpha.md';
const outDir = path.join('dist', 'linux-alpha', releaseName);

for (const file of [artifact, notes]) {
  if (!existsSync(file)) {
    throw new Error(`Release bundle input is missing: ${file}`);
  }
}

if (!existsSync(manifest)) {
  run(process.execPath, ['scripts/linux-alpha-manifest.mjs', artifact]);
}

rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

const files = [
  artifact,
  manifest,
  notes,
];

for (const file of files) {
  copyFileSync(file, path.join(outDir, path.basename(file)));
}

const sums = files
  .map((file) => {
    const outputName = path.basename(file);
    const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
    return `${digest}  ${outputName}`;
  })
  .join('\n');
writeFileSync(path.join(outDir, 'SHA256SUMS'), `${sums}\n`);

console.log(`linux-alpha-bundle-ok ${outDir}`);

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}
