import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

const commands = {
  backend: [
    {
      label: 'Compile backend Python',
      command: process.env.PYTHON || 'python3',
      args: ['-m', 'compileall', '-q', 'server', 'scripts/backend-smoke.py', 'scripts/backend-preflight.py', 'scripts/ai-replay-smoke.py', 'scripts/ai-douzero-replay-smoke.py', 'scripts/ai-decision-summary.py', 'scripts/player-event-summary.py', 'scripts/player-event-smoke.py', 'scripts/ai-double-smoke.py', 'scripts/double-room-smoke.py', 'scripts/segment-smoke.py', 'scripts/season_reset_cron.py', 'scripts/generate-placeholder-sounds.py', 'scripts/generate-segment-badges.py'],
      cwd: root,
    },
    {
      label: 'Run backend smoke checks',
      command: process.env.PYTHON || 'python3',
      args: ['scripts/backend-smoke.py'],
      cwd: root,
      env: { PYTHONPATH: 'server' },
    },
    {
      label: 'Run AI replay smoke',
      command: process.env.PYTHON || 'python3',
      args: ['scripts/ai-replay-smoke.py'],
      cwd: root,
      env: { PYTHONPATH: 'server' },
    },
    {
      label: 'Run player event smoke',
      command: process.env.PYTHON || 'python3',
      args: ['scripts/player-event-smoke.py'],
      cwd: root,
      env: { PYTHONPATH: 'server' },
    },
    {
      label: 'Run AI double smoke',
      command: process.env.PYTHON || 'python3',
      args: ['scripts/ai-double-smoke.py'],
      cwd: root,
      env: { PYTHONPATH: 'server' },
    },
    {
      label: 'Run double room smoke',
      command: process.env.PYTHON || 'python3',
      args: ['scripts/double-room-smoke.py'],
      cwd: root,
      env: { PYTHONPATH: 'server' },
    },
    {
      label: 'Run segment smoke',
      command: process.env.PYTHON || 'python3',
      args: ['scripts/segment-smoke.py'],
      cwd: root,
      env: { PYTHONPATH: 'server' },
    },
    {
      label: 'Run backend unit tests',
      command: process.env.PYTHON || 'python3',
      args: ['-m', 'unittest', 'discover', '-s', 'tests/backend', '-p', 'test_*.py'],
      cwd: root,
      env: { PYTHONPATH: 'server' },
    },
  ],
  web: [
    {
      label: 'Run React client tests',
      command: process.env.NPM || 'npm',
      args: ['run', 'test:ci'],
      cwd: path.join(root, 'client'),
    },
    {
      label: 'Build React client',
      command: process.env.NPM || 'npm',
      args: ['run', 'build'],
      cwd: path.join(root, 'client'),
    },
  ],
  desktop: [
    {
      label: 'Run desktop startup smoke',
      command: process.execPath,
      args: ['scripts/desktop-startup-smoke.mjs'],
      cwd: root,
    },
    {
      label: 'Run desktop Rust tests',
      command: process.env.CARGO || 'cargo',
      args: ['test', '--manifest-path', 'src-tauri/Cargo.toml'],
      cwd: root,
    },
  ],
  config: [
    {
      label: 'Validate development setup script',
      command: process.execPath,
      args: ['--check', 'scripts/setup-dev.mjs'],
      cwd: root,
    },
    {
      label: 'Exercise development setup dry run',
      command: process.execPath,
      args: ['scripts/setup-dev.mjs', '--dry-run', '--skip-install'],
      cwd: root,
    },
    {
      label: 'Validate development doctor script',
      command: process.execPath,
      args: ['--check', 'scripts/doctor-dev.mjs'],
      cwd: root,
    },
    {
      label: 'Validate release metadata script',
      command: process.execPath,
      args: ['--check', 'scripts/verify-release-metadata.mjs'],
      cwd: root,
    },
    {
      label: 'Validate desktop startup smoke script',
      command: process.execPath,
      args: ['--check', 'scripts/desktop-startup-smoke.mjs'],
      cwd: root,
    },
    {
      label: 'Validate Linux alpha artifact smoke script',
      command: process.execPath,
      args: ['--check', 'scripts/linux-alpha-artifact-smoke.mjs'],
      cwd: root,
    },
    {
      label: 'Validate Linux alpha manifest script',
      command: process.execPath,
      args: ['--check', 'scripts/linux-alpha-manifest.mjs'],
      cwd: root,
    },
    {
      label: 'Validate Linux alpha bundle script',
      command: process.execPath,
      args: ['--check', 'scripts/linux-alpha-bundle.mjs'],
      cwd: root,
    },
    {
      label: 'Validate Linux alpha release check script',
      command: process.execPath,
      args: ['--check', 'scripts/linux-alpha-release-check.mjs'],
      cwd: root,
    },
    {
      label: 'Check local development config',
      command: process.execPath,
      args: ['scripts/verify-config.mjs'],
      cwd: root,
    },
    {
      label: 'Check public release metadata',
      command: process.execPath,
      args: ['scripts/verify-release-metadata.mjs'],
      cwd: root,
    },
  ],
  format: [
    {
      label: 'Check git whitespace',
      command: process.env.GIT || 'git',
      args: ['diff', '--check'],
      cwd: root,
    },
  ],
};

const requested = process.argv.slice(2);
const targets = requested.length > 0 ? requested : ['backend', 'web', 'desktop', 'config', 'format'];

try {
  for (const target of targets) {
    if (!commands[target]) {
      console.error(`Unknown verify target: ${target}`);
      console.error(`Available targets: ${Object.keys(commands).join(', ')}`);
      process.exit(2);
    }
  }

  for (const target of targets) {
    for (const step of commands[target]) {
      await run(step);
    }
  }

  console.log('\nAll requested verification checks passed.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function run(step) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${step.label}`);
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      env: { ...process.env, ...step.env },
      shell: isWindows,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${step.label} failed with exit code ${code}`));
    });
  });
}
