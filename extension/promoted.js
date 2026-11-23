// Hides promoted posts in the Home feed. Their visible label is their only reliable hook, so this is the one place
// that compares page text. It checks a card's first few short paragraphs in memory and keeps only a marker attribute.

// LinkedIn's label in the EU languages it offers. Word list based on LinkedinSponsorBlock (MIT, Hogwai).
const LIO_PROMOTED_LABELS = new Set([
  'Promoted', // English
  'Anzeige', 'Gesponsert', // German
  'Post sponsorisé', 'Sponsorisé', 'Promu', 'Promues', // French
  'Promocionado', // Spanish
  'Promovida', 'Promovido', // Portuguese
  'Post sponsorizzato', 'Promosso', // Italian
  'Gepromoot', // Dutch
  'Treść promowana', 'Promowane', // Polish
  'Marknadsfört', // Swedish
  'Promoveret', // Danish
  'Mainostettu', // Finnish
  'Propagováno', 'Propagace', // Czech
  'Προωθημένη', // Greek
  'Kiemelt', // Hungarian
  'Promovat' // Romanian
]);

// Labels followed by the sponsor's name, which may be in a separate element.
const LIO_PROMOTED_PREFIXES = ['Promoted by ', 'Gesponsert von ', 'Sponsorisé par ', 'Promu par ', 'Promu(e) par ',
  'Sponsorisé • Partenariat avec ', 'Promu • Partenariat avec ', 'Promosso da '];

const LIO_LABEL_MAX = 80;
const LIO_PROMOTED_MARK = 'data-lio-promoted';

// How many promoted posts are blocked on the page right now.
function lioPromotedCount() {
  return document.querySelectorAll(`[${LIO_PROMOTED_MARK}]`).length;
}

function lioIsPromotedLabel(text) {
  if (text.length > LIO_LABEL_MAX) return false;
  const label = text.trim().replace(/\s+/g, ' ');
  return LIO_PROMOTED_LABELS.has(label) || LIO_PROMOTED_PREFIXES.some(p => label === p.trim() || label.startsWith(p));
}

// Returns a switch. While on, it marks promoted cards as LinkedIn adds them. MutationObserver callbacks run before
// the browser paints, so a marked card is never shown. `styles/home.css` does the hiding.
function lioWatchPromoted() {
  const MARK = LIO_PROMOTED_MARK;
  const FEED = '[role="list"][componentkey^="container-update-list_mainFeed"]';
  const CARD = '[role="listitem"][componentkey^="update-card-focus"]';
  // The label is in the card's header, so a post's own text further down is never compared.
  const HEADER_PARAGRAPHS = 6;

  const check = card => {
    if (!card.closest(FEED)) return;
    const paragraphs = [...card.querySelectorAll('p')].slice(0, HEADER_PARAGRAPHS);
    card.toggleAttribute(MARK, paragraphs.some(p => lioIsPromotedLabel(p.textContent)));
  };

  const observer = new MutationObserver(records => {
    const cards = new Set();
    for (const { target, addedNodes } of records) {
      const parent = target.closest?.(CARD);
      if (parent) cards.add(parent);
      for (const node of addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches(CARD)) cards.add(node);
        node.querySelectorAll(CARD).forEach(c => cards.add(c));
      }
    }
    cards.forEach(check);
  });

  let on = false;
  return enabled => {
    if (enabled === on) return;
    on = enabled;
    if (on) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.querySelectorAll(CARD).forEach(check);
    } else {
      observer.disconnect();
      document.querySelectorAll(`[${MARK}]`).forEach(c => c.removeAttribute(MARK));
    }
  };
}
