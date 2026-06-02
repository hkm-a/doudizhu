import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const artifact = process.argv[2] || 'src-tauri/target/release/bundle/deb/doudizhu_0.2.0-alpha_amd64.deb';

if (!existsSync(artifact)) {
  throw new Error(`Linux alpha artifact is missing: ${artifact}`);
}

const fields = run('dpkg-deb', ['-f', artifact]);
for (const required of [
  'Package: doudizhu',
  'Version: 0.2.0-alpha',
  'Architecture: amd64',
]) {
  assertIncludes(fields, required, `${artifact} metadata`);
}

const listing = run('dpkg-deb', ['-c', artifact]);
for (const required of [
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
]) {
  assertIncludes(listing, required, `${artifact} file list`);
}

console.log('linux-alpha-artifact-smoke-ok');

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function assertIncludes(contents, needle, label) {
  if (!contents.includes(needle)) {
    throw new Error(`${label} is missing ${needle}`);
  }
}
