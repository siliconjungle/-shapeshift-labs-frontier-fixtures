import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const packageJson = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
const readmePath = path.join(packageDir, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');
const required = [
  '# ' + packageJson.name,
  '## Install',
  '## Example',
  '## Surface',
  '## Boundary',
  '## Determinism And Privacy',
  '## Benchmarks',
  'npm run bench',
  'Frontier-only package measurements',
  packageJson.repository.url.replace('git+ssh://git@github.com/', 'https://github.com/').replace(/\.git$/, '')
];
const missing = required.filter((text) => !readme.includes(text));

if (missing.length) {
  console.error('README missing required package text:');
  for (const text of missing) console.error('- ' + text);
  process.exit(1);
}

if (/(faster than|slower than|beats?\s+(jsondiffpatch|microdiff|rfc6902|fast-json-patch)|vs\.?\s+(jsondiffpatch|microdiff|rfc6902|fast-json-patch))/i.test(readme)) {
  console.error('README must not contain competitor comparison claims');
  process.exit(1);
}

if (!check) console.log('frontier-fixtures README sections are current');
