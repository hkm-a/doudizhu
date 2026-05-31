import { copyFileSync, existsSync } from 'node:fs';

const envPath = '.env';
const examplePath = '.env.example';

if (!existsSync(examplePath)) {
  console.error(`${examplePath} is missing.`);
  process.exit(1);
}

if (existsSync(envPath)) {
  console.log(`${envPath} already exists; leaving it unchanged.`);
} else {
  copyFileSync(examplePath, envPath);
  console.log(`Created ${envPath} from ${examplePath}.`);
}

console.log('Next steps: npm run dev:db, then npm run dev:server.');
