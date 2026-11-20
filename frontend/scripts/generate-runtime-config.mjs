import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiBaseUrl = (process.env.API_BASE_URL || '/api').trim().replace(/\/$/, '');
const publicDir = resolve('public');

await mkdir(publicDir, { recursive: true });
await writeFile(
  resolve(publicDir, 'config.json'),
  `${JSON.stringify({ apiBaseUrl }, null, 2)}\n`,
  'utf8',
);

console.log(`Generated public/config.json with API_BASE_URL=${apiBaseUrl}`);
