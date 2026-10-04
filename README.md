# Rotor

A local cipher workbench for Chrome. Encode, decode, hash, encrypt, decrypt, and generate secrets — **nothing leaves this machine**.

Built as a Manifest V3 side panel with plain ES modules. No bundler. No npm. No network.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this directory (`J:\app`).
4. Pin Rotor in the toolbar. Click the icon to open the side panel.

## What is in the box

- **Encodings:** Base64, Base64url, Base32 (RFC 4648), Base58 (Bitcoin), ASCII85, Hex, Binary, Octal, URL component, HTML entities, Quoted-printable, UUEncode, Morse, NATO phonetic, Unicode code points, UTF-8 bytes, JWT decode.
- **Classical (historic/unsafe):** Caesar, ROT13, ROT47, Atbash, Affine, Vigenère, Beaufort, Autokey, Playfair, Rail fence, Columnar transposition, Baconian, Polybius, simple substitution, repeating-key XOR, Enigma M3 (I–V, UKW-B, plugboard, double-stepping).
- **Hashes / MAC / KDF:** MD5 (portable), SHA-1, SHA-256, SHA-384, SHA-512, HMAC-SHA-256, HMAC-SHA-512, CRC-32, PBKDF2-SHA-256. File drag-and-drop onto the tape.
- **Modern crypto:** AES-GCM (PBKDF2-SHA-256 210k rounds, `rotor1.` envelope), AES-CBC (labelled unauthenticated), RSA-OAEP 2048/4096 (PEM), ECDSA P-256 (sign/verify), TOTP (RFC 6238, live countdown).
- **Generators:** High-entropy passwords (bits shown), syllable passphrases, UUIDv4, random keys (hex/Base64), AES-256 raw keys, RSA PEM pairs, ECDSA PEM pairs, TOTP secrets.
- **Chrome integration:** Context menus to hash or Base64-encode selections directly in the side panel.

## For vibe coders

Read the docs in this order:

1. [PRO.md](PRO.md) — What Rotor is, principles, non-goals.
2. [ARCHITECTURE.md](ARCHITECTURE.md) — File layout, runtime, envelope format, how to add an algorithm in 10 minutes.
3. [RULES.md](RULES.md) — Security and coding rules. Follow these strictly.
4. [DESIGN.md](DESIGN.md) — Dark bench palette, typography, layout tokens.
5. [TASKS.md](TASKS.md) — Roadmap and hardening checklist.
6. [MEMORY.md](MEMORY.md) — Locked product and crypto decisions.

## License

MIT
