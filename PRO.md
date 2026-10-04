# Rotor — Product

A Chrome side-panel workbench that encodes, decodes, hashes, encrypts, decrypts, and generates secrets **entirely on this machine**. No account. No server. No telemetry.

Anyone who can edit a `.js` file should be able to add an algorithm by following [RULES.md](RULES.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Name

**Rotor.** Named after electromechanical cipher machines. The UI is a workbench, not a dashboard.

## Who it is for

- Developers who need Base64 / Hex / JWT / SHA in the browser, constantly.
- Students learning classical ciphers.
- People who must turn a password into AES-GCM ciphertext without pasting it into a website.

It is **not** a HSM, a password manager, or a substitute for age/gpg in production pipelines.

## Job to be done

1. Pick an algorithm.
2. Paste or drop input.
3. Get output on the tape.
4. Copy it. Nothing is stored unless the user opted into “remember last algorithm.”

## Principles

| Principle | Meaning |
|---|---|
| Local | No `fetch`, no CDNs, no fonts from the network, no analytics. CSP blocks remote script. |
| Honest | Classical ciphers and MD5/SHA-1 are labelled unsafe for secrets. AES-GCM is the only “hide this” path we recommend. |
| Fast | Encodings and hashes of text run live (debounced). Password KDFs and RSA do **not** run on every keystroke. |
| Real crypto | Modern encrypt, decrypt, sign, verify, HMAC, PBKDF2, AES, RSA, ECDSA go through `crypto.subtle` only. Never a hand-rolled AES. |
| Reversible vs one-way | Encode/decode and encrypt/decrypt are paired. Hash and generate are one-way or generative. The UI never shows a Decode button on SHA. |
| Known answers | Every algorithm ships with at least one test vector in `js/selftest.js`. If you add an algorithm, you add a vector. |

## Feature set (v1)

### Encode / decode

Base64, Base64 URL, Base32 (RFC 4648), Base58 (Bitcoin alphabet), ASCII85, Hex, Binary, Octal, URL component, HTML entities, Quoted-printable, UUEncode, Morse, NATO phonetic, Unicode code points, UTF-8 byte list, JWT *decode* (split + JSON, no signature trust).

### Classical (historic, not secret)

Caesar, ROT13, ROT47, Atbash, Affine, Vigenère, Beaufort, Autokey, Playfair, Rail fence, Columnar transposition, Baconian, Polybius, simple substitution, repeating-key XOR, Enigma M3 (I–V, UKW-B, plugboard, double-stepping).

### Hash / MAC / KDF

MD5, SHA-1, SHA-256, SHA-384, SHA-512, HMAC-SHA-256, HMAC-SHA-512, CRC-32, PBKDF2-SHA-256. File hashing via the same engines.

### Modern

- AES-GCM (password → PBKDF2 → AES-GCM). Envelope is round-trippable.
- AES-CBC (same KDF, **unauthenticated** — warning shown).
- RSA-OAEP encrypt/decrypt with generated or pasted PEM.
- ECDSA P-256 sign/verify.
- TOTP (RFC 6238, HMAC-SHA-1, 30s, 6 digits).

### Generate

High-entropy passwords (entropy shown), syllable passphrases, UUIDv4, random keys (hex / Base64), RSA-2048/4096 PEM pair, AES raw key, TOTP secret (Base32).

### Chrome shell

- Manifest V3.
- Action click opens the **side panel**.
- Context menu on selection: open in Rotor, SHA-256, Base64-encode.
- Optional session hand-off of selected text. Keys are never written to `chrome.storage`.

## Non-goals (v1)

- Cloud sync, accounts, team vaults.
- SHA-3, BLAKE2, Argon2, scrypt, XChaCha20-Poly1305 (not in Web Crypto; do not invent them).
- Breaking ciphertext, brute force, GPU cracking.
- “Military grade” marketing copy.
- Bundlers, React, npm, TypeScript (plain ES modules so a vibe coder can Load unpacked and edit).

## Success

- Load unpacked → side panel opens → Base64 `"Man"` → `TWFu`.
- SHA-256 `"abc"` matches the FIPS vector.
- AES-GCM round-trip with a password works; tampering the envelope fails closed.
- Self-test panel is all green.
- Chrome’s network panel shows **zero** requests after the extension is loaded.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked → this folder (`manifest.json` lives at the root).
4. Pin Rotor. Click the icon: the side panel is the app.

## Repo map for humans

| File | Why it exists |
|---|---|
| [PRO.md](PRO.md) | This file. What we are building. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the parts fit. Where to put a new cipher. |
| [RULES.md](RULES.md) | Constraints. Break these and the tool becomes a toy or a leak. |
| [DESIGN.md](DESIGN.md) | Visual system. Do not restyle from scratch. |
| [TASKS.md](TASKS.md) | Build order and backlog. |
| [MEMORY.md](MEMORY.md) | Decisions already made. Read before arguing. |
| [README.md](README.md) | Short public face. |
