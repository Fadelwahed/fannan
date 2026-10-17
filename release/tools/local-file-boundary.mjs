import { readFileSync, realpathSync, statSync } from 'node:fs';
import { extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' };
export function localAsset(url, projectRoot) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'file:' || parsed.search || parsed.hash) throw Error('only local project files are allowed');
  const root = realpathSync(projectRoot), path = realpathSync(fileURLToPath(parsed));
  if (!path.startsWith(root + sep) || !statSync(path).isFile()) throw Error('file request is outside the selected project');
  const contentType = types[extname(path).toLowerCase()];
  if (!contentType) throw Error('file type is not allowed');
  return { body: readFileSync(path), contentType, path };
}
