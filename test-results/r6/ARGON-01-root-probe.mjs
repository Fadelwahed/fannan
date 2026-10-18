// Run as root: node ARGON-01-root-probe.mjs <executable-trust.mjs>. Builds a root-owned 0755 tree under /root.
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
const { supportTreeDigest } = await import(process.argv[2]);
const base = mkdtempSync('/root/fannan-r6-'); chmodSync(base, 0o755);
const tree = join(base, 'chrome-154'); mkdirSync(tree, { mode: 0o755 });
writeFileSync(join(tree, 'chrome'), 'x', { mode: 0o555 }); writeFileSync(join(tree, 'a.pak'), 'p', { mode: 0o444 });
const run = label => { try { console.log(label, 'ok', supportTreeDigest(tree, true).slice(0, 12)); } catch (e) { console.log(label, 'refused:', e.message.replace(base, '<base>')); } };
run('clean root-owned tree:');
symlinkSync('a.pak', join(tree, 'b.pak')); run('internal symlink:');
rmSync(join(tree, 'b.pak')); symlinkSync(tree, join(base, 'link'));
try { console.log('symlinked root:', supportTreeDigest(join(base, 'link'), true).slice(0, 12), '(accepted)'); } catch (e) { console.log('symlinked root refused:', e.message.replace(base, '<base>')); }
rmSync(base, { recursive: true, force: true });
