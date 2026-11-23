// The tweak registry and settings, shared by the content script and the popup. Stored in chrome.storage.sync.

// Popup sections, in order. `path` is the first URL segment of that LinkedIn tab.
const LIO_TABS = [
  { id: 'all', label: 'Everywhere' },
  { id: 'home', label: 'Home', path: 'feed' },
  { id: 'network', label: 'Network', path: 'mynetwork' },
  { id: 'jobs', label: 'Jobs', path: 'jobs' },
  { id: 'messaging', label: 'Messaging', path: 'messaging' },
  { id: 'notifications', label: 'Notifications', path: 'notifications' }
];

// One entry per switch. Keys are stored settings: renaming one resets it for the user.
// A tweak with `needs` is a layout tweak: it applies only while all the tweaks it lists are on.
const LIO_TWEAKS = [
  { key: 'ad', tab: 'all', label: 'Hide promoted banner', on: true },
  { key: 'footer', tab: 'all', label: 'Hide footer links', on: true },
  { key: 'puzzles', tab: 'all', label: "Hide Today's puzzles", on: true },
  { key: 'premium', tab: 'all', label: 'Hide Premium promos', on: true },
  { key: 'chatbar', tab: 'all', label: 'Hide floating Messaging bar', on: true },
  { key: 'wide', tab: 'all', label: 'Same width on all tabs', hint: 'Network, Jobs, Messaging, Notifications. Needs the banner and footer hidden', on: true, needs: ['ad', 'footer'] },
  { key: 'promoted', tab: 'home', label: 'Block promoted', counter: true, on: false }, // opt-in: removing ads carries account risk
  { key: 'show1st', tab: 'home', label: 'Show 1st connections', on: true },
  { key: 'show2nd', tab: 'home', label: 'Show 2nd connections', on: true },
  { key: 'show3rd', tab: 'home', label: 'Show 3rd+ connections', on: true },
  { key: 'showOther', tab: 'home', label: 'Show everyone else', hint: 'Companies, people you follow, and posts with no degree', on: true },
  { key: 'follow', tab: 'home', label: 'Hide Add to your feed', on: true },
  { key: 'widen', tab: 'home', label: 'Widen the feed', hint: 'Needs the banner, footer, puzzles and Add to your feed hidden', on: true, needs: ['ad', 'footer', 'puzzles', 'follow'] },
  { key: 'hideCompany', tab: 'network', label: 'Hide people at my company', hint: 'Only when their headline names it', companies: true, on: true }
];

const LIO_DEFAULTS = Object.fromEntries(LIO_TWEAKS.map(t => [t.key, t.on]));

// The popup asks the active tab how many promoted posts are blocked with this message type.
const LIO_COUNT_MESSAGE = 'lio-promoted-count';

// The content script tells background.js it is running, so the toolbar icon turns blue on this tab.
const LIO_ACTIVE_MESSAGE = 'lio-active-tab';

// Company names for the Network filter. In chrome.storage.local, so they stay in this browser profile.
const LIO_COMPANIES_KEY = 'lioCompanies';

function lioCleanCompanies(list) {
  if (!Array.isArray(list)) return [];
  const names = list.filter(n => typeof n === 'string').map(n => n.trim().replace(/\s+/g, ' '))
    .filter(n => n.length >= 2 && n.length <= 60 && /[\p{L}\p{N}]/u.test(n));
  return [...new Set(names)].slice(0, 10);
}

const lioSettings = { ...LIO_DEFAULTS };
const lioListeners = [];

// Call fn now and every time settings change.
function lioOnSettings(fn) { lioListeners.push(fn); fn(lioSettings); }

// Anything malformed falls back to the default.
function lioSanitize(s) {
  const out = { ...LIO_DEFAULTS };
  if (!s || typeof s !== 'object') return out;
  for (const k of Object.keys(LIO_DEFAULTS)) if (typeof s[k] === 'boolean') out[k] = s[k];
  return out;
}

// True while a layout tweak can't apply because something it needs is switched off.
function lioBlocked(tweak, s) {
  return (tweak.needs || []).some(k => !s[k]);
}

// What the stylesheets read from <html data-lio-off>: every tweak not in effect (switched off or blocked).
function lioOff(s) {
  return LIO_TWEAKS.filter(t => !s[t.key] || lioBlocked(t, s)).map(t => t.key).join(' ');
}

// The LinkedIn tab a URL path belongs to, or '' for any other page.
function lioTabFor(pathname) {
  const first = pathname.split('/')[1];
  return LIO_TABS.find(t => t.path === first)?.id || '';
}

function lioAlive() {
  try { return !!chrome.runtime?.id; } catch (e) { return false; }
}

(() => {
  const apply = s => {
    Object.assign(lioSettings, lioSanitize(s));
    lioListeners.forEach(fn => { try { fn(lioSettings); } catch (e) {} });
  };
  // A failed read keeps the last good settings and tries again (1 s, doubling to 30 s).
  let retries = 0, timer = 0;
  const read = async () => {
    try {
      const s = await chrome.storage.sync.get(LIO_DEFAULTS);
      retries = 0;
      apply(s);
    } catch (e) {
      if (timer || !lioAlive()) return;
      timer = setTimeout(() => { timer = 0; read(); }, Math.min(30000, 1000 * 2 ** retries++));
    }
  };
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'sync') read(); });
  read();
})();
