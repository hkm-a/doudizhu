import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [];

checkFile('package.json', 'root package manifest');
checkFile('.env.example', 'sample environment file');
checkFile('compose.yml', 'Docker Compose MySQL setup');
checkFile('schema.sql', 'database schema');
checkCommand('node', ['--version'], 'Node.js runtime');
checkCommand('npm', ['--version'], 'npm package manager');
checkCommand('python3', ['--version'], 'Python backend runtime');
checkCommand('docker', ['compose', 'version'], 'Docker Compose for local MySQL', { required: false });
checkDirectory('node_modules', 'root npm dependencies', 'Run npm install.');
checkDirectory('client/node_modules', 'client npm dependencies', 'Run npm --prefix client install.');
checkDirectory('.venv', 'Python virtual environment', 'Run python3 -m venv .venv, then install requirements.txt.');
checkFile('.env', 'local environment file', { required: false, hint: 'Run npm run dev:setup.' });
checkEnvExample();

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
