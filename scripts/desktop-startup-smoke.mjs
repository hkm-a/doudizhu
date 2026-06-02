import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const startupHtml = readFileSync('src-tauri/dist/index.html', 'utf8');
const rustSource = readFileSync('src-tauri/src/lib.rs', 'utf8');
const tauriConfig = readFileSync('src-tauri/tauri.conf.json', 'utf8');

for (const [label, contents, needles] of [
  [
    'src-tauri/dist/index.html',
    startupHtml,
    [
      'window.__setStartupState',
      'id="checks"',
      'renderCheck',
      "invoke('retry_backend')",
      '当前环境无法调用桌面端重试命令',
    ],
  ],
  [
    'src-tauri/src/lib.rs',
    rustSource,
    [
      'tauri::generate_handler![retry_backend]',
      'run_backend_preflight(&app, &state.config, &server_dir)',
      'report_startup_preflight(&window, &checks)',
      'preflight_has_failures(&checks)',
      'start_if_needed(&state.config, &server_dir, &backend_log_path)',
    ],
  ],
  [
    'src-tauri/tauri.conf.json',
    tauriConfig,
    [
      '"../server": "server"',
      '"../scripts/backend-preflight.py": "backend-preflight.py"',
      '"../requirements.txt": "requirements.txt"',
      '"../schema.sql": "schema.sql"',
    ],
  ],
]) {
  for (const needle of needles) {
    assert(contents.includes(needle), `${label} is missing ${needle}`);
  }
}

const script = extractInlineScript(startupHtml);
const document = createDocument([
  'status',
  'message',
  'retry',
  'checks',
]);
const window = {};

vm.runInNewContext(script, { document, window });
assert(typeof window.__setStartupState === 'function', 'startup state hook was not registered');

window.__setStartupState({
  state: 'ready',
  message: '后端预检完成',
  checks: [
    {
      status: 'pass',
      label: 'python import tornado',
      detail: 'available',
      hint: '',
    },
    {
      status: 'warn',
      label: 'database TCP 127.0.0.1:3306',
      detail: 'connection refused',
      hint: 'Start MySQL with npm run dev:db.',
    },
  ],
});

assertEqual(document.getElementById('status').dataset.state, 'ready', 'status state');
assertEqual(document.getElementById('message').textContent, '后端预检完成', 'message text');
assertEqual(document.getElementById('checks').children.length, 2, 'rendered check count');
assertEqual(document.getElementById('checks').children[0].dataset.status, 'pass', 'first check status');
assertEqual(document.getElementById('checks').children[1].children[2].textContent, 'Start MySQL with npm run dev:db.', 'warning hint');

await document.getElementById('retry').dispatch('click');
assertEqual(document.getElementById('status').dataset.state, 'error', 'retry fallback state');
assertEqual(document.getElementById('checks').children.length, 0, 'retry clears old checks');
assert(
  document.getElementById('message').textContent.includes('无法调用桌面端重试命令'),
  'retry fallback message is visible',
);

console.log('desktop-startup-smoke-ok');

function extractInlineScript(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(match, 'startup page has no inline script');
  return match[1];
}

function createDocument(ids) {
  const elements = Object.fromEntries(ids.map((id) => [id, createElement(id)]));
  return {
    createElement(tagName) {
      return createElement('', tagName);
    },
    getElementById(id) {
      return elements[id];
    },
  };
}

function createElement(id, tagName = 'div') {
  return {
    id,
    tagName,
    children: [],
    className: '',
    dataset: {},
    disabled: false,
    listeners: {},
    textContent: '',
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    async dispatch(name) {
      assert(this.listeners[name], `missing ${name} listener`);
      await this.listeners[name]();
    },
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}
