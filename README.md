# Tweaks for LinkedIn (unofficial)

A small Chrome extension with tweaks for LinkedIn. It hides clutter, filters what you see, and gives each tab a wider, consistent layout.

> **Unofficial.** Not affiliated with, endorsed by, or supported by LinkedIn. LinkedIn is a trademark of LinkedIn Corporation.

## Read this before installing

**Using this extension can put your LinkedIn account at risk.**

- LinkedIn's [User Agreement](https://www.linkedin.com/legal/user-agreement) forbids overlaying or modifying the service or its appearance, and names removing or obscuring ads as an example. Its [help page on prohibited software](https://www.linkedin.com/help/linkedin/answer/a1341387) says browser extensions that change its appearance are not allowed.
- LinkedIn can restrict or close accounts that break these rules. **This applies to every tweak here**, not only ad blocking.
- **The extension is not hidden from LinkedIn.** It adds `data-lio-*` attributes to the page, and the layout changes are visible to LinkedIn's scripts. This project will not add stealth techniques or fake ad views.
- You use it at your own risk. This is not legal advice.

## Features

Every tweak has a switch in the toolbar popup and applies right away.

**Everywhere**

- Hide the promoted banner, footer links, Today's puzzles, Premium promos, and the floating Messaging bar.
- Use the same content width on Network, Jobs, Messaging, and Notifications.

**Home**

- **Block promoted** (off by default): hides promoted posts and shows how many were blocked on the page.
- **Filter by connection**: show or hide posts from 1st, 2nd, and 3rd+ connections, and from everyone else.
- Hide *Add to your feed* and widen the feed.

**Network**

- **Hide people at my company**: type one or more company names in the popup, and suggestions whose headline names one are hidden. The names stay in your browser.

Filters keep one dimmed card after every 10 hidden in a row, so LinkedIn doesn't keep loading more content.

## Install

The extension is not in the Chrome Web Store. It needs Chrome 111 or newer.

1. Download the ZIP from the [latest release](https://github.com/VatslauX/tweaks-for-linkedin/releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.
4. Pin the extension and click its icon to change the tweaks.

## Privacy

The extension has no server, analytics, or network requests. Its only permission is `storage`, and it runs only on `https://www.linkedin.com/*`. To apply three filters, it compares a small amount of text already on the page, in memory only. [PRIVACY.md](PRIVACY.md) lists exactly what it reads and stores.

## Known limitations

- LinkedIn changes its pages often, so any tweak can stop working without notice.
- Layouts were measured on real LinkedIn only at a window about 1018 px wide.
- Only the English "Promoted" label was seen on real LinkedIn. The labels for other languages come from another project and are untested.
- The connection filter recognizes English labels only, and its handling of reposts is unverified.
- The company filter works only when a headline names the company, so some colleagues stay visible. Similar names can match, such as "Acme Partners" for "Acme". Past-job wording such as "ex-" and "former" is recognized in English only.
- The company filter has not been checked against invitation cards. If they share the suggestion layout, an invitation from a colleague could be hidden.
- With Block promoted on, a promoted post can show briefly until the saved setting loads.
- Some promoted labels can have another meaning, such as Hungarian "Kiemelt" ("Featured"), so a normal post could be hidden.
- Opening a chat from a profile while the floating Messaging bar is hidden was tested only on a mock page.
- Promoted jobs, "For Business", "Advertise", and "Post a free job" are not hidden.

## Development

The extension is plain JavaScript and CSS, with no compile step or runtime dependencies. To run it from source, load the `extension` folder with **Load unpacked**.

```sh
npm ci
npx playwright install chromium
npm test
npm run build   # creates the release ZIP in dist/
```

Tests run against synthetic mock pages. Never add real LinkedIn HTML or screenshots to this repository, because they contain personal data.

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for third-party credits.
