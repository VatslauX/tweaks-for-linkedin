// POC: filters Home feed posts by the author's connection degree. It compares only short header paragraphs, in memory,
// and keeps only marker attributes. English labels only.

const LIO_DEGREE_SWITCHES = ['show1st', 'show2nd', 'show3rd', 'showOther'];
const LIO_DEGREE_LABEL = /^[•·]?\s*(1st|2nd|3rd)\+?$/;
const LIO_DEGREE_LABEL_MAX = 12;

// The switch that controls this card. A card with no degree label belongs to showOther.
function lioDegreeSwitch(card) {
  for (const p of [...card.querySelectorAll('p')].slice(0, 6)) {
    const text = p.textContent;
    if (text.length > LIO_DEGREE_LABEL_MAX * 4) continue;
    const label = text.trim().replace(/\s+/g, ' ');
    if (label.length > LIO_DEGREE_LABEL_MAX) continue;
    const match = label.match(LIO_DEGREE_LABEL);
    if (match) return `show${match[1]}`;
  }
  return 'showOther';
}

// Returns a function that takes the switches currently off. Hidden cards take no height, so a long hidden run would
// make LinkedIn keep loading more posts. After MAX_HIDDEN_RUN, one filtered post stays visible, dimmed, as a stop.
function lioWatchDegree() {
  const HIDE = 'data-lio-degree-hide', KEEP = 'data-lio-degree-keep';
  const FEED = '[role="list"][componentkey^="container-update-list_mainFeed"]';
  const CARD = '[role="listitem"][componentkey^="update-card-focus"]';
  const MAX_HIDDEN_RUN = 10;
  let hidden = new Set();

  const apply = () => {
    let run = 0;
    for (const card of document.querySelectorAll(`${FEED} ${CARD}`)) {
      if (card.hasAttribute('data-lio-promoted')) {
        card.removeAttribute(HIDE);
        card.removeAttribute(KEEP);
        run++;
        continue;
      }
      const filtered = hidden.has(lioDegreeSwitch(card));
      const hide = filtered && run < MAX_HIDDEN_RUN;
      card.toggleAttribute(HIDE, hide);
      card.toggleAttribute(KEEP, filtered && !hide);
      run = hide ? run + 1 : 0;
    }
  };

  const touchesFeed = ({ target, addedNodes }) => !!target.closest?.(FEED) || [...addedNodes].some(n =>
    n.nodeType === Node.ELEMENT_NODE && (n.matches(FEED) || !!n.querySelector(FEED)));
  const observer = new MutationObserver(records => { if (records.some(touchesFeed)) apply(); });

  return keys => {
    hidden = new Set(keys);
    if (keys.length) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
      apply();
    } else {
      observer.disconnect();
      document.querySelectorAll(`[${HIDE}], [${KEEP}]`).forEach(card => {
        card.removeAttribute(HIDE);
        card.removeAttribute(KEEP);
      });
    }
  };
}
