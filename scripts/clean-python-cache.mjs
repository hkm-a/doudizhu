import { readdirSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['server'];

let removed = 0;

function cleanDirectory(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (entry === '__pycache__') {
        rmSync(path, { recursive: true, force: true });
        removed += 1;
        continue;
      }

      cleanDirectory(path);
      continue;
    }

    if (entry.endsWith('.pyc') || entry.endsWith('.pyo')) {
      unlinkSync(path);
      removed += 1;
    }
  }
}

for (const root of roots) {
  cleanDirectory(root);
}

console.log(`Removed ${removed} Python cache item${removed === 1 ? '' : 's'}.`);
