---
paths:
  - "extension/**/*"
  - "tests/**/*"
---

# Extension architecture

- **CSS does the work.** `styles/*.css` use `:has()` on LinkedIn's stable hooks, so they keep applying through re-renders and in-app navigation with no rerun loop. Prefer a CSS rule over DOM scripting for any new block.
- **Registry.** `LIO_TABS` and `LIO_TWEAKS` in `flags.js` are the single list of tabs and switches. Settings defaults and the popup are built from them; a tab with no tweaks gets no popup section. Tweak keys are stored settings, so do not rename them.
- **Inverted flags.** A tweak applies unless `<html data-lio-off>` lists it, so nothing flashes before settings load. `lioOff` lists every tweak that is switched off or blocked by its `needs`, and `content.js` writes it. Hiding and layout tweaks work the same way. Block promoted is the one opt-in tweak (`on: false`), so once enabled, a promoted post can show briefly until the stored setting loads.
- **Current tab.** `content.js` writes `<html data-lio-tab>` (`home`, `network`, `jobs`, `messaging`, `notifications`, or absent) and updates it on in-app navigation, because moving between LinkedIn tabs does not reload the page. Scope a rule with it only when its hook is not unique to that tab: the attribute changes slightly before LinkedIn swaps the page, so tab-scoped rules can flash during the switch.
- **Settings.** `chrome.storage.sync`, except the Network filter's company names, which stay in `chrome.storage.local`; `lioSanitize` maps malformed values to defaults; `lioOnSettings(fn)` runs now and on changes. `flags.js` is also loaded by the popup (`options.html`). A failed read keeps the last good settings and retries. If the extension is disabled or updated, `content.js` shows everything again.
- **Toolbar icon.** The manifest's default icon is grey. `content.js` messages `background.js` on load and on `pageshow`, and the worker sets the blue icon and an "active" title for that tab. Chrome clears both when the tab leaves LinkedIn.

## Adding a tweak

1. Add an entry to `LIO_TWEAKS` (`key`, `tab`, `label`, `on`, and `needs` if it only works while other tweaks are on).
2. Add its rule to `styles/everywhere.css` if it works across tabs, otherwise to `styles/<tab>.css`, and list a new file in the manifest. Use `html:not([data-lio-off~="<key>"])`.
3. Add the block to the matching synthetic fixture and cover it in `tests/e2e`.

## LinkedIn page structure (seen live 2026-11-23)

Class names are hashed and change: never use them. Use language-independent hooks, not visible text. The one exception is promoted posts, below.

- **Promoted posts:** `[role=list][componentkey^="container-update-list_mainFeed"] > [data-lazy-mount-id] (display: contents, one card each) ... [role=listitem][componentkey^="update-card-focus"]`. No attribute or structure separates them from normal posts, and they arrive in the same responses, so `promoted.js` matches the visible label in the card header (seen as the 3rd or 4th paragraph). It marks the card before paint and `home.css` hides the wrapper. Only the English label was seen live; the other EU labels come from LinkedinSponsorBlock. The popup's counter is the number of marked cards on the page, polled once a second while the popup is open.

- **Home:** three columns. `grid > aside (left) + section (feed) + aside (right)`.
- **Network, Jobs:** two columns on the same 24-column grid as Home. `aside (1/8, 304px) + section (9/-1, 632px)`, with the ad and footer in the side column's sticky block. The `wide` tweak moves them to Home's `1/7 + 7/-1` (222px + 714px). It was measured live only at a 1018px window, so the rule starts at 1000px.
- **Floating Messaging bar:** `#msg-overlay > .msg-overlay-list-bubble`. The class is readable, not hashed. On the Messaging tab it is in the page and `everywhere.css` hides it. On other tabs it is inside the open shadow root of `#interop-outlet`, so `content.js` adds one `<style>` there. That host also holds LinkedIn's modals and open conversations: never hide the host or `#msg-overlay`.
- **Premium:** links to `/premium/products`. A card in Home's left column and a card between Jobs listings.
- **Messaging:** older layout. `#messaging grid > main + aside > (section > iframe) + footer`. The ad iframe has no `componentkey`. On a direct load it is in the top page. After an in-app click it is inside a full-page, same-origin `iframe[src*="/preload/"]`, which LinkedIn keeps hidden on other tabs. Manifest CSS and scripts do not run there, so `content.js` keeps one `<style>` in that frame with the same Messaging rules. Change both places together. Opening Messaging can mark a conversation as read, so check for an unread badge first and read structure only.
- **Notifications:** three columns like Home. Its ad key is `NotificationDesktopNav_notifications_ad`. With the ad and footer hidden, the right column stays as empty space. Opening it can clear the badge.
- **Network Grow suggestions:** `[data-sdui-screen$="mynetwork.Grow"] [role=list] > [data-display-contents] (display: contents) > [role=listitem]`. The list item's `componentkey` is a random `auto-component-<uuid>`, so do not use it. The profile link holds two paragraphs, name then headline, and a third paragraph outside the link holds mutual connections. `company.js` reads only the headline. No invitation cards were on the page when this was inspected, so whether they share this structure is unverified.
- **Puzzles on Network:** a card in the main column, `section > div > div > a[href*="/games/"]`. The main column is also a `section`, so the rule is depth-fixed and scoped to the Network tab.

```
Home right aside > column > top group  > puzzles   (#feedRightNavGamesComponentRef)
                                       > follow    (a[href*="/mynetwork/discover-hub"], display: contents)
                          > sticky > inner > ad, footer
```

- **Ad slot:** `iframe[componentkey*="DesktopNav_"][componentkey$="_ad"]`, for example `MainFeedDesktopNav_feed_ad` and `MynetworkDesktopNav_mynetwork_desktop_nav_ad`. It showed "See who's hiring" but can carry other promos, so the setting is "Hide promoted banner". Jobs had no ad slot when inspected.
- **Site footer:** the `<footer>` holding an `about.linkedin.com` link. The ad block has its own nested `<footer>` inside a `<form>`, and cards may have footers too. Network and Jobs add a one-child wrapper around it, which the rule also hides.
- Widening changes only `grid-column-end`, so the feed keeps LinkedIn's start column at each breakpoint.
- Known tradeoff: while the feed is widened the whole right column is hidden, including any block LinkedIn adds there later.
- `:has()` cannot be nested, which is why the feed rule starts from the grid (`div:has(> aside #hook) > section`).
