// Guards the rules in .claude/rules/extension-security.md.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const EXT = path.join(__dirname, '../../extension');
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
const sources = fs.readdirSync(EXT).filter(f => /\.(js|html)$/.test(f))
  .map(f => [f, fs.readFileSync(path.join(EXT, f), 'utf8')]);

test('manifest: only the storage permission and only LinkedIn', () => {
  assert.strictEqual(manifest.manifest_version, 3);
  assert.deepStrictEqual(manifest.permissions, ['storage']);
  for (const k of ['host_permissions', 'optional_permissions', 'optional_host_permissions', 'web_accessible_resources', 'externally_connectable', 'background']) {
    assert.strictEqual(manifest[k], undefined, k);
  }
  assert.strictEqual(manifest.content_scripts.length, 1);
  const cs = manifest.content_scripts[0];
  assert.deepStrictEqual(cs.matches, ['https://www.linkedin.com/*']);
  assert.ok(!cs.all_frames, 'top frame only');
  assert.strictEqual(cs.world, undefined, 'isolated world only');
});

test('manifest: every listed file exists', () => {
  const cs = manifest.content_scripts[0];
  const icons = [...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
  for (const f of [...cs.js, ...cs.css, manifest.action.default_popup, ...icons]) assert.ok(fs.existsSync(path.join(EXT, f)), f);
});

test('manifest: each icon is a PNG of its listed size', () => {
  assert.deepStrictEqual(manifest.action.default_icon, manifest.icons);
  assert.deepStrictEqual(Object.keys(manifest.icons), ['16', '32', '48', '128']);
  for (const [size, f] of Object.entries(manifest.icons)) {
    const png = fs.readFileSync(path.join(EXT, f));
    assert.strictEqual(png.toString('latin1', 1, 4), 'PNG', f);
    assert.deepStrictEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [Number(size), Number(size)], f);
  }
});

test('release: the manifest, package, lockfile and changelog share one version', () => {
  const root = path.join(__dirname, '../..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.strictEqual(pkg.version, manifest.version);
  assert.strictEqual(lock.version, manifest.version);
  assert.strictEqual(lock.packages[''].version, manifest.version);
  assert.strictEqual(changelog.match(/^## (\d+\.\d+\.\d+)/m)?.[1], manifest.version);
});

test('source: no remote code, network calls, unsafe HTML or page actions', () => {
  const banned = [/\beval\s*\(/, /new Function/, /\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /postMessage/,
    /console\.(log|info|debug)/, /innerHTML/, /insertAdjacentHTML/, /setHTMLUnsafe/, /document\.write/,
    /\.click\s*\(/, /\.submit\s*\(/, /requestSubmit/, /<script[^>]+src=["']https?:/];
  for (const [file, text] of sources) for (const re of banned) assert.ok(!re.test(text), `${file}: ${re}`);
});

test('source: only promoted.js and the degree and company POCs read page text', () => {
  for (const f of manifest.content_scripts[0].js.filter(name => !['promoted.js', 'degree.js', 'company.js'].includes(name))) {
    const text = fs.readFileSync(path.join(EXT, f), 'utf8').replace(/\b(bar|frame)Style\.textContent/g, ''); // the extension's own <style> elements
    assert.ok(!/textContent|innerText|outerText|outerHTML|nodeValue/.test(text), f);
  }
});

test('source: only the popup uses chrome.tabs', () => {
  for (const [file, text] of sources) if (file !== 'options.js') assert.ok(!/chrome\.tabs/.test(text), file);
});

test('css: no hashed LinkedIn class names', () => {
  for (const f of manifest.content_scripts[0].css) {
    const css = fs.readFileSync(path.join(EXT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/\.[a-z][\w-]*\s*[,{>:\s]/i.test(css.replace(/"[^"]*"/g, '""')), `class selector in ${f}`);
  }
});
