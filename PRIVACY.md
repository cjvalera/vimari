# Vimkit Privacy Policy

**Last updated: 29 August 2026**

Vimkit does not collect, transmit, sell, or share any personal data. There is no
analytics, no telemetry, no advertising SDK, and no account system. Vimkit makes
no network requests of its own.

## What Vimkit stores

| Data | Where it is stored | Why |
|---|---|---|
| Your keybindings and settings JSON | `browser.storage.local`, on your Mac | So your configuration survives restarts |
| The current tab's recent-activation and recently-closed list | `browser.storage.session` (falling back to `browser.storage.local`), on your Mac | To support "previous tab" and "reopen closed tab" |

Both are Safari extension storage areas on your own machine. Vimkit does not use
`browser.storage.sync`, so nothing is copied to iCloud or to any other device or
server. Removing the extension removes this data.

## Why Vimkit asks for access to all websites

Vimkit is a keyboard navigation tool. To let you scroll, follow links, and open
link hints with the keyboard, its content script has to run on the page you are
reading — which means it requests access to all websites (`<all_urls>`) and the
`tabs` permission for tab switching and reordering.

Vimkit reads page content only to find the links and form fields it can move the
keyboard focus to, and it does this in your browser, in the moment, to draw the
hint labels. Page content is never stored, logged, or transmitted anywhere.

You can restrict Vimkit to specific sites at any time in Safari's Settings →
Extensions pane.

## Clipboard

When you use a copy command (for example, copying the current page's URL or a
link's URL), Vimkit writes that value to your system clipboard. It never reads
your clipboard and never sends clipboard contents anywhere.

## Children

Vimkit is not directed at children and collects no data from anyone, including
children under 13.

## Changes

Any change to this policy will be published in this file in the Vimkit
repository, with an updated date above.

## Contact

Questions about privacy in Vimkit: open an issue at
<https://github.com/cjvalera/vimkit/issues>.
