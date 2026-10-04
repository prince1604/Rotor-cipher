# Rotor — Rules

Break these and the tool becomes a leak, a toy, or unmaintainable. Read once. Follow always.

## Security

1. **No network.** No `fetch`, `XMLHttpRequest`, WebSocket, Google Fonts, analytics, Sentry, update pings. CSP `connect-src 'none'` is the lock. Do not loosen it.
2. **No keys on disk.** `chrome.storage` may hold `{ lastAlgorithmId, theme }`. It may never hold passwords, PEM, TOTP secrets, or envelopes.
3. **Subtle Crypto for real crypto.** AES, RSA, ECDSA, SHA-2, HMAC, PBKDF2 go through `crypto.subtle`. Hand-rolled AES is a security bug, not a feature.
4. **Randomness.** Only `crypto.getRandomValues`. Never `Math.random` for keys, IVs, salts, UUIDs, passwords, TOTP secrets.
5. **Constant-ish compare** for MAC / GCM / signature verify. Use Subtle verify. If you must compare bytes in JS, XOR-accumulate; do not `===` on hex.
6. **Fail closed.** Auth tag mismatch → `RotorError('auth-fail')`. Do not return partial plaintext.
7. **Warn honestly.** MD5, SHA-1, CRC-32, every classical cipher, AES-CBC, JWT decode: show the `warn` chip. Never call ROT13 “encryption.”
8. **Passwords in memory.** Keep them in the field value. Do not log them. Do not put them in `meta` that gets copied with “copy all.”
9. **PBKDF2 iterations = 210_000.** Do not lower this to make the UI feel faster. Show a spinner instead.
10. **No eval, no `new Function`, no inline script, no `innerHTML` of user input.** Output goes into `textContent` or `value`.

## Correctness

11. **One vector minimum per algorithm.** `selftest.js` is the contract. A cipher without a vector is not shipped.
12. **UTF-8 everywhere.** `TextEncoder` / `TextDecoder`. Do not invent “binary strings” with `charCodeAt`.
13. **Base64 is RFC 4648.** Standard alphabet + padding by default. URL variant is a separate id (`base64url`).
14. **JWT decode does not verify.** The hint and the warn chip must say so. Never label a decoded JWT “valid.”
15. **Enigma is M3.** Rotors I–V, reflector B, plugboard, double-stepping. Document the ring/window convention in the engine comment. Do not claim naval M4.
16. **TOTP is RFC 6238.** SHA-1, 30s, 6 digits, Unix time. Secret is Base32. Test against RFC 6238 appendix B (`12345678901234567890` at 59s → `94287082` is 8 digits — we still ship 6-digit default and a digits field).
17. **Live vs Run.** If it uses a password, a private key, or more than 256 KiB, it is Run-only. No exceptions for “just this once.”

## Product

18. **Engines have no DOM.** `panel.js` has no algorithms. Cross the line and the next contributor will duplicate code.
19. **Plain files.** No npm, no bundler, no TypeScript, no React in v1. A vibe coder loads unpacked and edits.
20. **Do not restyle.** DESIGN.md owns color, type, spacing. New UI is tokens + existing classes.
21. **Do not add a permission** unless the feature is dead without it. v1: `sidePanel`, `contextMenus`, `storage` (session + sync for last-algorithm), `activeTab` is **not** needed, `scripting` is **not** needed, `<all_urls>` is **not** needed.
22. **Clipboard write** uses `navigator.clipboard.writeText`. If it fails, select the output and `document.execCommand('copy')` as fallback. Never a hidden textarea left in the DOM.
23. **Errors are RotorError.** User-facing text is short, specific, and tells them what to fix. “Error” alone is banned.
24. **File hashing** streams via `file.arrayBuffer()` for v1 (ok up to tens of MB). Do not hold two copies. Revoke object URLs.

## Code shape

25. **Named exports.** No default exports in engines.
26. **Ids are kebab-case** and stable. Renaming an id breaks last-algorithm restore.
27. **Comments** explain a convention (Enigma rings, envelope layout), not what the next line does.
28. **If you add a field type,** document it in ARCHITECTURE.md and DESIGN.md in the same change.
29. **Icons** are the only binary assets. No JPEG screenshots in the repo.

## Chrome / MV3

30. **Service worker stays tiny.** It opens the panel and writes a session payload. It does not import engines.
31. **Side panel is the app.** No extra popup HTML. The action opens the panel.
32. **Manifest `minimum_chrome_version`: 114** (side panel + `crypto.subtle` everywhere we need it).

## What you may not add “because it would be cool”

- A “send to friend” button.
- A history drawer of previous plaintexts.
- Auto-detect of cipher type (guessing is how people encrypt with the wrong key).
- A minify/obfuscate tab. That is a different product.
- WebAssembly until TASKS.md says so.

If a request fights a rule, the rule wins. Change the rule in this file first, with a reason in MEMORY.md.
