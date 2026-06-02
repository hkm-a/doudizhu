import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE.md',
  'NOTICE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/pull_request_template.md',
  '.github/workflows/ci.yml',
      '.github/workflows/release-linux-alpha.yml',
      '.github/workflows/release-multi-platform.yml',
      'docs/roadmap.md',
      'docs/releases/v0.2.0-alpha.md',
  'scripts/linux-alpha-artifact-smoke.mjs',
  'scripts/linux-alpha-manifest.mjs',
  'scripts/linux-alpha-bundle.mjs',
  'scripts/linux-alpha-release-check.mjs',
  'client/public/index.html',
  'client/public/manifest.json',
  'client/README.md',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Required release metadata file is missing: ${file}`);
  }
  const contents = readFileSync(file, 'utf8').trim();
  if (contents.length < 40) {
    throw new Error(`Required release metadata file is too small: ${file}`);
  }
}

const rootReadme = readFileSync('README.md', 'utf8');
for (const link of [
  '[docs/roadmap.md](docs/roadmap.md)',
  '[CONTRIBUTING.md](CONTRIBUTING.md)',
  '[SECURITY.md](SECURITY.md)',
  '[SUPPORT.md](SUPPORT.md)',
  '[LICENSE.md](LICENSE.md)',
  '[NOTICE.md](NOTICE.md)',
]) {
  assertIncludes(rootReadme, link, 'README.md');
}
assertIncludes(rootReadme, '[docs/releases/v0.2.0-alpha.md](docs/releases/v0.2.0-alpha.md)', 'README.md');

const clientReadme = readFileSync('client/README.md', 'utf8');
assertIncludes(clientReadme, 'React + Phaser', 'client/README.md');
assertIncludes(clientReadme, '{"name": "player"}', 'client/README.md');

const roadmap = readFileSync('docs/roadmap.md', 'utf8');
assertIncludes(roadmap, '- [x] 清理旧前端链接、文案和资源边界。', 'docs/roadmap.md');

const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
assertIncludes(ciWorkflow, 'npm run verify:backend', '.github/workflows/ci.yml');
assertIncludes(ciWorkflow, 'npm run verify:desktop', '.github/workflows/ci.yml');

const releaseWorkflow = readFileSync('.github/workflows/release-linux-alpha.yml', 'utf8');
assertIncludes(releaseWorkflow, 'npm run tauri:build', '.github/workflows/release-linux-alpha.yml');
assertIncludes(releaseWorkflow, 'npm run desktop:artifact-smoke', '.github/workflows/release-linux-alpha.yml');
assertIncludes(releaseWorkflow, 'npm run desktop:artifact-manifest', '.github/workflows/release-linux-alpha.yml');
assertIncludes(releaseWorkflow, 'npm run desktop:release-bundle', '.github/workflows/release-linux-alpha.yml');
assertIncludes(releaseWorkflow, 'npm run desktop:release-check', '.github/workflows/release-linux-alpha.yml');
assertIncludes(releaseWorkflow, 'actions/upload-artifact@v4', '.github/workflows/release-linux-alpha.yml');

const releaseNotes = readFileSync('docs/releases/v0.2.0-alpha.md', 'utf8');
assertIncludes(releaseNotes, 'Known Limitations', 'docs/releases/v0.2.0-alpha.md');
assertIncludes(releaseNotes, 'npm run verify', 'docs/releases/v0.2.0-alpha.md');
assertIncludes(releaseNotes, 'manifest.json', 'docs/releases/v0.2.0-alpha.md');

const publicFiles = [
  'client/public/index.html',
  'client/public/manifest.json',
  'client/README.md',
  'client/src/components/Login.js',
  'server/templates/index.html',
]
  .map((file) => [file, readFileSync(file, 'utf8')]);

for (const [file, contents] of publicFiles) {
  for (const staleText of [
    'React App',
    'Create React App',
    'create-react-app',
    '立即注册',
    '/static/newddz/index.html',
  ]) {
    if (contents.includes(staleText)) {
      throw new Error(`${file} still contains stale public text: ${staleText}`);
    }
  }
}

console.log('release-metadata-ok');

function assertIncludes(contents, needle, label) {
  if (!contents.includes(needle)) {
    throw new Error(`${label} is missing ${needle}`);
  }
}
