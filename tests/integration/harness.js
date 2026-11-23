// Integration-test harness: the real content scripts (in manifest order) run against the mock pages in JSDOM,
// under Node, with no browser. Test tooling only.
//
//   const world = createWorld({ storage: { ad: false } });        // one fake browser profile
//   const tab = await world.open({ fixture: 'feed', url: '/feed/' });
//   await world.advance(2000);                                    // virtual time: timers and storage
//
// What is faked:
//  - chrome.storage.sync and .local (one store shared by every tab, JSON-copied values, onChanged delivered
//    asynchronously with its area, optional latency and failures), chrome.runtime.id, and chrome.runtime.onMessage
//    (tab.message delivers one).
//  - Time: setTimeout and setInterval run on one virtual clock per world. Tests move it with world.advance(ms).
//  - window.navigation, which jsdom lacks: tab.go(path) changes the URL and fires currententrychange.
// The extension starts before the page's body exists, like run_at: document_start.
// Not covered: stylesheets, layout, and paint, because jsdom has none. Those stay in Playwright.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '../..');
// LIO_EXTENSION_DIR points at a scratch copy of extension/, used to prove a test fails against broken code.
const EXT = process.env.LIO_EXTENSION_DIR || path.join(ROOT, 'extension');

const json = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function contentScripts() {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
  return manifest.content_scripts[0].js.map(file => ({ file, code: fs.readFileSync(path.join(EXT, file), 'utf8') }));
}

function createWorld({ storage = {} } = {}) {
  const tabs = new Set();
  const errors = []; // uncaught errors from scripts and timers in any tab
  const faults = { get: false };
  const latency = { get: 0 }; // virtual ms before a read happens
  const data = json(storage);
  const counts = { reads: 0, writes: 0 };

  // ---------- the virtual clock ----------
  let now = 0, seq = 0, queue = [];
  const addTimer = (tab, fn, ms, every) => {
    const id = ++seq;
    queue.push({ id, tab, at: now + Math.max(0, Number(ms) || 0), fn, every });
    return id;
  };
  const clear = id => { queue = queue.filter(e => e.id !== id); };
  const run = e => {
    if (e.every) e.at = now + Math.max(1, e.every);
    else queue = queue.filter(x => x !== e);
    try { e.fn(); } catch (err) { errors.push(err); }
  };
  // real microtasks and immediates: promises, mutation observers and storage events settle here
  const settle = async () => { for (let i = 0; i < 3; i++) await new Promise(r => setImmediate(r)); };
  const due = limit => queue.filter(e => e.at <= limit).sort((a, b) => a.at - b.at || a.id - b.id)[0];

  // ---------- chrome.storage.sync ----------
  const pick = keys => {
    if (keys == null) return json(data);
    const out = {};
    for (const [k, fallback] of Object.entries(keys)) out[k] = k in data ? json(data[k]) : json(fallback);
    return out;
  };
  const read = keys => new Promise((resolve, reject) => {
    const go = () => {
      counts.reads++;
      if (faults.get) reject(new Error('storage read failed (test fault)'));
      else resolve(pick(keys));
    };
    if (latency.get > 0) addTimer(null, go, latency.get);
    else Promise.resolve().then(go);
  });
  const write = (items, area) => {
    const changes = {};
    for (const [k, v] of Object.entries(items)) {
      if (JSON.stringify(data[k]) === JSON.stringify(v)) continue;
      changes[k] = { oldValue: json(data[k]), newValue: json(v) };
      data[k] = json(v);
    }
    if (!Object.keys(changes).length) return;
    counts.writes++;
    for (const tab of tabs) {
      if (tab.dead) continue;
      Promise.resolve().then(() => {
        if (tab.dead) return;
        for (const fn of tab.storageListeners) { try { fn(json(changes), area); } catch (e) { errors.push(e); } }
      });
    }
  };

  const world = {
    errors, faults, latency, counts,
    /** Write storage as the popup would, events included. */
    set: async (items, area = 'sync') => { write(items, area); await world.flush(); },
    /** Run everything due now, then pending promises and storage events, until quiet. */
    async flush() {
      for (let i = 0; i < 200; i++) {
        await settle();
        const batch = queue.filter(e => e.at <= now);
        if (!batch.length) return;
        for (const e of batch) if (queue.includes(e)) run(e);
      }
      throw new Error('world.flush(): never quiet after 200 rounds');
    },
    /** Move the virtual clock forward, running timers and storage in order. */
    async advance(ms) {
      const target = now + ms;
      await settle();
      for (let n = 0; ; n++) {
        if (n > 10000) throw new Error('world.advance(): too many timers');
        const e = due(target);
        if (!e) break;
        now = Math.max(now, e.at);
        run(e);
        await settle();
      }
      now = target;
      await world.flush();
    },

    /** Open a tab on a mock page and run the extension in it. */
    async open({ fixture = 'feed', url = '/feed/' } = {}) {
      const html = fs.readFileSync(path.join(ROOT, 'tests/fixtures', `${fixture}.html`), 'utf8');
      const virtualConsole = new VirtualConsole();
      virtualConsole.on('jsdomError', e => errors.push(e));
      const dom = new JSDOM(html, { url: `https://www.linkedin.com${url}`, runScripts: 'outside-only', virtualConsole });
      const win = dom.window, doc = win.document;
      const tab = { world, window: win, document: doc, storageListeners: [], messageListeners: [], navListeners: [], sent: [], dead: false };
      tabs.add(tab);

      let extensionId = 'test-extension-id';
      const get = keys => {
        if (tab.dead) throw new Error('Extension context invalidated.');
        return read(keys);
      };
      const chromeApi = {
        storage: {
          sync: { get },
          local: { get },
          onChanged: { addListener: fn => tab.storageListeners.push(fn) }
        },
        runtime: {
          get id() { return extensionId; },
          onMessage: { addListener: fn => tab.messageListeners.push(fn) },
          sendMessage: message => {
            if (tab.dead) throw new Error('Extension context invalidated.');
            tab.sent.push(json(message));
            return Promise.resolve();
          }
        }
      };
      Object.defineProperty(win, 'chrome', { value: chromeApi, configurable: true });
      Object.defineProperty(win, 'navigation', {
        value: { addEventListener: (type, fn) => { if (type === 'currententrychange') tab.navListeners.push(fn); } },
        configurable: true
      });
      win.setTimeout = (fn, ms, ...a) => addTimer(tab, () => fn(...a), ms);
      win.setInterval = (fn, ms, ...a) => addTimer(tab, () => fn(...a), ms, Math.max(1, Number(ms) || 0));
      win.clearTimeout = win.clearInterval = clear;

      const ctx = dom.getInternalVMContext();
      const exec = (code, filename) => new vm.Script(code, { filename }).runInContext(ctx);

      // document_start: the extension runs first, then the page's body and its own scripts arrive.
      const body = doc.body.innerHTML;
      const inline = [...doc.querySelectorAll('script:not([src])')].map(s => s.textContent);
      doc.body.replaceChildren();
      for (const s of contentScripts()) exec(s.code, path.join(EXT, s.file));
      await settle();
      doc.body.innerHTML = body;
      for (const code of inline) exec(`(function () {\n${code}\n})();`, `${fixture}.html`);

      // ---- helpers for tests ----
      tab.$ = sel => doc.querySelector(sel);
      tab.$$ = sel => [...doc.querySelectorAll(sel)];
      /** an expression's value as plain JSON (objects made in the tab's realm don't deep-equal ours) */
      tab.json = code => JSON.parse(exec(`JSON.stringify(${code})`, 'test'));
      /** the keys in <html data-lio-off> */
      tab.off = () => (doc.documentElement.getAttribute('data-lio-off') || '').split(' ').filter(Boolean);
      tab.currentTab = () => doc.documentElement.getAttribute('data-lio-tab');
      /** in-app navigation: LinkedIn changes the URL without a reload */
      tab.go = async next => {
        win.history.pushState(null, '', next);
        for (const fn of tab.navListeners) { try { fn(); } catch (e) { errors.push(e); } }
        await world.flush();
      };
      /** like the toolbar popup: send a chrome.runtime message to this tab and return the reply */
      tab.message = (message, sender = { id: extensionId }) => {
        let answer;
        for (const fn of tab.messageListeners) {
          try { fn(message, sender, value => { answer = value; }); } catch (e) { errors.push(e); }
        }
        return answer;
      };
      /** the extension is disabled, removed, or updated while this tab stays open */
      tab.disableExtension = () => { extensionId = undefined; tab.dead = true; };
      tab.close = () => { tabs.delete(tab); queue = queue.filter(e => e.tab !== tab); win.close(); };

      await world.flush();
      return tab;
    }
  };
  return world;
}

module.exports = { createWorld, EXT, ROOT };
