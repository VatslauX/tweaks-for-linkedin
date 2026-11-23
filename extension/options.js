// The toolbar popup: one section per LinkedIn tab, built from LIO_TWEAKS and applied live to open tabs.
(() => {
  const root = document.getElementById('tweaks');
  const inputs = new Map();
  let counter = null;

  // A GitHub form prefilled with the version, Chrome version, and language. The user sees it all before submitting.
  const { version, homepage_url: home } = chrome.runtime.getManifest();
  const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1];
  document.getElementById('feedback').href = `${home}/issues/new?${new URLSearchParams({
    template: 'feedback.yml', version, chrome: chromeVersion ? `Chrome ${chromeVersion}` : '', language: navigator.language
  })}`;

  // Asks the active tab for its count. Any tab that isn't LinkedIn has no listener, so the badge stays hidden.
  async function refreshCounter() {
    if (!counter) return;
    let count = null;
    try {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      count = await chrome.tabs.sendMessage(active.id, { type: LIO_COUNT_MESSAGE });
    } catch (e) {}
    const known = Number.isInteger(count);
    counter.hidden = !known;
    if (!known) return;
    const description = `${count} blocked on this page`;
    counter.textContent = String(count);
    counter.title = description;
    counter.setAttribute('aria-label', description);
  }

  function row(tweak) {
    const label = document.createElement('label');
    label.className = 'row';
    const text = document.createElement('span');
    text.textContent = tweak.label;
    if (tweak.counter) {
      counter = document.createElement('span');
      counter.className = 'count';
      counter.hidden = true;
      text.append(counter);
    }
    if (tweak.hint) {
      const hint = document.createElement('small');
      hint.textContent = tweak.hint;
      text.append(hint);
    }
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.dataset.key = tweak.key;
    input.addEventListener('change', () => {
      chrome.storage.sync.set({ [tweak.key]: input.checked }).catch(() => { input.checked = !input.checked; });
    });
    inputs.set(tweak, input);
    label.append(text, input);
    return label;
  }

  // Saved on every edit, because closing the popup may not fire a change event.
  function companyField() {
    const field = document.createElement('label');
    field.className = 'field';
    const text = document.createElement('small');
    text.textContent = 'Company names, one per line';
    const area = document.createElement('textarea');
    area.id = 'companies';
    area.rows = 3;
    area.spellcheck = false;
    area.addEventListener('input', () => {
      chrome.storage.local.set({ [LIO_COMPANIES_KEY]: lioCleanCompanies(area.value.split('\n')) }).catch(() => {});
    });
    chrome.storage.local.get({ [LIO_COMPANIES_KEY]: [] }).then(stored => {
      if (!area.value) area.value = lioCleanCompanies(stored[LIO_COMPANIES_KEY]).join('\n');
    }).catch(() => {});
    field.append(text, area);
    return field;
  }

  for (const tab of LIO_TABS) {
    const tweaks = LIO_TWEAKS.filter(t => t.tab === tab.id);
    if (!tweaks.length) continue;
    const heading = document.createElement('h2');
    heading.textContent = tab.label;
    root.append(heading, ...tweaks.flatMap(t => (t.companies ? [row(t), companyField()] : [row(t)])));
  }

  lioOnSettings(s => {
    inputs.forEach((input, tweak) => {
      input.checked = s[tweak.key];
      input.disabled = lioBlocked(tweak, s);
    });
    refreshCounter();
  });

  // Keeps counting while the popup is open and the feed loads more posts.
  setInterval(refreshCounter, 1000);
})();
