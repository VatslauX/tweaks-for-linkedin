---
paths:
  - "extension/**/*"
  - "tests/unit/**/*.test.js"
---

# Extension security

Do not loosen these. `tests/unit/static.test.js` checks them.

- The only permission is `storage`. Do not add `host_permissions`, optional permissions, `web_accessible_resources`, `externally_connectable`, or a background worker.
- Content scripts match only `https://www.linkedin.com/*`, in the top frame and the isolated world. The top-frame script may add one `<style>` to LinkedIn's same-origin `/preload/` Messaging frame. It must not read that frame's content.
- No `eval`, `new Function`, remote code, injected `<script>`, `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, or `postMessage`. The extension sends nothing anywhere.
- No `console.log`, `console.info`, or `console.debug`. Never read, store, or log profile, feed, or message content.
- Approved exception: `promoted.js` may compare the first six paragraphs of a Home feed card, up to 80 characters each, with its list of "Promoted" labels. The comparison stays in memory, and the only result is a marker attribute on the card. Do not widen it.
- Approved POC exception: `degree.js` may compare the first six paragraphs of a Home feed card, up to 12 characters after trimming, with the labels `1st`, `2nd`, and `3rd+`. The comparison stays in memory, and the only result is a marker attribute on the card. Do not widen it.
- Approved POC exception: `company.js` may compare the headline of a suggestion card on the Network Grow page, meaning the last paragraph inside the card's profile link and at most 300 characters, with the company names the user typed in the popup. The comparison stays in memory, and the only result is a marker attribute on the card. The names stay in `chrome.storage.local` and are never written to the page. Do not widen it.
- The popup may ask the active tab for the blocked count with `chrome.tabs.query` and `chrome.tabs.sendMessage`, which need no permission. The content script replies only to its own extension, and only with a number or `null`.
- No `innerHTML`, `insertAdjacentHTML`, `setHTMLUnsafe`, or `document.write`.
- The extension only changes how the page looks. It never clicks, submits, follows, likes, or posts anything on LinkedIn.
- Source in `extension/` is English only, except the label list in `promoted.js`. Keep `minimum_chrome_version` at 111 or higher.
