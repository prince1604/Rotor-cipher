# EXPLAIN.md: Rotor Cipher Workbench

**Rotor** is an offline, privacy-focused cipher workbench designed for Chrome. It transforms text and files locally using industry-standard Web Crypto and portable JavaScript implementations.

---

## Architecture Overview

Rotor follows a modular, non-bundled architecture suitable for immediate loading in Chrome via Developer Mode.

```text
J:\app\
  ├── manifest.json      MV3, side panel configuration, restrictive CSP
  ├── index.html         Root landing/workbench
  ├── html/panel.html    Side panel UI
  ├── css/panel.css      Token-based design system (Dark/Light)
  ├── js/panel.js        UI controller, event handling, storage
  ├── js/registry.js     Algorithm catalogue / registration
  ├── js/selftest.js     Contract-based vector validation
  └── js/engines/        Pure functions (no DOM/Chrome access)
       ├── bytes.js      Shared types & crypto-safe helpers
       ├── encodings.js  BaseX, Morse, NATO, etc.
       ├── classical.js  Historical ciphers (Enigma, etc.)
       ├── hashes.js     Portable & subtle digests
       └── modern.js     AES-GCM/CBC, RSA, ECDSA, TOTP
```

## Security Model

1. **Zero Network:** CSP `connect-src 'none';` forbids all external dependencies (CDNs, fonts, analytics).
2. **Local-Only:** Everything runs in the browser context via `crypto.subtle`.
3. **No Key Persistence:** Field inputs (passwords, PEMs) exist in volatile memory. `chrome.storage.sync` holds UI settings only.
4. **Resiliency:** Cryptographic engines are decoupled from the DOM. Engines cannot accidentally read inputs or overwrite UI—only the controller does this.

---

## Development Setup

### For Chrome Extension
1. `chrome://extensions` > Enable **Developer mode**.
2. **Load unpacked** > Select `J:\app` directory.

### For Workbench (Local web)
Open `index.html` directly in your browser or run a lightweight server:
```bash
python -m http.server 8000
# Then visit http://localhost:8000
```
*Note: The workbench safely falls back to `localStorage` when accessed outside the Chrome extension runtime.*

---

## Adding a New Cipher (10-Minute Path)

1. **Implement:** Add a pure function to the appropriate `engine/*.js` file. Do not touch the DOM.
2. **Register:** Add the algorithm to `js/registry.js` with its metadata:
   ```javascript
   {
     id: 'my-cipher',
     group: 'encodings', // | classical | hashes | modern
     label: 'My Cipher',
     modes: ['encode', 'decode'],
     run: engines.myFile.myFunction
   }
   ```
3. **Test:** Add an entry to `VECTORS` in `js/selftest.js`.
4. **Reload:** Refresh the panel. The diagnostics strip will immediately run all tests including your new one.

---

## Design Principles

- **Design System:** Use `panel.css` tokens (`--brass`, `--ink`, `--paper`). Do not create new classes with arbitrary colors.
- **Tone:** Technical, dry, reliable.
- **Branding:** All branding is centralized in the footer badge (`Strrechpixal Developers — 2026`).

---

## Troubleshooting

- **"Envelope lengths look wrong":** Often occurs during ciphertext deserialization if padding is miscalculated by the B64URL engine. Use `bytes.js` helpers for all transformations.
- **Fail Closed:** If a tamper test or tag check fails, throw a valid `RotorError` to prevent partial plaintext leaks.
- **Localhost vs Extension:** If storage behaves differently, check `panel.js` storage wrapper fallbacks.
