# Security Policy

## Supported versions

Only the latest release receives security fixes. Before the first release, that means the `main` branch.

## Reporting a vulnerability

Please report vulnerabilities privately through this repository's **Security** tab, using **Report a vulnerability**. Do not open a public issue.

Include the affected version, the steps to reproduce the problem, and its impact. Do not include real LinkedIn HTML, session cookies, screenshots of real people, or other personal data. Use a minimal synthetic page if you need to show the problem.

This is a volunteer project, so responses are best effort. Accepted reports are fixed in a new release and noted in the [changelog](CHANGELOG.md).

## In scope

- The extension reading, storing, or exposing more page data than [PRIVACY.md](PRIVACY.md) describes.
- Anything that makes the extension send data off the device, run remote code, or act on LinkedIn for the user.
- A LinkedIn page or another website being able to read your stored company names or change your settings.

## Out of scope

- LinkedIn detecting the extension. It is not designed to be hidden.
- Account restrictions under LinkedIn's terms. See the risk notice in the [README](README.md).
- Vulnerabilities in LinkedIn itself. Report those to LinkedIn.
