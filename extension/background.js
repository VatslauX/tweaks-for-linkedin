// Turns the toolbar icon blue on a tab where the extension is running on LinkedIn. It is grey everywhere else.
// Chrome clears these per-tab values when the tab navigates away. This worker reads no page content or storage.
const ACTIVE_MESSAGE = 'lio-active-tab';
const ACTIVE_TITLE = 'Tweaks for LinkedIn: active on this tab';
const BLUE_ICON = { 16: 'icons/icon16.png', 32: 'icons/icon32.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' };

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== chrome.runtime.id || message?.type !== ACTIVE_MESSAGE) return;
  if (sender.frameId !== 0 || sender.origin !== 'https://www.linkedin.com' || !sender.tab?.id) return;
  const tabId = sender.tab.id;
  chrome.action.setIcon({ tabId, path: BLUE_ICON }).catch(() => {});
  chrome.action.setTitle({ tabId, title: ACTIVE_TITLE }).catch(() => {});
});
