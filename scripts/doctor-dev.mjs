import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';

const checks = [];
const python = existsSync('.venv/bin/python') ? '.venv/bin/python' : 'python3';

checkFile('package.json', 'root package manifest');
checkFile('.env.example', 'sample environment file');
checkFile('compose.yml', 'Docker Compose MySQL setup');
checkFile('schema.sql', 'database schema');
checkCommand('node', ['--version'], 'Node.js runtime');
checkCommand('npm', ['--version'], 'npm package manager');
checkCommand('python3', ['--version'], 'Python backend runtime');
checkCommand('docker', ['compose', 'version'], 'Docker Compose for local MySQL', { required: false });
checkDirectory('node_modules', 'root npm dependencies', 'Run npm run dev:setup.');
checkDirectory('client/node_modules', 'client npm dependencies', 'Run npm run dev:setup.');
checkDirectory('.venv', 'Python virtual environment', 'Run npm run dev:setup.');
checkFile('.env', 'local environment file', { required: false, hint: 'Run npm run dev:setup.' });
checkEnvExample();
checkBackendPreflight();
checkAiReadiness();

printReport();

const hasFailures = checks.some((check) => check.status === 'fail');
process.exit(hasFailures ? 1 : 0);

function checkFile(path, label, options = {}) {
  const required = options.required ?? true;
  if (existsSync(path)) {
    pass(label, path);
    return;
  }
  record(required ? 'fail' : 'warn', label, `${path} is missing. ${options.hint ?? ''}`.trim());
}

function checkDirectory(path, label, hint) {
  if (existsSync(path)) {
    pass(label, path);
    return;
  }
  warn(label, `${path} is missing. ${hint}`);
}

function checkCommand(command, args, label, options = {}) {
  const required = options.required ?? true;
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status === 0) {
    pass(label, firstLine(result.stdout || result.stderr));
    return;
  }
  const hint = command === 'docker'
    ? 'Install Docker for npm run dev:db, or use the manual MySQL setup in README.md.'
    : `Install ${command} and make sure it is on PATH.`;
  record(required ? 'fail' : 'warn', label, hint);
}

function checkBackendPreflight() {
  if (!existsSync('scripts/backend-preflight.py')) {
    warn('backend preflight checks', 'scripts/backend-preflight.py is missing.');
    return;
  }

  const result = spawnSync(python, ['scripts/backend-preflight.py', '--json'], { encoding: 'utf8' });
  if (result.status !== 0 && !result.stdout) {
    fail('backend preflight checks', `Could not run backend preflight with ${python}. ${firstLine(result.stderr)}`);
    return;
  }

  let preflight;
  try {
    preflight = JSON.parse(result.stdout);
  } catch (error) {
    fail('backend preflight checks', `Invalid preflight output: ${error.message}`);
    return;
  }

  for (const check of preflight) {
    const detail = check.hint ? `${check.detail} ${check.hint}` : check.detail;
    record(check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pass', check.label, detail);
  }
}

function checkAiReadiness() {
  const modelDir = process.env.DOUZERO_MODEL_DIR || join(homedir(), '.doudizhu', 'models');
  const required = ['landlord.ckpt', 'landlord_up.ckpt', 'landlord_down.ckpt'];
  const missing = required.filter(f => !existsSync(join(modelDir, f)));

  if (!existsSync(modelDir) || missing.length === required.length) {
    warn('DouZero AI models', `not found in ${modelDir}. Run npm run dev:ai:setup to download.`);
    return;
  }

  if (missing.length > 0) {
    warn('DouZero AI models', `partially downloaded: missing ${missing.join(', ')}. Run npm run dev:ai:setup.`);
    return;
  }

  const totalSize = required.reduce((s, f) => s + statSync(join(modelDir, f)).size, 0);
  pass('DouZero AI models', `${required.length} models, ${(totalSize / 1024 / 1024).toFixed(1)} MB in ${modelDir}`);
}

function checkEnvExample() {
  if (!existsSync('.env.example')) {
    return;
  }
  const env = parseEnv(readFileSync('.env.example', 'utf8'));
  const databaseUri = env.DATABASE_URI ?? '';
  const desktopDatabaseUri = env.DOUDIZHU_DATABASE_URI ?? '';

  if (databaseUri === desktopDatabaseUri) {
    pass('backend and desktop database URI match', databaseUri);
  } else {
    fail('backend and desktop database URI match', 'DATABASE_URI and DOUDIZHU_DATABASE_URI differ.');
  }

  if (env.PORT === env.DOUDIZHU_BACKEND_PORT) {
    pass('backend and desktop port match', env.PORT);
  } else {
    fail('backend and desktop port match', 'PORT and DOUDIZHU_BACKEND_PORT differ.');
  }
}

function parseEnv(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const [key, ...rest] = trimmed.split('=');
    values[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function firstLine(value) {
  return value.trim().split(/\r?\n/)[0] || 'ok';
}

function pass(label, detail) {
  record('pass', label, detail);
}

function warn(label, detail) {
  record('warn', label, detail);
}

function fail(label, detail) {
  record('fail', label, detail);
}

function record(status, label, detail) {
  checks.push({ status, label, detail });
}

function printReport() {
  const symbols = {
    pass: 'ok',
    warn: 'warn',
    fail: 'fail',
  };
  for (const check of checks) {
    console.log(`[${symbols[check.status]}] ${check.label}: ${check.detail}`);
  }
  const failures = checks.filter((check) => check.status === 'fail').length;
  const warnings = checks.filter((check) => check.status === 'warn').length;
  console.log(`\nDoctor finished with ${failures} failure${failures === 1 ? '' : 's'} and ${warnings} warning${warnings === 1 ? '' : 's'}.`);
}
