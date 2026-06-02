import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { get } from 'node:https';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE_URL = 'https://github.com/kwai/DouZero/releases/download/pretrained';
const FILES = ['landlord.ckpt', 'landlord_up.ckpt', 'landlord_down.ckpt'];
const MODEL_DIR = process.env.DOUZERO_MODEL_DIR || join(homedir(), '.doudizhu', 'models');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (res) => {
      if (res.statusCode >= 300 && res.headers.location) {
        file.close();
        unlink(dest).catch(() => {});
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        unlink(dest).catch(() => {});
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      file.close();
      unlink(dest).catch(() => {});
      reject(err);
    });
  });
}

async function main() {
  mkdirSync(MODEL_DIR, { recursive: true });

  const results = [];
  let hasError = false;

  for (const filename of FILES) {
    const dest = join(MODEL_DIR, filename);
    if (existsSync(dest)) {
      const s = await stat(dest);
      if (s.size > 0) {
        results.push({ file: filename, status: 'cached', path: dest, size: s.size });
        continue;
      }
      process.stderr.write(`${filename} is empty, re-downloading...\n`);
    }
    try {
      const url = `${BASE_URL}/${filename}`;
      process.stderr.write(`Downloading ${filename} ...\n`);
      await download(url, dest);
      const s = await stat(dest);
      results.push({ file: filename, status: 'downloaded', path: dest, size: s.size });
    } catch (err) {
      hasError = true;
      results.push({ file: filename, status: 'failed', error: err.message });
    }
  }

  const okCount = results.filter(r => r.status !== 'failed').length;
  const report = { model_dir: MODEL_DIR, total: FILES.length, ok: okCount, results };
  console.log(JSON.stringify(report, null, 2));
  process.exit(hasError ? 1 : 0);
}

main();
