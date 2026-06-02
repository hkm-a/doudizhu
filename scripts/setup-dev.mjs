import { copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipInstall = args.has('--skip-install');
const skipNpm = skipInstall || args.has('--skip-npm');
const skipPython = skipInstall || args.has('--skip-python');

const steps = [];

ensureEnvFile();
ensureRootDependencies();
ensureClientDependencies();
ensurePythonEnvironment();
printNextSteps();

function ensureEnvFile() {
  const envPath = '.env';
  const examplePath = '.env.example';

  if (!existsSync(examplePath)) {
    fail(`${examplePath} is missing.`);
  }

  if (existsSync(envPath)) {
    step('ok', `${envPath} already exists; leaving it unchanged.`);
    return;
  }

  runAction(`Create ${envPath} from ${examplePath}`, () => copyFileSync(examplePath, envPath));
}

function ensureRootDependencies() {
  if (skipNpm) {
    step('skip', 'Root npm dependency install skipped.');
    return;
  }
  if (existsSync('node_modules')) {
    step('ok', 'Root npm dependencies already installed.');
    return;
  }
  runCommand('Install root npm dependencies', 'npm', ['install']);
}

function ensureClientDependencies() {
  if (skipNpm) {
    step('skip', 'Client npm dependency install skipped.');
    return;
  }
  if (existsSync('client/node_modules')) {
    step('ok', 'Client npm dependencies already installed.');
    return;
  }
  runCommand('Install client npm dependencies', 'npm', ['--prefix', 'client', 'install']);
}

function ensurePythonEnvironment() {
  if (skipPython) {
    step('skip', 'Python virtual environment setup skipped.');
    return;
  }

  if (!existsSync('.venv/bin/python')) {
    runCommand('Create Python virtual environment', 'python3', ['-m', 'venv', '.venv']);
  } else {
    step('ok', 'Python virtual environment already exists.');
  }

  if (dryRun) {
    step('dry-run', 'Would check backend Python dependencies.');
    return;
  }

  const preflight = spawnSync('.venv/bin/python', ['scripts/backend-preflight.py', '--skip-network', '--json'], { encoding: 'utf8' });
  if (preflight.status === 0) {
    step('ok', 'Backend Python dependencies already installed.');
    return;
  }

  runCommand('Install backend Python dependencies', '.venv/bin/python', ['-m', 'pip', 'install', '-r', 'requirements.txt']);
}

function runCommand(label, command, commandArgs) {
  if (dryRun) {
    step('dry-run', `${label}: ${command} ${commandArgs.join(' ')}`);
    return;
  }

  step('run', label);
  const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
  if (result.status !== 0) {
    fail(`${label} failed with exit code ${result.status}`);
  }
}

function runAction(label, action) {
  if (dryRun) {
    step('dry-run', label);
    return;
  }
  action();
  step('ok', label);
}

function printNextSteps() {
  console.log('\nSetup summary:');
  for (const item of steps) {
    console.log(`[${item.status}] ${item.message}`);
  }
  console.log('\nNext steps: npm run dev:doctor, npm run dev:db, then npm run dev:server.');
}

function step(status, message) {
  steps.push({ status, message });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
