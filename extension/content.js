// Publishes the settings and the current LinkedIn tab on <html> for the stylesheets, which do all the hiding.
(() => {
  const OFF = 'data-lio-off', TAB = 'data-lio-tab';
  const root = document.documentElement;
  let off = lioOff(lioSettings);
  let tab = lioTabFor(location.pathname);

  // The floating Messaging bar is in an open shadow root that stylesheets can't reach.
  // Only the bar is hidden, so a conversation opened from a profile's Message button still shows.
  const BAR_CSS = '#msg-overlay > .msg-overlay-list-bubble { display: none !important; }';
  const barStyle = document.createElement('style');
  const syncBar = () => {
    const css = off.split(' ').includes('chatbar') ? '' : BAR_CSS;
    if (barStyle.textContent !== css) barStyle.textContent = css;
    const shadow = document.getElementById('interop-outlet')?.shadowRoot;
    if (shadow && barStyle.parentNode !== shadow) shadow.append(barStyle);
  };

  // After an in-app click, LinkedIn shows Messaging inside this same-origin frame, where the manifest's stylesheets
  // and scripts don't run. One style there carries the Messaging rules, which mirror everywhere.css.
  const HIDE = '{ display: none !important; }';
  const FRAME_RULES = {
    ad: `#messaging aside > section:has(> iframe) ${HIDE}`,
    footer: `#messaging aside > footer:has(a[href*="about.linkedin.com"]) ${HIDE}`,
    chatbar: BAR_CSS,
    wide: `#messaging div:has(> main + aside) > aside ${HIDE}
      #messaging div:has(> main + aside) { grid-template-columns: minmax(0, 1fr) !important; grid-template-areas: "main" !important; }`
  };
  const frameStyle = document.createElement('style');
  let frame = null;
  const findFrame = () => {
    if (frame?.isConnected) return false;
    frame = document.querySelector('iframe[src*="/preload/"]');
    frame?.addEventListener('load', syncFrame);
    return !!frame;
  };
  function syncFrame() {
    findFrame();
    const inactive = off.split(' ');
    const css = Object.keys(FRAME_RULES).filter(k => !inactive.includes(k)).map(k => FRAME_RULES[k]).join('\n');
    if (frameStyle.textContent !== css) frameStyle.textContent = css;
    const head = frame?.contentDocument?.head;
    if (head && frameStyle.parentNode !== head) head.append(frameStyle);
  }

  const setPromotedWatch = lioWatchPromoted();
  const promotedOn = () => !off.split(' ').includes('promoted');

  // Created after the promoted watcher, so promoted cards are already marked when this runs.
  const setDegreeFilter = lioWatchDegree();
  const degreesOff = () => (lioAlive() ? LIO_DEGREE_SWITCHES.filter(k => off.split(' ').includes(k)) : []);

  const setCompanyFilter = lioWatchCompany();
  const companyOn = () => lioAlive() && tab === 'network' && !off.split(' ').includes('hideCompany');

  const write = () => {
    if (root.getAttribute(OFF) !== off) root.setAttribute(OFF, off);
    if (!tab) root.removeAttribute(TAB);
    else if (root.getAttribute(TAB) !== tab) root.setAttribute(TAB, tab);
    syncBar();
    syncFrame();
    setPromotedWatch(promotedOn());
    setDegreeFilter(degreesOff());
    setCompanyFilter(companyOn());
  };

  // Blue toolbar icon on this tab. Runs again when the page returns from the back/forward cache.
  const markActive = () => {
    try { chrome.runtime.sendMessage({ type: LIO_ACTIVE_MESSAGE })?.catch(() => {}); } catch (e) {}
  };
  markActive();
  window.addEventListener('pageshow', markActive);

  // The popup's counter. The reply is only a number, or null when this page isn't blocking promoted posts.
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id || message?.type !== LIO_COUNT_MESSAGE) return;
    reply(tab === 'home' && promotedOn() ? lioPromotedCount() : null);
  });

  // Catch the bar's host as soon as LinkedIn adds it. The interval below covers a later replacement.
  const barFinder = new MutationObserver(() => {
    syncBar();
    if (barStyle.isConnected) barFinder.disconnect();
  });
  barFinder.observe(root, { childList: true, subtree: true });

  // Style the Messaging frame as soon as LinkedIn adds or replaces it, before it is shown.
  const frameFinder = new MutationObserver(() => { if (findFrame()) syncFrame(); });
  frameFinder.observe(root, { childList: true, subtree: true });

  // LinkedIn may rewrite <html> attributes; without these the page would fall back to every tweak on.
  new MutationObserver(write).observe(root, { attributes: true, attributeFilter: [OFF, TAB] });
  lioOnSettings(s => { off = lioOff(s); write(); });

  // Moving between LinkedIn tabs doesn't reload the page.
  window.navigation?.addEventListener('currententrychange', () => {
    tab = lioTabFor(location.pathname);
    write();
  });

  // Extension disabled, removed or updated: give the page back.
  const watch = setInterval(() => {
    if (lioAlive()) { syncBar(); syncFrame(); return; }
    clearInterval(watch);
    barFinder.disconnect();
    frameFinder.disconnect();
    off = LIO_TWEAKS.map(t => t.key).join(' ');
    write();
  }, 2000);
})();
