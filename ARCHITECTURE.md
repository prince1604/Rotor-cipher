# Rotor — Architecture

Plain ES modules. No bundler. Chrome loads files as written.

```
J:\app\
  manifest.json              MV3, side panel, context menus
  PRO.md ARCHITECTURE.md RULES.md DESIGN.md TASKS.md MEMORY.md
  README.md
  html/
    panel.html               the only UI (side panel)
  css/
    panel.css                tokens + layout from DESIGN.md
  js/
    panel.js                 UI, routing, clipboard, file drop
    registry.js              ALGORITHM_GROUPS — the catalogue
    selftest.js              vectors + runner
    engines/
      bytes.js               TextEncoder/Decoder, concat, hex, utf8
      encodings.js           Base64/32/58, ASCII85, hex, bin, oct, url, html, qp, uu, morse, nato, unicode, utf8, jwt
      classical.js           Caesar family, Vigenère family, Playfair, rail, columnar, Bacon, Polybius, XOR, Enigma
      hashes.js              MD5, SHA-1/2, HMAC, CRC-32, PBKDF2 (via Subtle or portable)
      modern.js              AES-GCM/CBC envelope, RSA-OAEP, ECDSA P-256, TOTP
      generate.js            passwords, phrases, UUID, keys, RSA PEM
  icons/
    icon16.png icon48.png icon128.png
```

## Runtime

```
[Chrome action]
      │
      ▼
[background service worker]  ── opens side panel
      │                        ── contextMenus
      │                        ── chrome.storage.session: selected text (not keys)
      ▼
[side panel: panel.html]
      │
      ├── panel.js        reads registry, binds UI, calls engine
      ├── registry.js     { id, group, label, mode, run, fields }
      └── engines/*.js    pure functions. No DOM. No chrome.*
```

`panel.js` never implements an algorithm. Engines never touch the DOM.

## Algorithm record

Every entry in `registry.js` looks like this:

```js
{
  id: "aes-gcm",                 // kebab, unique
  group: "modern",               // encodings | classical | hashes | modern | generate
  label: "AES-GCM",
  hint: "Password → PBKDF2 → AES-GCM. Authenticated.",
  modes: ["encrypt", "decrypt"], // subset of encode|decode|encrypt|decrypt|hash|sign|verify|generate
  warn: "kdf",                   // optional: unsafe | historic | kdf | unauthenticated | jwt
  fields: [                      // extra inputs, in order
    { name: "password", type: "password", label: "Password", required: true }
  ],
  run: (ctx) => engines.modern.aesGcm(ctx)
}
```

`ctx` is always:

```js
{
  mode,            // current mode
  text,            // string from the input tape
  bytes,           // Uint8Array of the same (UTF-8), for binary-aware ops
  file,            // File | null
  fields,          // { [name]: string }
  signal           // AbortSignal for long jobs
}
```

`run` returns `{ text, bytes?, meta? }` or throws `RotorError(code, message)`.

`RotorError` codes: `bad-input`, `bad-key`, `auth-fail`, `unsupported`, `cancelled`.

## Mode rules

| Group | Allowed modes | Live? |
|---|---|---|
| encodings | encode, decode | yes |
| classical | encode, decode (we do not call it encrypt) | yes |
| hashes | hash | yes for text; files wait for click |
| modern AES/RSA | encrypt, decrypt | **no** — Run button |
| modern ECDSA | sign, verify | **no** |
| TOTP | generate | ticks every 1s, compute on tick |
| generate | generate | Run (or live for UUID/password with a Generate again control) |

Live = 80ms debounce on input. Password KDFs, RSA, and anything > 256 KiB of text never go live.

## AES-GCM envelope

Do not invent a new format. This is the only supported ciphertext:

```
rotor1.<b64url(salt 16)>.<b64url(iv 12)>.<b64url(ciphertext||tag)>
```

- KDF: PBKDF2-SHA-256, 210_000 iterations, 256-bit key, salt 16 random bytes.
- AES-GCM, 12-byte IV, 128-bit tag.
- Version prefix `rotor1` so a future `rotor2` can bump the KDF without guessing.

AES-CBC uses `rotor1cbc.` and **must** show the unauthenticated warning. Same KDF, 16-byte IV, PKCS#7.

## Crypto boundaries

| Operation | Implementation |
|---|---|
| SHA-256/384/512, HMAC, PBKDF2, AES-GCM, AES-CBC, RSA-OAEP, ECDSA, random | `crypto.subtle` / `crypto.getRandomValues` |
| SHA-1 | `crypto.subtle` (available in Chromium) |
| MD5, CRC-32, Base58, Enigma, classical | portable JS in `engines/` |
| RSA PEM parse/serialize | portable JS wrapping `crypto.subtle.importKey` / `exportKey` |

If Subtle Crypto can do it, Subtle Crypto **must** do it.

## Background worker

`js/background.js` (classic service worker, importScripts of nothing heavy):

- `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
- context menu ids: `rotor.open`, `rotor.sha256`, `rotor.b64`
- on click: write `{ text, prefer }` to `chrome.storage.session` and open the panel
- panel reads once, then **clears** the session key

Never persist passwords, PEM, or envelopes.

## CSP

`manifest.json`:

```
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none'; connect-src 'none'"
}
```

`connect-src 'none'` is the tripwire. If someone adds a CDN, the extension will not load it.

## Adding an algorithm (10-minute path)

1. Implement a pure function in the right `engines/*.js`.
2. Export it.
3. Register it in `registry.js` with `id`, `group`, `modes`, `fields`, `run`.
4. Add a vector in `js/selftest.js`.
5. Reload the unpacked extension. Open Self-test. It must go green.

No CSS change unless the algorithm needs a new field type (then add the type in `panel.js` and document it in DESIGN.md).

## Field types the panel already understands

`text`, `password`, `number`, `select`, `toggle`, `textarea` (for PEM).

Unknown types render as `text`. Do not invent `file` as a field — files are always the global drop zone.

## Testing

Open the Self-test strip at the bottom of the panel. `selftest.js` runs every vector in the page, not in a worker, so failures are visible. Vectors are tiny (under 1 KiB each) so the panel stays snappy.

There is no Node test runner in v1. Do not add one unless TASKS.md says so.
