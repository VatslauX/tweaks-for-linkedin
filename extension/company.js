// POC: hides Network suggestions whose headline names a company the user listed in the popup.
// Only the headline is compared, in memory. The only result is a marker attribute on the card.

// "ex-Acme", "formerly at Acme", or "former product manager at Acme". A job title may follow "former" but not "ex-",
// because "ex-Globex engineer at Acme" is someone who works at Acme now.
const LIO_COMPANY_PAST_BEFORE = /(?:^|[^\p{L}\p{N}])(?:(?:ex|former|formerly|previously|prev|past)\.?(?:\s*[-–—:@]\s*|\s+)(?:(?:at|@)\s+)?|(?:former|formerly|previously)\s+(?:\p{L}+\s+){1,5}(?:at|@)\s+)$/u;
const LIO_COMPANY_PAST_AFTER = /^\s*(?:alum|alumni|alumna|alumnus)(?![\p{L}\p{N}])/u;

const lioFoldCompany = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Whole-name patterns. Names are escaped because they can hold characters like the ones in C++ or Booking.com.
function lioCompanyPatterns(names) {
  return names.map(lioFoldCompany).filter(name => name.length >= 2).map(name => {
    const escaped = name.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu');
  });
}

// True when a name appears at least once without an "ex-", "former", or "alumni" wording around it.
function lioHeadlineNames(headline, patterns) {
  const text = lioFoldCompany(headline);
  return patterns.some(pattern => [...text.matchAll(pattern)].some(match =>
    !LIO_COMPANY_PAST_BEFORE.test(text.slice(0, match.index)) &&
    !LIO_COMPANY_PAST_AFTER.test(text.slice(match.index + match[0].length))));
}

function lioWatchCompany() {
  const HIDE = 'data-lio-company-hide', KEEP = 'data-lio-company-keep';
  const SCREEN = '[data-sdui-screen$="mynetwork.Grow"]';
  const CARD = `${SCREEN} [role="list"] > [data-display-contents] > [role="listitem"]`;
  const HEADLINE_MAX = 300;
  // Keeps one dimmed card after a long hidden run, so an emptied list doesn't make LinkedIn keep loading more.
  const MAX_HIDDEN_RUN = 10;
  let enabled = false, patterns = [];

  // The profile link holds the name, then the headline. Text outside the link is never read.
  const headline = card => {
    const lines = card.querySelector('a[href*="/in/"]')?.querySelectorAll('p');
    if (!lines || lines.length < 2) return '';
    const text = lines[lines.length - 1].textContent;
    return text.length > HEADLINE_MAX ? '' : text;
  };

  const apply = () => {
    let run = 0;
    for (const card of document.querySelectorAll(CARD)) {
      const matched = lioHeadlineNames(headline(card), patterns);
      const hide = matched && run < MAX_HIDDEN_RUN;
      card.toggleAttribute(HIDE, hide);
      card.toggleAttribute(KEEP, matched && !hide);
      run = hide ? run + 1 : 0;
    }
  };

  const touchesGrow = ({ target, addedNodes }) => !!target.closest?.(SCREEN) || [...addedNodes].some(n =>
    n.nodeType === Node.ELEMENT_NODE && (n.matches(SCREEN) || !!n.querySelector(SCREEN)));
  const observer = new MutationObserver(records => { if (records.some(touchesGrow)) apply(); });

  const sync = () => {
    if (enabled && patterns.length) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
      apply();
    } else {
      observer.disconnect();
      document.querySelectorAll(`[${HIDE}], [${KEEP}]`).forEach(card => { card.removeAttribute(HIDE); card.removeAttribute(KEEP); });
    }
  };

  const load = async () => {
    try {
      const stored = await chrome.storage.local.get({ [LIO_COMPANIES_KEY]: [] });
      patterns = lioCompanyPatterns(lioCleanCompanies(stored[LIO_COMPANIES_KEY]));
      sync();
    } catch (e) {}
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (enabled && area === 'local' && changes[LIO_COMPANIES_KEY]) load();
  });

  return on => {
    if (on === enabled) return;
    enabled = on;
    if (on) load();
    else sync();
  };
}
