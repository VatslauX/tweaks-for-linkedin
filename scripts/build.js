// Packs extension/ into dist/tweaks-for-linkedin-<version>.zip.
// Only the extension folder is included: no tests, docs, or node_modules.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ext = path.join(root, 'extension');
const { version } = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8'));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', `tweaks-for-linkedin-${version}.zip`);
fs.rmSync(out, { force: true });
execFileSync('zip', ['-qr', '-X', out, '.', '-x', '.*', '-x', '*/.*'], { cwd: ext });
console.log('Built', path.relative(root, out));
