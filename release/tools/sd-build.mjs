// Style Dictionary 5.6.1 DTCG JSON -> CSS variables; safe-write enforces the project boundary.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { config } from '../runtime/sd.config.mjs';
import { verifiedDeps } from './verify-deps.mjs';
import { validateReferences } from './token-references.mjs';

const [, , input, output, project] = process.argv;
if (!input || !output || !project || !process.env.FANNAN_DEPS) {
  console.error('usage: FANNAN_DEPS=<npm prefix> node sd-build.mjs <tokens.json> <variables.css> <project>');
  process.exit(2);
}
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) { console.error('Node 22.12+ required'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const tokens = JSON.parse(readFileSync(input, 'utf8'));
validateReferences(tokens);
const depsRoot = verifiedDeps(process.env.FANNAN_DEPS, join(here, '..'));
const modulePath = join(depsRoot, 'node_modules/style-dictionary/lib/StyleDictionary.js');
const { default: StyleDictionary } = await import(pathToFileURL(modulePath).href);
if (StyleDictionary.VERSION !== '5.6.1') throw Error(`unexpected Style Dictionary ${StyleDictionary.VERSION}`);
const sd = new StyleDictionary(config(tokens));
const [{ output: css }] = await sd.formatPlatform('css');
execFileSync(join(here, 'safe-write.sh'), [project, resolve(output)], { input: css, encoding: 'utf8' });
const record = { styleDictionaryVersion: StyleDictionary.VERSION, inputSha256: hash(input), outputSha256: hash(output), scriptSha256: hash(fileURLToPath(import.meta.url)), configSha256: hash(join(here, '../runtime/sd.config.mjs')), lockSha256: hash(join(here, '../runtime/package-lock.json')) };
execFileSync(join(here, 'safe-write.sh'), [project, resolve(output) + '.build.json'], { input: JSON.stringify(record, null, 2) + '\n', encoding: 'utf8' });
console.log(`CSS variables written: ${resolve(output)}`);
