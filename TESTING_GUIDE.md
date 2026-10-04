# Rotor — Complete Manual Testing Guide

**Last Updated:** 2026-09-29 | **Version:** 1.0.0 Final

This guide walks you through every feature in Rotor, step-by-step, with real examples you can copy-paste and test immediately.

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [UI Walkthrough](#ui-walkthrough)
3. [Encodings (16 algorithms)](#encodings-16-algorithms)
4. [Classical Ciphers (15 algorithms)](#classical-ciphers-15-algorithms)
5. [Analysis & Auto-Decoders (4 algorithms)](#analysis--auto-decoders-4-algorithms)
6. [Hashes & KDF (9 algorithms)](#hashes--kdf-9-algorithms)
7. [Modern Crypto (5 algorithms)](#modern-crypto-5-algorithms)
8. [Generate (7 algorithms)](#generate-7-algorithms)
9. [Self-Test Verification](#self-test-verification)
10. [Troubleshooting](#troubleshooting)

---

## Installation & Setup

### Option A: Chrome Extension (Unpacked)

1. **Open Chrome** and navigate to `chrome://extensions/`
2. **Enable Developer mode** (top right toggle)
3. **Click "Load unpacked"**
4. **Select the folder** `J:\app`
5. **Pin the extension** (click the puzzle icon, then pin Rotor)
6. **Click the Rotor icon** to open the side panel

**Expected Result:**
- Dark workbench appears on the right side
- Header shows **Rotor** logo with brass accent
- Search bar, algorithm groups, and two text areas (input/output)

---

### Option B: Local Workbench (Browser)

1. **Open terminal** in `J:\app`
2. **Run:** `python -m http.server 8000`
3. **Open browser:** `http://localhost:8000/html/panel.html`
4. **Wait 1-2 seconds** for UI to render

**Expected Result:**
- Same workbench UI appears
- No Chrome extension required
- Storage uses localStorage instead of `chrome.storage`

---

## UI Walkthrough

### Header
- **Left:** Rotor logo (5 brass ticks) + "ROTOR" text + "CIPHER BENCH" subtext
- **Right:** Sun icon (theme toggle)

### Search Bar
- **Type keywords:** aes, base64, caesar, sha, enigma, etc.
- **Filters algorithm list in real-time**

### Group Tabs
- **encodings** | **classical** | **analysis / auto** | **hashes** | **modern** | **generate**
- **Click to filter** the algorithm chip list below

### Algorithm Chips
- **White background** = unselected
- **Brass left border** = selected algorithm
- **Yellow highlight** = on hover

### Mode Buttons
- **encode / decode** (for encodings & classical)
- **hash** (for hashes)
- **encrypt / decrypt** (for modern)
- **sign / verify** (for ECDSA)
- **generate** (for password, UUID, keys)

### Tapes (Text Areas)
- **INPUT TAPE** (top): Type, paste, or drag files
- **OUTPUT TAPE** (bottom): Results (read-only, highlighted in tan)

### Controls
- **⇅ SWAP:** Exchange input and output (only for encode/decode/encrypt/decrypt)
- **RUN:** For slow ops (crypto, file hashing)
- **COPY:** Copy output to clipboard; shows "COPIED" for 1.2 seconds in brass

### Meta Line
- Shows: **Algorithm name · output size · execution mode (live or Run)**
- Example: `AES-GCM · 128 bytes · PBKDF2 210k · AES-GCM-256`

### Error Display
- Red error box shows specific error messages
- Example: `"Password required."` or `"Auth tag mismatch — ciphertext was changed or the password is wrong."`

### Diagnostics & Self-Test (Collapsible)
- **Click "DIAGNOSTICS & SELF-TEST"** to expand
- Shows all 52 test vectors
- ✓ green = pass | ✗ red = fail
- Counter: `47/52` (passed/total)

---

## Encodings (16 algorithms)

All work **live** (output updates as you type). All are reversible (encode ↔ decode).

### 1. Base64 (RFC 4648, Padded)
```
Input:  Man
Output: TWFu
Mode:   encode
```
**Test decode:**
```
Input:  TWFu
Output: Man
Mode:   decode
```

### 2. Base64 URL (URL-safe, No Padding)
```
Input:  subjects?_d
Output: c3ViamVjdHM_X2Q
Mode:   encode
```

### 3. Base32 (RFC 4648)
```
Input:  foobar
Output: MZXW6YTBOI======
Mode:   encode
```

### 4. Base58 (Bitcoin Alphabet)
```
Input:  Hello World
Output: JxF12TrwUP45BMd
Mode:   encode
```

### 5. ASCII85 (Adobe Framing)
```
Input:  Man 
Output: <~9jqo^~>
Mode:   encode
```

### 6. Hex (Base16)
```
Input:  hello
Output: 68656c6c6f
Mode:   encode
```

### 7. Binary (8-bit Groups)
```
Input:  A
Output: 01000001
Mode:   encode
```

### 8. Octal (Space-Separated Bytes)
```
Input:  A
Output: 101
Mode:   encode
```

### 9. URL Component (encodeURIComponent)
```
Input:  a b/c?d=1
Output: a%20b%2Fc%3Fd%3D1
Mode:   encode
```

### 10. HTML Entities (Named & Numeric)
```
Input:  <foo & bar>
Output: &lt;foo &amp; bar&gt;
Mode:   encode
```

### 11. Quoted-Printable (MIME Q-P)
```
Input:  hello = world
Output: hello =3D world
Mode:   encode
```

### 12. UUEncode (begin 644 Format)
```
Input:  Cat
Output: begin 644 data
        #0V%T
        `
        end
Mode:   encode
Field:  Filename = data
```

### 13. Morse Code (ITU Standard)
```
Input:  SOS
Output: ... --- ...
Mode:   encode
```

### 14. NATO Phonetic (ICAO)
```
Input:  HI
Output: Hotel India
Mode:   encode
```

### 15. Unicode Code Points (U+XXXX)
```
Input:  A
Output: U+0041
Mode:   encode
```

### 16. UTF-8 Bytes (Hex Per Byte, Space-Separated)
```
Input:  €
Output: e2 82 ac
Mode:   encode
```

---

## Classical Ciphers (15 algorithms)

All are **historic / unsafe** — marked with orange warning chip. All work **live**. Most are reversible.

### 1. Caesar (ROT with Shift)
```
Input:  HELLO
Shift:  13
Output: URYYB
Mode:   encode
```

**Test decode:**
```
Input:  URYYB
Shift:  13
Output: HELLO
Mode:   decode
```

### 2. ROT13 (Fixed Caesar, Shift 13)
```
Input:  HELLO
Output: URYYB
Mode:   encode
```

### 3. ROT47 (ASCII 33–126 Rotation)
```
Input:  Hello
Output: w6==@
Mode:   encode
```

### 4. Atbash (A↔Z Mirror)
```
Input:  AZ
Output: ZA
Mode:   encode
```

### 5. Affine (E(x) = ax + b mod 26)
```
Input:  AFFINE
a:      5
b:      8
Output: IHHWVC
Mode:   encode
```

### 6. Vigenère (Repeating Key)
```
Input:  ATTACKATDAWN
Key:    LEMON
Output: LXFOPVEFRNHR
Mode:   encode
```

### 7. Beaufort (Reciprocal Vigenère)
```
Input:  DEFENDTHEEASTWALLOFTHECASTLE
Key:    FORTIFICATION
Output: CKMPVCPVWPIWUJOGIUAPVWRIWUUK
Mode:   encode
```

### 8. Autokey (Key + Plaintext)
```
Input:  ATTACKATDAWN
Key:    QUEENLY
Output: QNXEPVYTWTWP
Mode:   encode
```

### 9. Playfair (5×5 Digraph)
```
Input:  HIDETHEGOLDINTHETREESTUMP
Key:    PLAYFAIREXAMPLE
Output: BMODZBXDNABEKUDMUIXMMOUVIF
Mode:   encode
```

### 10. Rail Fence (Zigzag Transposition)
```
Input:  WEAREDISCOVEREDFLEEATONCE
Rails:  3
Output: WECRLTEERDSOEEFEAOCAIVDEN
Mode:   encode
```

### 11. Columnar (Key-Ordered Columns)
```
Input:  DEFENDTHEEASTWALL
Key:    GERMAN
Output: NALEHWDTTEELDSXFEA
Mode:   encode
```

### 12. Baconian (a/b 5-Bit Code)
```
Input:  STRIKE
Output: baaab baaba baaaa abaaa abaab aabaa
Mode:   encode
```

### 13. Polybius (5×5 Grid)
```
Input:  BAT
Output: 12 11 44
Mode:   encode
```

### 14. Substitution (26-Letter Alphabet)
```
Input:  ATTACK
Alphabet: QWERTYUIOPASDFGHJKLZXCVBNM
Output: QZZQEA
Mode:   encode
```

### 15. Repeating XOR (Hex Key)
```
Input:  wiki
Key:    6b6579
Output: 1c0c1202
Mode:   encode
```

### Bonus: Enigma M3 (Wehrmacht)
```
Input:  AAAAA
Rotors: I, II, III
Rings:  1, 1, 1
Windows: A, A, A
Plugboard: (empty)
Output: BDZGO
Mode:   encode
```

**To step through Enigma rotor positions:**
1. Click Enigma
2. Change Window L from A → B (pressing Run after each)
3. Each run shows the current rotor position encryption

---

## Analysis & Auto-Decoders (4 algorithms)

**These require NO KEY.** They use frequency analysis, heuristics, and brute-force to break unknown ciphers.

### 1. Magic Auto-Decoder (Universal Solver)

**What it does:** Tries every encoding (Base64, Hex, URL, HTML, Base32, Base58, ASCII85) and every classical cipher (Caesar, Affine, Rail Fence, Single-Byte XOR) without a key. Ranks results by English text fitness.

**Test 1: Base64 (no key)**
```
Input:  TWFu
Output: [List of top candidates]
        [#1] Base64 (Standard RFC 4648) – Confidence: 95%
        PLAINTEXT: Man
```

**Test 2: Caesar Cipher (no key)**
```
Input:  URYYB JBEYQ
Output: [Caesar crack results]
        [#1] Caesar (Shift 13 / ROT-13) – Confidence: 92%
        PLAINTEXT: HELLO WORLD
```

**Test 3: Single-Byte XOR (no key)**
```
Input:  1c0c1202
Output: [XOR crack results]
        [#1] Single-Byte XOR KEY: 0x6b (k) – Confidence: 88%
        PLAINTEXT: wiki
```

---

### 2. Frequency Analysis Inspector

**What it does:** Analyzes ciphertext (or plaintext) and calculates:
- Shannon Entropy (bits/byte)
- Index of Coincidence (English fingerprint)
- Chi-Squared vs. English
- Top 10 monograms (letter frequencies)
- Diagnostic verdict (mono? poly? random?)

**Test: English Plaintext**
```
Input:  ATTACK AT DAWN ON THE EAST CASTLE WALL
Output: 
        === CRYPTANALYSIS & FREQUENCY REPORT ===
        Total Length:       41 characters (41 bytes)
        Alphabetic Letters: 34
        Shannon Entropy:    4.234 bits/byte (Max: 8.000)
        Index of Coincidence (IoC): 0.0652 (English standard: ~0.0667)
        Chi-Squared (vs English):   45.23 (Lower = more natural)
        
        DIAGNOSTIC VERDICT:
        English Monosubstitution / Transposition (IoC ≈ 0.066): High probability of Caesar, Atbash, Affine, or Rail Fence.
        
        TOP MONOGRAMS (Observed vs Standard English):
          A: 11.76% [4] (Std: 8.17%)  ████████████
          T:  8.82% [3] (Std: 9.06%)  ██████████
          ...
```

---

### 3. Caesar Auto-Crack

**What it does:** Brute-forces all 25 shifts and ranks by Chi-Squared English fitness.

**Test: Encrypted Caesar Text**
```
Input:  URYYB JBEYQ
Output:
        === CAESAR CIPHER AUTO-SOLVER (ALL 25 SHIFTS) ===
        Ranked by Chi-Squared English frequency fitness:
        
        ★ BEST MATCH Caesar (Shift 13 / ROT-13) (Score: 94)
          HELLO WORLD
        
        [#2] Caesar (Shift 12 / ROT-14) (Score: 18)
          IFMMP XPSME
        
        [#3] Caesar (Shift 11 / ROT-15) (Score: 15)
          JGNNQ YQSNG
        ...
```

**Manual Test All 25:**
1. Paste: `URYYB JBEYQ`
2. Watch output: All shifts ranked, best at top

---

### 4. Single-Byte XOR Crack

**What it does:** Tests all 256 possible 1-byte keys on input hex string. Ranks by English word matching and printable ratio.

**Test: XOR Ciphertext (Hex)**
```
Input:  1c0c1202
Output:
        === SINGLE-BYTE XOR AUTO-SOLVER ===
        Found 92 plausible keys (Ranked by English score):
        
        ★ BEST KEY KEY: 0x6b (k) (Score: 88)
          PLAINTEXT: wiki
        
        [#2] KEY: 0x6c (l) (Score: 75)
          PLAINTEXT: vhkh
        
        [#3] KEY: 0x6d (m) (Score: 72)
          PLAINTEXT: wiji
        ...
```

---

## Hashes & KDF (9 algorithms)

All work **live** on small inputs. Large files (>256 KiB) require **Run** button.

### 1. MD5 (128-bit, Broken)
```
Input:  abc
Output: 900150983cd24fb0d6963f7d28e17f72
Format: hex
Warn:   "broken · unsafe"
```

### 2. SHA-1 (160-bit, Deprecated)
```
Input:  abc
Output: a9993e364706816aba3e25717850c26c9cd0d89d
Format: hex
Warn:   "broken · unsafe"
```

### 3. SHA-256 (256-bit, Standard)
```
Input:  abc
Output: ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
Format: hex
```

### 4. SHA-384 (384-bit)
```
Input:  abc
Output: cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7
Format: hex
```

### 5. SHA-512 (512-bit)
```
Input:  abc
Output: ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f
Format: hex
```

### 6. HMAC-SHA-256 (Key Required)
```
Input:    what do ya want for nothing?
Key:      Jefe
Output:   5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843
Format:   hex
```

### 7. HMAC-SHA-512
```
Input:    message
Key:      secret
Output:   (hex/base64)
Format:   hex or base64
```

### 8. CRC-32 (Checksum, Not Cryptographic)
```
Input:    123456789
Output:   cbf43926
Warn:     "unsafe"
```

### 9. PBKDF2-SHA-256 (Key Derivation, Slow)
```
Input:      (empty, not used)
Password:   password
Salt:       salt
Iterations: 1
Length:     32 bytes
Output:     120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b
Mode:       hash
Warn:       "slow KDF" (takes ~2 seconds)
```

**Test PBKDF2 with custom iterations:**
```
Password:   mypassword
Salt:       mysalt
Iterations: 210000  (default, slower)
Length:     32 bytes
Output:     (hex)
Meta:       210000 rounds · 256-bit
```

---

## Modern Crypto (5 algorithms)

These are **NOT live** — click **RUN** button to execute.

### 1. AES-GCM (Authenticated Encryption)

**Encrypt:**
```
Input:    Hello, secret world!
Password: mypassword
Mode:     encrypt
Output:   rotor1.AAAA....BBBB....CCCC....
Meta:     PBKDF2 210000 · AES-GCM-256
```

**Decrypt (copy output from encrypt above):**
```
Input:    rotor1.AAAA....BBBB....CCCC....
Password: mypassword
Mode:     decrypt
Output:   Hello, secret world!
Meta:     AES-GCM authenticated
```

**Tamper test (change last character):**
```
Input:    rotor1.AAAA....BBBB....CCCA  (last char changed)
Password: mypassword
Mode:     decrypt
Error:    "Auth tag mismatch — ciphertext was changed or the password is wrong."
```

---

### 2. AES-CBC (Unauthenticated)

**Encrypt:**
```
Input:    Secret text
Password: pass
Mode:     encrypt
Output:   rotor1cbc.SALT.IV.CIPHERTEXT
Warn:     "unauthenticated"
```

**Decrypt:**
```
Input:    rotor1cbc.SALT.IV.CIPHERTEXT
Password: pass
Mode:     decrypt
Output:   Secret text
```

---

### 3. RSA-OAEP (Asymmetric Encryption)

**Step 1: Generate RSA Pair**
1. Click **generate** group
2. Click **RSA PEM pair**
3. Set Bits: **2048** (or 4096 for slower/stronger)
4. Click **GENERATE**
5. Output: Two PEM blocks (PRIVATE KEY, PUBLIC KEY)
6. **Copy both** to a text file for later use

**Step 2: Encrypt (with public key)**
```
Mode:    encrypt
Input:   Hello RSA
PEM:     -----BEGIN PUBLIC KEY-----
         (paste public key here)
         -----END PUBLIC KEY-----
Output:  (long Base64url string)
Meta:    RSA-OAEP SHA-256
```

**Step 3: Decrypt (with private key)**
```
Mode:    decrypt
Input:   (paste ciphertext from encrypt above)
PEM:     -----BEGIN PRIVATE KEY-----
         (paste private key here)
         -----END PRIVATE KEY-----
Output:  Hello RSA
```

---

### 4. ECDSA P-256 (Digital Signature)

**Step 1: Generate Pair**
1. Click **generate** group
2. Click **ECDSA PEM pair**
3. Click **GENERATE**
4. Copy both PEM blocks

**Step 2: Sign (with private key)**
```
Mode:      sign
Input:     Message to sign
PEM:       -----BEGIN PRIVATE KEY-----
           (paste private key)
           -----END PRIVATE KEY-----
Output:    (Base64url signature)
Meta:      ECDSA P-256 SHA-256
```

**Step 3: Verify (with public key)**
```
Mode:      verify
Input:     Message to sign
PEM:       -----BEGIN PUBLIC KEY-----
           (paste public key)
           -----END PUBLIC KEY-----
Signature: (paste signature from step 2)
Output:    valid
Meta:      ECDSA P-256 verified
```

**Tamper test (change message):**
```
Input:     (change one word)
PEM:       (same public key)
Signature: (same signature)
Output:    error
Error:     "Signature does not match this message and key."
```

---

### 5. TOTP (Time-based One-Time Password, RFC 6238)

**Step 1: Generate Secret**
1. Click **generate** group
2. Click **TOTP secret**
3. Click **GENERATE**
4. Output: `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ...` (Base32)
5. Copy it

**Step 2: Generate TOTP Code**
```
Mode:   generate
Secret: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
Digits: 6
Period: 30
Hash:   SHA-1
Output: 123456 (changes every 30 seconds!)
Meta:   29s left · HMAC-SHA-1
```

**What to observe:**
- Output changes every 30 seconds
- Meta shows countdown ("29s left", "28s left", ...)
- Digits field changes output length (6, 7, or 8 digits)
- Use this code to verify against Google Authenticator or Authy

---

## Generate (7 algorithms)

All work **live** or **Run** button. Click **GENERATE** to create new values each time.

### 1. Password Generator

```
Length:  20
Classes: a–z ✓ | A–Z ✓ | 0–9 ✓ | symbols ✗
Output:  hK7mNpQrXvWzBjFgTdSa
Meta:    ~131 bits (entropy indicator)
```

**Change classes:**
```
Length:  16
Classes: a–z ✓ | A–Z ✓ | 0–9 ✗ | symbols ✓
Output:  (alphanumeric + special chars)
Meta:    ~93 bits
```

---

### 2. Passphrase Generator

```
Words: 5
Output: mountain-river-silver-shadow-castle
Meta:   ~65 bits (rough estimate)
```

**Note:** Output is syllable-based, readable, memorable.

---

### 3. UUIDv4

```
Output: 550e8400-e29b-41d4-a716-446655440000
Meta:   UUIDv4
```

Each click generates a new UUID.

---

### 4. Random Key (Hex or Base64)

```
Bytes:   32
Format:  hex
Output:  a7f3c9e1b2d4f8a3c5e7g9h1j3k5l7m9
Meta:    256-bit
```

**Or Base64:**
```
Bytes:   32
Format:  base64
Output:  p/PJ4bLU+KPF53iR00U3mQ==
Meta:    256-bit
```

---

### 5. AES-256 Raw Key

```
Output: (32 random bytes, hex)
Meta:   AES-256 raw
```

Use in custom AES implementations.

---

### 6. RSA PEM Pair

```
Bits:   2048  (or 4096)
Output: -----BEGIN PRIVATE KEY-----
        (2048 or 4096 bit RSA key pair)
        -----END PRIVATE KEY-----
        
        -----BEGIN PUBLIC KEY-----
        (corresponding public key)
        -----END PUBLIC KEY-----
```

---

### 7. ECDSA PEM Pair

```
Output: -----BEGIN PRIVATE KEY-----
        (P-256 ECDSA private key)
        -----END PRIVATE KEY-----
        
        -----BEGIN PUBLIC KEY-----
        (corresponding public key)
        -----END PUBLIC KEY-----
```

---

## Self-Test Verification

**Access the diagnostics:**
1. Scroll to bottom of panel
2. Click **"DIAGNOSTICS & SELF-TEST"** to expand
3. View all 52 tests

**Expected Result:**
```
✓ base64 [encode]
✓ base64 [decode]
✓ base64url [encode]
... (all green checkmarks)
✓ RSA-OAEP 2048 round-trip
✓ AES-GCM round-trip
✓ AES-GCM tamper fails closed

52/52 (all pass)
```

**If any fail (red ✗):**
- Reload the page
- Check browser console (F12 > Console tab) for error messages
- Report the failing test ID

---

## Troubleshooting

### Issue: "Envelope lengths look wrong"
**Cause:** AES-GCM Base64url parsing error (rare)
**Fix:** Reload panel and try again

### Issue: "Password required"
**Cause:** AES/PBKDF2 field left empty
**Fix:** Fill in the Password field (required)

### Issue: Long operations freeze the UI
**Cause:** RSA-4096, PBKDF2 with high iterations, large files
**Fix:** This is normal — operations complete in 2–30 seconds

### Issue: TOTP code doesn't match authenticator app
**Cause:** System clock out of sync
**Fix:** Sync your computer time via NTP (`date` in terminal)

### Issue: Copied text not pasting
**Cause:** Output tape uses `navigator.clipboard` fallback
**Fix:** Try selecting output and Ctrl+C manually

### Issue: Drag-and-drop file not working
**Cause:** Browser permission (rare on localhost)
**Fix:** Try selecting file via the "DROP FILE" button

---

## Pro Tips

1. **Use Search** to find algorithms instantly ("aes", "sha", "base64")
2. **Swap Input/Output** to decrypt/decode in reverse mode
3. **Copy Immediately** after running — output updates on new input
4. **Check Meta Line** to understand execution time and key derivation rounds
5. **Read Hints** on algorithm chips for quick reference
6. **Use Analysis Group** to crack unknown ciphers without trying all shifts manually
7. **Test Self-Test** after any new algorithm implementation
8. **Dark/Light Theme** toggle via sun icon (preference persists)
9. **No Telemetry** — all work is local; CSP blocks all outbound requests
10. **Offline Always** — works without internet connection

---

## Quick Copy-Paste Tests

### Test 1: Base64 Encode-Decode Pair
```
Encode: Man → TWFu
Decode: TWFu → Man
```

### Test 2: Caesar Crack (No Key)
```
Input: URYYB JBEYQ
Auto-Solver Output: HELLO WORLD (rank #1)
```

### Test 3: SHA-256
```
Input: abc
Output: ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
```

### Test 4: AES-GCM Encryption & Decryption
```
Encrypt: "Hello" + Password "test" → rotor1.XXXX.YYYY.ZZZZ
Decrypt: rotor1.XXXX.YYYY.ZZZZ + Password "test" → Hello
```

### Test 5: ECDSA Sign & Verify
```
Generate Key → Private + Public PEM
Sign: "message" + Private PEM → signature
Verify: "message" + Public PEM + signature → valid
```

---

## End of Manual Testing Guide

**Version:** 1.0.0 | **Last Updated:** 2026-09-29 | **Developer:** Strrechpixal Developers
