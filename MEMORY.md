# Rotor — Memory

Decisions already made. Do not re-litigate in a later session unless the user asks.

## Product

- **Name:** Rotor. Not CipherKit, CryptoBox, Vault, Locksmith.
- **Surface:** Chrome **side panel**, Manifest V3. Not a popup. Not a new tab app.
- **Stack:** Plain HTML/CSS/ES modules. No npm, no bundler, no React, no TypeScript in v1. Load unpacked.
- **Audience:** Developers + students. Copy is dry and precise, not playful-crypto, not military.

## Crypto

- **Real crypto = Web Crypto.** AES-GCM/CBC, RSA-OAEP, ECDSA P-256, SHA-1/2, HMAC, PBKDF2, `getRandomValues`.
- **Portable JS allowed for:** MD5, CRC-32, encodings, classical, Enigma, PEM (wrap), TOTP hotp math around HMAC.
- **Not in v1:** SHA-3, BLAKE2, Argon2, scrypt, XChaCha20, AES-SIV. Chromium Subtle does not ship them; we will not invent them.
- **AES-GCM envelope:** `rotor1.<b64url salt>.<b64url iv>.<b64url ct||tag>` · PBKDF2-SHA-256 · 210000 · 16-byte salt · 12-byte IV · 128-bit tag.
- **AES-CBC envelope:** `rotor1cbc.` same KDF, 16-byte IV, labelled unauthenticated.
- **JWT:** decode only. Never “verified” unless we add JWKS later (we will not in v1).
- **TOTP:** RFC 6238, HMAC-SHA-1, 30s, 6 digits default.
- **Enigma:** Wehrmacht M3, rotors I–V, UKW-B, plugboard, double-stepping. Rings 01–26, windows A–Z.

## UX

- **Design system:** DESIGN.md. Dark bench `#12151a`, paper tape `#d8c9a3`, brass `#c4a35a`. IBM Plex Sans + Mono, bundled or system fallback. No Google Fonts.
- **Live vs Run:** encodings, classical, hashes of text are live (80ms). Password KDFs, AES, RSA, ECDSA, files, >256 KiB are Run.
- **Last algorithm id** may persist. **Keys may not.**
- **Context menus:** Open in Rotor, SHA-256, Base64-encode. Payload lives in `chrome.storage.session` and is cleared after read.

## Repo

- Root is `J:\app` (this folder). Docs live next to `manifest.json` so a vibe coder sees them first.
- Engine files: `js/engines/{bytes,encodings,classical,hashes,modern,generate}.js`.
- Self-test is in-panel, not Node.

## Why these choices

- Side panel stays open while the user copies from a page — a popup would close.
- No bundler: the next person can edit one function and reload.
- Envelope version prefix: we can bump KDF later without a guessing parser.
- 210k PBKDF2: in 2026 this is a reasonable password-based floor in a browser; we do not pretend it is Argon2.

## Open on purpose

- Exact Enigma ring display (numeric vs alphabetic) — pick numeric 01–26 in the field, document in engine.
- Whether light theme is default: **no**, dark is default.
- Store listing: not until hardening checklist in TASKS.md is green.
