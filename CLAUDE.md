# CLAUDE.md

Project guidance for Claude Code working in this repository.

## Project

Tweaks for LinkedIn is an unofficial Manifest V3 Chrome extension with tweaks for each LinkedIn tab (Home, Network, Jobs, Messaging, Notifications), built on one shared tweak registry. It is plain JavaScript and CSS with no runtime dependencies or bundler; only `extension/` is loaded into Chrome. Keep the source directly runnable. Do not add a compile or bundling step, TypeScript source, or framework; `npm run build` only zips `extension/` for a release. It is not published to the Chrome Web Store.

## Common commands

```sh
npm test            # lint, unit, integration, e2e
npm run lint
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build       # dist/tweaks-for-linkedin-<version>.zip
```

## Shell command scope

- Run shell commands with the repository as the working directory, using repository-relative paths.
- Avoid heredocs, `node -` stdin scripts, `eval`, and encoded shell code. Use the file editing tools, then run the relevant npm script.

## Project map

- `extension/`: the extension. Architecture and security requirements are in `.claude/rules/extension-architecture.md` and `.claude/rules/extension-security.md`.
- `tests/unit/`: settings logic and static checks for the manifest and source safety.
- `tests/integration/`: the real content scripts in JSDOM with fake storage, navigation, and a virtual clock, for logic across inputs, tabs, failures, and time. JSDOM has no stylesheets or layout, so hiding, widths, and paint stay in e2e. To prove a test fails, point `LIO_EXTENSION_DIR` at a scratch copy of `extension/`.
- `tests/e2e/`, `tests/fixtures/`: the real extension in Chromium against a mocked `www.linkedin.com`. The fixture is synthetic. Never save live LinkedIn HTML into the repository, because it holds personal data.
