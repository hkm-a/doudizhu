import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';

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
ensureAiModels();
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

function ensureAiModels() {
  const script = 'scripts/download-douzero-model.mjs';
  if (!existsSync(script)) {
    step('warn', `${script} missing; skipping AI model download.`);
    return;
  }

  if (dryRun) {
    step('dry-run', 'Would download DouZero AI models.');
    return;
  }

  step('run', 'Downloading DouZero AI models (if not cached) ...');
  const result = spawnSync('node', [script], { stdio: 'inherit', timeout: 60000 });
  if (result.status === 0 || result.signal === 'SIGTERM') {
    step(result.status === 0 ? 'ok' : 'skip', `AI models: ${result.status === 0 ? 'ready' : 'download timed out; will retry next time'}`);
  } else {
    step('warn', 'AI model download failed; DouZero will fall back to rule AI. Run npm run dev:ai:setup to retry.');
  }

  ensureAiEnvVars();
}

function ensureAiEnvVars() {
  const envPath = '.env';
  if (!existsSync(envPath)) return;

  let content = readFileSync(envPath, 'utf8');
  const modelDir = execSync('node -e "console.log(require(\'path\').join(require(\'os\').homedir(), \'.doudizhu\', \'models\'))"', { encoding: 'utf8' }).trim();

  if (content.includes('DOUZERO_ENABLED=0')) {
    content = content.replace('DOUZERO_ENABLED=0', 'DOUZERO_ENABLED=1');
  }
  if (content.includes('DOUZERO_MODEL_DIR=')) {
    content = content.replace(/^DOUZERO_MODEL_DIR=.*$/m, `DOUZERO_MODEL_DIR=${modelDir}`);
  }
  writeFileSync(envPath, content, 'utf8');
  step('ok', 'Set DOUZERO_ENABLED=1 and DOUZERO_MODEL_DIR in .env');
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
