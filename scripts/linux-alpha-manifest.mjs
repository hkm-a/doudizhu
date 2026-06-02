import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const artifact = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : 'src-tauri/target/release/bundle/deb/doudizhu_0.2.0-alpha_amd64.deb';
const outputFlagIndex = process.argv.indexOf('--output');
const output = outputFlagIndex >= 0 ? process.argv[outputFlagIndex + 1] : `${artifact}.manifest.json`;

if (!existsSync(artifact)) {
  throw new Error(`Linux alpha artifact is missing: ${artifact}`);
}
if (outputFlagIndex >= 0 && !output) {
  throw new Error('--output requires a file path');
}

const fields = parseDpkgFields(run('dpkg-deb', ['-f', artifact]));
const listing = run('dpkg-deb', ['-c', artifact]);
const requiredFiles = [
  'usr/bin/doudizhu-desktop',
  'usr/lib/doudizhu/backend-preflight.py',
  'usr/lib/doudizhu/requirements.txt',
  'usr/lib/doudizhu/schema.sql',
  'usr/lib/doudizhu/server/app.py',
  'usr/lib/doudizhu/server/ai/cards.py',
  'usr/lib/doudizhu/server/ai/decision_log.py',
  'usr/lib/doudizhu/server/ai/infoset.py',
  'usr/lib/doudizhu/server/ai/replay.py',
  'usr/lib/doudizhu/server/static/js/boot.mjs',
  'usr/lib/doudizhu/server/templates/poker.html',
];

const manifest = {
  artifact,
  sizeBytes: statSync(artifact).size,
  sha256: createHash('sha256').update(readFileSync(artifact)).digest('hex'),
  package: fields.Package,
  version: fields.Version,
  architecture: fields.Architecture,
  requiredFiles: requiredFiles.map((file) => ({
    path: file,
    present: listing.includes(file),
  })),
};

const missing = manifest.requiredFiles.filter((file) => !file.present);
if (missing.length > 0) {
  throw new Error(`Artifact is missing required files: ${missing.map((file) => file.path).join(', ')}`);
}

writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`linux-alpha-manifest-ok ${output}`);

function parseDpkgFields(raw) {
  const fields = {};
  for (const line of raw.split(/\r?\n/)) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length > 0) {
      fields[key] = rest.join(':').trim();
    }
  }
  return fields;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
