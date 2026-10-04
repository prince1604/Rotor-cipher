# Rotor — Tasks

Status: **v1 in progress**. Check a box when the files exist and self-test covers that slice.

## 0. Docs (this pass)

- [x] PRO.md
- [x] ARCHITECTURE.md
- [x] RULES.md
- [x] DESIGN.md
- [x] TASKS.md
- [x] MEMORY.md
- [ ] README.md (short public face, after the code exists)

## 1. Shell

- [ ] `manifest.json` MV3 — sidePanel, action, contextMenus, storage, CSP, icons
- [ ] `js/background.js` — open panel on action, menus, session payload
- [ ] `html/panel.html` + `css/panel.css` + `js/panel.js` empty bench matching DESIGN.md
- [ ] `js/registry.js` empty groups
- [ ] `js/engines/bytes.js` — utf8, concat, hex, b64url helpers
- [ ] Icons 16/48/128 (canvas-generated ticks)
- [ ] IBM Plex woff2 **or** documented system fallback (no network)

## 2. Encodings

- [ ] Base64 + Base64url
- [ ] Base32 RFC 4648
- [ ] Base58 Bitcoin
- [ ] ASCII85
- [ ] Hex, binary, octal
- [ ] URL component, HTML entities
- [ ] Quoted-printable, UUEncode
- [ ] Morse, NATO, Unicode code points, UTF-8 bytes
- [ ] JWT decode (header.payload, no verify)
- [ ] Vectors in selftest.js

## 3. Classical

- [ ] Caesar, ROT13, ROT47, Atbash
- [ ] Affine (a, b)
- [ ] Vigenère, Beaufort, Autokey
- [ ] Playfair
- [ ] Rail fence, columnar transposition
- [ ] Baconian, Polybius
- [ ] Simple substitution
- [ ] Repeating-key XOR (hex key)
- [ ] Enigma M3 (I–V, UKW-B, plugboard, rings, windows, double-step)
- [ ] Vectors

## 4. Hashes / MAC / KDF

- [ ] SHA-256/384/512 via Subtle (hex + Base64 out)
- [ ] SHA-1 via Subtle, warn chip
- [ ] HMAC-SHA-256/512
- [ ] PBKDF2-SHA-256 (iterations field, default 210000)
- [ ] MD5 portable
- [ ] CRC-32
- [ ] File drop → hash
- [ ] Vectors (FIPS 180-4 `"abc"`, RFC 2104 HMAC, RFC 1321 MD5)

## 5. Modern

- [ ] AES-GCM envelope `rotor1.` encrypt/decrypt
- [ ] AES-CBC envelope `rotor1cbc.` + unauthenticated warn
- [ ] RSA-OAEP 2048/4096 generate + encrypt/decrypt PEM
- [ ] ECDSA P-256 sign/verify
- [ ] TOTP RFC 6238
- [ ] Tamper test: flip one byte of envelope → auth-fail

## 6. Generate

- [ ] Password (length, classes, entropy bits on meta)
- [ ] Syllable passphrase
- [ ] UUIDv4
- [ ] Random key hex / Base64
- [ ] AES raw 256-bit
- [ ] RSA PEM pair (reuse modern generate)
- [ ] TOTP Base32 secret

## 7. Panel UX

- [ ] Search filters the chip list
- [ ] Mode switch hides invalid modes
- [ ] Live debounce 80ms vs Run
- [ ] Swap input/output
- [ ] Copy + “copied”
- [ ] Drop file onto input tape
- [ ] Last algorithm id in `chrome.storage.sync`
- [ ] Theme toggle
- [ ] Context menu → session text lands in the tape
- [ ] Self-test strip, collapsed, count `ok/total`

## 8. Hardening before you call it done

- [ ] CSP holds: no console CSP violations
- [ ] Network panel empty after load
- [ ] `Math.random` grep is empty in `js/`
- [ ] `innerHTML` grep is empty in `js/`
- [ ] Passwords never written to storage (manual: set a password, reload, field empty)
- [ ] Self-test all green
- [ ] Keyboard: tab order header → search → groups → fields → tapes → copy
- [ ] `prefers-reduced-motion` respected

## Backlog (not v1)

- SHA-3 / BLAKE2 via a reviewed portable impl or WASM, behind a TASKS promotion
- Argon2id (WASM)
- Streaming hash for 1GB files (`crypto.subtle` digest does not stream; need SHA-256 in JS or WASM)
- Options page
- Chrome Web Store listing + privacy sheet (“we collect nothing”)
- Keyboard shortcut to open the panel (`commands`)
- Offline unit tests in Node — only after engines are stable

## How a vibe coder picks work

1. Read MEMORY.md (decisions).
2. Take the next unchecked box in the lowest numbered section.
3. Follow RULES.md.
4. Add a self-test vector in the same change.
5. Check the box.
