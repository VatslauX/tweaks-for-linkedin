# Privacy Policy: Tweaks for LinkedIn (unofficial)

_Last updated: 23 November 2026_

Tweaks for LinkedIn is an unofficial browser extension that changes how `www.linkedin.com` looks. It is not affiliated with LinkedIn.

## Summary

The extension does not collect, sell, or share your data. It has no server, analytics, or remote code, and it makes no network requests. Nothing is sent to the developer.

## What the extension reads

The extension compares a small amount of text that LinkedIn has already shown on the page. Each comparison happens in memory, and the only result is a marker attribute on the card. The text is never stored, logged, or sent anywhere.

| Text | When | Why |
|---|---|---|
| The first six paragraphs of a Home feed card, up to 80 characters each | While **Block promoted** is on | To find the "Promoted" label |
| The first six paragraphs of a Home feed card, up to 12 characters each after trimming | While any connection filter is hiding posts | To find the `1st`, `2nd`, or `3rd+` label |
| The headline on a Network Grow suggestion card, up to 300 characters | While **Hide people at my company** is on and you have entered a company name | To compare it with your company names |

## What the extension stores

| Data | Where |
|---|---|
| Your on/off switches | Chrome's `storage.sync`, which Chrome may sync to your own Google account |
| The company names you type | Chrome's `storage.local`, in this browser profile only |

Removing the extension deletes its saved settings and company names from this browser.

## What LinkedIn can see

The extension adds `data-lio-*` attributes to LinkedIn's page, and LinkedIn's scripts can read them. They show the current tab, which tweaks are switched off, and which cards were marked. Your company names are never written to the page. LinkedIn can also notice hidden blocks, changed widths, and promoted posts that were never viewed.

## What the extension does not do

- It does not click, submit, follow, like, or post anything on LinkedIn.
- It does not load profiles or request extra data from LinkedIn.
- It does not read your messages.
- It does not run on any other website.

The **Feedback or report a problem** link only opens a form on GitHub in a new tab, with the extension version, Chrome version, and language filled in. Nothing is sent unless you submit that form yourself, and issues on GitHub are public.

## Permissions

- **storage**: to save your settings and company names.
- **Access to `https://www.linkedin.com/*`** (through content scripts): to apply the tweaks.

The toolbar popup can ask the active tab for the number of blocked posts. The reply is only a number.

A small background script turns the toolbar icon blue on LinkedIn tabs. It receives only a signal that the extension is running on that tab, and it reads no page content or saved settings.

## Changes

If this policy changes, the new version will be published in this repository with a new "Last updated" date.

## Contact

Open an issue in this repository. Please do not include LinkedIn HTML, screenshots with real people, or other personal data.
