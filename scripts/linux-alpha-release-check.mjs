import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const releaseName = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : 'v0.2.0-alpha';
const bundleDir = path.join('dist', 'linux-alpha', releaseName);
const expectedFiles = [
  'doudizhu_0.2.0-alpha_amd64.deb',
  'doudizhu_0.2.0-alpha_amd64.deb.manifest.json',
  `${releaseName}.md`,
  'SHA256SUMS',
];

if (!existsSync(bundleDir)) {
  throw new Error(`Linux alpha release bundle is missing: ${bundleDir}`);
}

for (const file of expectedFiles) {
  const fullPath = path.join(bundleDir, file);
  if (!existsSync(fullPath)) {
    throw new Error(`Linux alpha release bundle is missing: ${fullPath}`);
  }
}

const sums = parseSha256Sums(readFileSync(path.join(bundleDir, 'SHA256SUMS'), 'utf8'));
for (const file of expectedFiles.filter((file) => file !== 'SHA256SUMS')) {
  const fullPath = path.join(bundleDir, file);
  const actual = sha256(fullPath);
  const expected = sums[file];
  if (actual !== expected) {
    throw new Error(`${file} SHA256 expected ${expected ?? '<missing>'}, got ${actual}`);
  }
}

const artifactName = 'doudizhu_0.2.0-alpha_amd64.deb';
const artifactPath = path.join(bundleDir, artifactName);
const manifest = JSON.parse(
  readFileSync(path.join(bundleDir, 'doudizhu_0.2.0-alpha_amd64.deb.manifest.json'), 'utf8'),
);

if (manifest.sha256 !== sha256(artifactPath)) {
  throw new Error('Manifest SHA256 does not match bundled Debian package');
}
if (manifest.sizeBytes !== statSync(artifactPath).size) {
  throw new Error('Manifest sizeBytes does not match bundled Debian package');
}
for (const field of [
  ['package', 'doudizhu'],
  ['version', '0.2.0-alpha'],
  ['architecture', 'amd64'],
]) {
  const [key, expected] = field;
  if (manifest[key] !== expected) {
    throw new Error(`Manifest ${key} expected ${expected}, got ${manifest[key] ?? '<missing>'}`);
  }
}
if (!Array.isArray(manifest.requiredFiles) || manifest.requiredFiles.some((file) => !file.present)) {
  throw new Error('Manifest requiredFiles must all be present');
}

console.log(`linux-alpha-release-check-ok ${bundleDir}`);

function parseSha256Sums(contents) {
  const sums = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^([a-f0-9]{64})\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid SHA256SUMS line: ${line}`);
    }
    sums[match[2]] = match[1];
  }
  return sums;
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
