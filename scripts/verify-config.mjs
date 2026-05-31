import { readFileSync } from 'node:fs';

const env = parseEnv(readFileSync('.env.example', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const compose = readFileSync('compose.yml', 'utf8');
const schema = readFileSync('schema.sql', 'utf8');

const expectedEnv = {
  PORT: '8081',
  DATABASE_URI: 'mysql+aiomysql://ddz:ddz@127.0.0.1:3306/ddz',
  MYSQL_DATABASE: 'ddz',
  MYSQL_USER: 'ddz',
  MYSQL_PASSWORD: 'ddz',
  MYSQL_ROOT_PASSWORD: 'ddz-root',
  MYSQL_PORT: '3306',
  DOUDIZHU_BACKEND_PORT: '8081',
  DOUDIZHU_BACKEND_URL: 'http://127.0.0.1:8081/',
  DOUDIZHU_BACKEND_HOST: '127.0.0.1:8081',
  DOUDIZHU_BACKEND_HEALTH_PATH: '/healthz',
  DOUDIZHU_DATABASE_URI: 'mysql+aiomysql://ddz:ddz@127.0.0.1:3306/ddz',
};

for (const [key, value] of Object.entries(expectedEnv)) {
  assertEqual(env[key], value, `.env.example ${key}`);
}

const expectedScripts = {
  'dev:setup': 'node scripts/setup-dev.mjs',
  'dev:db': 'docker compose up -d mysql',
  'dev:db:down': 'docker compose down',
  'dev:server': 'cd server && PYTHONPATH=. python3 app.py',
  'dev:web': 'npm --prefix client start',
  'verify:config': 'node scripts/verify.mjs config',
};

for (const [key, value] of Object.entries(expectedScripts)) {
  assertEqual(packageJson.scripts?.[key], value, `package.json scripts.${key}`);
}

for (const required of [
  'name: doudizhu',
  'mysql:',
  'image: mysql:8.4',
  'MYSQL_DATABASE: ${MYSQL_DATABASE:-ddz}',
  'MYSQL_USER: ${MYSQL_USER:-ddz}',
  'MYSQL_PASSWORD: ${MYSQL_PASSWORD:-ddz}',
  'MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-ddz-root}',
  '"${MYSQL_PORT:-3306}:3306"',
  './schema.sql:/docker-entrypoint-initdb.d/001-schema.sql:ro',
  'mysqladmin ping -h 127.0.0.1',
]) {
  assertIncludes(compose, required, 'compose.yml');
}

for (const required of [
  'CREATE DATABASE IF NOT EXISTS ddz',
  'CREATE TABLE IF NOT EXISTS ddz.user',
  'CREATE TABLE IF NOT EXISTS ddz.record',
]) {
  assertIncludes(schema, required, 'schema.sql');
}

console.log('configuration-ok');

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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual ?? '<missing>'}`);
  }
}

function assertIncludes(contents, needle, label) {
  if (!contents.includes(needle)) {
    throw new Error(`${label} is missing ${needle}`);
  }
}
