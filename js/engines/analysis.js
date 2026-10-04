import {
  RotorError,
  utf8Encode,
  utf8Decode,
  utf8DecodeStrict,
  hexToBytes,
  bytesToHex,
  b64ToBytes,
  b64urlToBytes,
} from './bytes.js';
import { base32Decode, base58Decode, ascii85Decode } from './encodings.js';
import { rot13, rot47, atbash } from './classical.js';
import { md5bytes } from './hashes.js';

/* English Monogram Frequencies (Standard percentages normalized) */
const ENGLISH_FREQ = {
  A: 0.08167, B: 0.01492, C: 0.02782, D: 0.04253, E: 0.12702,
  F: 0.02228, G: 0.02015, H: 0.06094, I: 0.06966, J: 0.00153,
  K: 0.00772, L: 0.04025, M: 0.02406, N: 0.06749, O: 0.07507,
  P: 0.01929, Q: 0.00095, R: 0.05987, S: 0.06327, T: 0.09056,
  U: 0.02758, V: 0.00978, W: 0.02360, X: 0.00150, Y: 0.01974,
  Z: 0.00074,
};

/* Top English Bigrams with weights for rapid N-Gram recognition */
const TOP_BIGRAMS = new Set([
  'TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ED', 'ON', 'ES', 'ST',
  'EN', 'AT', 'TO', 'NT', 'HA', 'ND', 'OU', 'EA', 'NG', 'AS',
  'OR', 'TI', 'IS', 'ET', 'IT', 'AR', 'TE', 'SE', 'HI', 'OF',
  'ME', 'SA', 'NE', 'WA', 'VE', 'LE', 'NO', 'TA', 'AL', 'DE',
]);

/* Top English Trigrams */
const TOP_TRIGRAMS = new Set([
  'THE', 'AND', 'THA', 'ENT', 'ION', 'TIO', 'FOR', 'NDE', 'HAS',
  'NCE', 'EDT', 'TIS', 'OFT', 'STH', 'MEN', 'INT', 'EST', 'ALL',
]);

/* High-frequency English Vocabulary + Developer / CTF / Security Terms */
const COMMON_WORDS = new Set([
  'THE', 'BE', 'TO', 'OF', 'AND', 'A', 'IN', 'THAT', 'HAVE', 'I',
  'IT', 'FOR', 'NOT', 'ON', 'WITH', 'HE', 'AS', 'YOU', 'DO', 'AT',
  'THIS', 'BUT', 'HIS', 'BY', 'FROM', 'THEY', 'WE', 'SAY', 'HER', 'SHE',
  'OR', 'AN', 'WILL', 'MY', 'ONE', 'ALL', 'WOULD', 'THERE', 'THEIR', 'WHAT',
  'SO', 'UP', 'OUT', 'IF', 'ABOUT', 'WHO', 'GET', 'WHICH', 'GO', 'ME',
  'WHEN', 'MAKE', 'CAN', 'LIKE', 'TIME', 'NO', 'JUST', 'HIM', 'KNOW', 'TAKE',
  'PEOPLE', 'INTO', 'YEAR', 'YOUR', 'GOOD', 'SOME', 'COULD', 'THEM', 'SEE', 'OTHER',
  'THAN', 'THEN', 'NOW', 'LOOK', 'ONLY', 'COME', 'ITS', 'OVER', 'THINK', 'ALSO',
  'SECRET', 'PASSWORD', 'FLAG', 'MESSAGE', 'ATTACK', 'DEFEND', 'KEY', 'TEST', 'DATA', 'USER',
  'ADMIN', 'ACCESS', 'SYSTEM', 'TOKEN', 'CIPHER', 'DECODE', 'ENCODE', 'CRYPTO', 'AUTH', 'ROOT',
  'HTTP', 'SERVER', 'HOST', 'CLIENT', 'STRING', 'VALUE', 'RETURN', 'FUNCTION', 'TRUE', 'FALSE',
  'WORLD', 'HELLO', 'NAME', 'EMAIL', 'ACCOUNT', 'LOGIN', 'SESSION', 'ERROR', 'PUBLIC', 'PRIVATE',
]);

/**
 * Fast Chi-Squared calculation against standard English monograms.
 * Lower value indicates higher fidelity to natural English.
 */
export function chiSquared(text) {
  const counts = new Int32Array(26);
  let total = 0;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      counts[code - 65]++;
      total++;
    } else if (code >= 97 && code <= 122) {
      counts[code - 97]++;
      total++;
    }
  }

  if (total === 0) return 99999;
  let chi2 = 0;
  let i = 0;
  for (const prob of Object.values(ENGLISH_FREQ)) {
    const expected = total * prob;
    const diff = counts[i++] - expected;
    chi2 += (diff * diff) / expected;
  }
  return chi2;
}

/**
 * High-Accuracy Multi-Factor English Fitness Scorer:
 * Incorporates Printable ASCII ratios, Chi-Squared monograms,
 * Bigram/Trigram densities, and Dictionary word matches.
 */
export function scoreEnglish(text) {
  if (!text || typeof text !== 'string') return 0;
  const len = text.length;
  if (len === 0) return 0;

  let printable = 0;
  let alpha = 0;
  let spaces = 0;
  let nonAscii = 0;

  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
      printable++;
      if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) alpha++;
      if (code === 32) spaces++;
    } else {
      nonAscii++;
    }
  }

  const printRatio = printable / len;
  if (printRatio < 0.75) return Math.max(0, printRatio * 15);

  // Chi-squared on letters
  const chi = chiSquared(text);
  let chiScore = Math.max(0, 45 - Math.min(45, chi / 2.2));

  // Bigram & Trigram frequency scoring
  let nGramScore = 0;
  const cleanUpper = text.toUpperCase().replace(/[^A-Z]/g, '');
  const cLen = cleanUpper.length;
  if (cLen >= 2) {
    let bigramHits = 0;
    for (let i = 0; i < cLen - 1; i++) {
      if (TOP_BIGRAMS.has(cleanUpper.slice(i, i + 2))) bigramHits++;
    }
    nGramScore += Math.min(25, (bigramHits / (cLen - 1)) * 100);
  }
  if (cLen >= 3) {
    let trigramHits = 0;
    for (let i = 0; i < cLen - 2; i++) {
      if (TOP_TRIGRAMS.has(cleanUpper.slice(i, i + 3))) trigramHits++;
    }
    nGramScore += Math.min(20, (trigramHits / (cLen - 2)) * 140);
  }

  // Dictionary Word Matches
  const words = text.toUpperCase().split(/[^A-Z0-9_]+/).filter((w) => w.length >= 2);
  let wordHits = 0;
  for (const w of words) {
    if (COMMON_WORDS.has(w)) wordHits++;
  }
  const wordBonus = Math.min(45, wordHits * 10);

  // Space ratio check (English sentences have space ratio ~12% - 20%)
  const spaceBonus = (spaces > 0 && spaces / len >= 0.08 && spaces / len <= 0.28) ? 10 : 0;

  const totalScore = (printRatio * 20) + chiScore + nGramScore + wordBonus + spaceBonus - (nonAscii * 20);
  return Math.max(0, Math.round(totalScore));
}

/**
 * Calculate Index of Coincidence (IoC).
 * Monoalphabetic substitution & transposition ≈ 0.0667.
 * Polyalphabetic (Vigenère) / random ≈ 0.0385.
 */
export function indexOfCoincidence(text) {
  const counts = new Int32Array(26);
  let total = 0;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      counts[code - 65]++;
      total++;
    } else if (code >= 97 && code <= 122) {
      counts[code - 97]++;
      total++;
    }
  }

  if (total <= 1) return 0;
  let sum = 0;
  for (let i = 0; i < 26; i++) {
    sum += counts[i] * (counts[i] - 1);
  }
  return sum / (total * (total - 1));
}

/**
 * Calculate Shannon Entropy (bits per character/byte).
 */
export function shannonEntropy(bytes) {
  if (!bytes || bytes.length === 0) return 0;
  const freq = {};
  for (let i = 0; i < bytes.length; i++) {
    freq[bytes[i]] = (freq[bytes[i]] || 0) + 1;
  }
  let entropy = 0;
  const n = bytes.length;
  for (const count of Object.values(freq)) {
    const p = count / n;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/* ================== CRACKERS & HIGH-SPEED SOLVERS ================== */

/** Auto-solve Caesar / ROT shifts (1 to 25) with zero-alloc char loops */
export function crackCaesar(text) {
  const results = [];
  const len = text.length;
  if (len === 0) return results;

  for (let shift = 1; shift < 26; shift++) {
    let shifted = '';
    for (let i = 0; i < len; i++) {
      const code = text.charCodeAt(i);
      if (code >= 65 && code <= 90) {
        shifted += String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
      } else if (code >= 97 && code <= 122) {
        shifted += String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
      } else {
        shifted += text[i];
      }
    }
    const score = scoreEnglish(shifted);
    results.push({
      method: `Caesar (Shift ${shift} / ROT-${(26 - shift) % 26})`,
      key: `Shift ${shift}`,
      text: shifted,
      score,
    });
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Auto-solve Affine ciphers across all 312 key pairs */
export function crackAffine(text) {
  const coprimes = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
  const modInv = { 1: 1, 3: 9, 5: 21, 7: 15, 9: 3, 11: 19, 15: 7, 17: 23, 19: 11, 21: 5, 23: 17, 25: 25 };
  const results = [];
  const len = text.length;
  if (len === 0) return results;

  for (const a of coprimes) {
    const invA = modInv[a];
    for (let b = 0; b < 26; b++) {
      let candidate = '';
      for (let i = 0; i < len; i++) {
        const code = text.charCodeAt(i);
        if (code >= 65 && code <= 90) {
          const x = (invA * (code - 65 - b + 2600)) % 26;
          candidate += String.fromCharCode(65 + x);
        } else if (code >= 97 && code <= 122) {
          const x = (invA * (code - 97 - b + 2600)) % 26;
          candidate += String.fromCharCode(97 + x);
        } else {
          candidate += text[i];
        }
      }
      const score = scoreEnglish(candidate);
      if (score > 35) {
        results.push({
          method: `Affine (a=${a}, b=${b})`,
          key: `a=${a}, b=${b}`,
          text: candidate,
          score,
        });
      }
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Auto-solve Single-Byte XOR across all 256 keys in a single typed array pass */
export function crackSingleXor(bytes) {
  const results = [];
  const len = bytes.length;
  if (len === 0) return results;

  const buf = new Uint8Array(len);
  const td = new TextDecoder('utf-8', { fatal: false });

  for (let key = 0; key < 256; key++) {
    for (let i = 0; i < len; i++) buf[i] = bytes[i] ^ key;
    let decoded = '';
    try {
      decoded = td.decode(buf);
    } catch {
      continue;
    }
    const score = scoreEnglish(decoded);
    if (score > 25) {
      const hexKey = '0x' + key.toString(16).padStart(2, '0');
      const keyChar = (key >= 32 && key <= 126) ? ` ('${String.fromCharCode(key)}')` : '';
      results.push({
        method: `Single-Byte XOR`,
        key: `${hexKey}${keyChar}`,
        text: decoded,
        score,
      });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Auto-solve Rail Fence transposition */
export function crackRailFence(text) {
  const results = [];
  const len = text.length;
  if (len < 4) return results;

  const maxRails = Math.min(10, Math.floor(len / 2));
  for (let rails = 2; rails <= maxRails; rails++) {
    const pattern = new Int16Array(len);
    let r = 0, dir = 1;
    for (let i = 0; i < len; i++) {
      pattern[i] = r;
      r += dir;
      if (r === 0 || r === rails - 1) dir *= -1;
    }
    const counts = new Int32Array(rails);
    for (let i = 0; i < len; i++) counts[pattern[i]]++;
    const buckets = [];
    let o = 0;
    for (let i = 0; i < rails; i++) {
      buckets.push(text.slice(o, o + counts[i]).split(''));
      o += counts[i];
    }
    let candidate = '';
    for (let i = 0; i < len; i++) {
      candidate += buckets[pattern[i]].shift() || '';
    }
    const score = scoreEnglish(candidate);
    if (score > 25) {
      results.push({
        method: `Rail Fence (${rails} rails)`,
        key: `${rails} rails`,
        text: candidate,
        score,
      });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Universal Magic Auto-Decoder:
 * Multi-layer analysis engine that identifies, decodes, and decrypts unknown data automatically.
 */
export function magicAutoDecode(ctx) {
  const input = ctx.text?.trim() || '';
  if (!input) {
    return { text: '', meta: 'Paste or type any ciphertext or encoded text' };
  }

  const candidates = [];
  const seenTexts = new Set([input]);

  const addCandidate = (method, key, decodedText, bonus = 0) => {
    if (!decodedText || seenTexts.has(decodedText)) return;
    const score = scoreEnglish(decodedText) + bonus;
    if (score > 15) {
      seenTexts.add(decodedText);
      candidates.push({ method, key, text: decodedText, score });
    }
  };

  // 1. Base64 / Base64url
  try {
    const b = b64ToBytes(input);
    if (b.length > 0) {
      const dec = utf8DecodeStrict(b);
      addCandidate('Base64 (RFC 4648)', 'None', dec, 25);
      // Secondary check: did Base64 reveal another cipher?
      const caesarSub = crackCaesar(dec);
      if (caesarSub.length > 0 && caesarSub[0].score > 35) {
        addCandidate(`Base64 → ${caesarSub[0].method}`, caesarSub[0].key, caesarSub[0].text, 20);
      }
    }
  } catch {}

  try {
    const b = b64urlToBytes(input);
    if (b.length > 0) {
      const dec = utf8DecodeStrict(b);
      addCandidate('Base64 URL-Safe', 'None', dec, 25);
    }
  } catch {}

  // 2. Hex
  try {
    const cleanHex = input.replace(/\s+/g, '').replace(/^0x/i, '');
    if (/^[0-9a-fA-F]+$/.test(cleanHex) && cleanHex.length % 2 === 0 && cleanHex.length >= 4) {
      const b = hexToBytes(cleanHex);
      const dec = utf8Decode(b);
      addCandidate('Hex / Base16', 'None', dec, 30);

      // Single-Byte XOR on Hex
      const xorHits = crackSingleXor(b);
      for (const h of xorHits.slice(0, 3)) {
        addCandidate(`Hex → ${h.method}`, h.key, h.text, 20);
      }
    }
  } catch {}

  // 3. Binary (8-bit bytes)
  try {
    const cleanBin = input.replace(/[^01]/g, '');
    if (cleanBin.length >= 8 && cleanBin.length % 8 === 0) {
      const out = new Uint8Array(cleanBin.length / 8);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(cleanBin.slice(i * 8, i * 8 + 8), 2);
      const dec = utf8Decode(out);
      addCandidate('Binary (8-bit ASCII)', 'None', dec, 30);
    }
  } catch {}

  // 4. URL Percent Encoding
  try {
    if (input.includes('%')) {
      const dec = decodeURIComponent(input.replace(/\+/g, '%20'));
      if (dec !== input) addCandidate('URL Percent-Encoding', 'None', dec, 30);
    }
  } catch {}

  // 5. HTML Entities
  try {
    if (input.includes('&')) {
      const dec = input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (_, body) => {
        if (body[0] === '#') {
          const n = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
          return Number.isFinite(n) ? String.fromCodePoint(n) : _;
        }
        const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
        return map[body] ?? _;
      });
      if (dec !== input) addCandidate('HTML Entities', 'None', dec, 25);
    }
  } catch {}

  // 6. Base32 / Base58 / ASCII85
  try {
    const b = base32Decode(input);
    if (b.length > 0) addCandidate('Base32', 'None', utf8Decode(b), 15);
  } catch {}

  try {
    const b = base58Decode(input);
    if (b.length > 0) addCandidate('Base58 (Bitcoin)', 'None', utf8Decode(b), 15);
  } catch {}

  try {
    const b = ascii85Decode(input);
    if (b.length > 0) addCandidate('ASCII85', 'None', utf8Decode(b), 15);
  } catch {}

  // 7. Caesar Shifts
  const caesarHits = crackCaesar(input);
  if (caesarHits.length > 0 && caesarHits[0].score > 30) {
    for (const hit of caesarHits.slice(0, 3)) {
      addCandidate(hit.method, hit.key, hit.text, 15);
    }
  }

  // 8. Atbash & ROT47
  try {
    const atb = atbash({ text: input }).text;
    addCandidate('Atbash (A↔Z Mirror)', 'Reciprocal', atb, 10);
  } catch {}

  try {
    const r47 = rot47({ text: input }).text;
    addCandidate('ROT47 (ASCII 33-126)', 'Shift 47', r47, 10);
  } catch {}

  // 9. Affine Ciphers
  const affineHits = crackAffine(input);
  for (const hit of affineHits.slice(0, 2)) {
    addCandidate(hit.method, hit.key, hit.text, 10);
  }

  // 10. Single-Byte XOR on raw bytes
  const rawBytes = ctx.bytes || utf8Encode(input);
  const xorRawHits = crackSingleXor(rawBytes);
  for (const hit of xorRawHits.slice(0, 2)) {
    addCandidate(hit.method, hit.key, hit.text, 10);
  }

  // 11. Rail Fence
  const railHits = crackRailFence(input);
  for (const hit of railHits.slice(0, 2)) {
    addCandidate(hit.method, hit.key, hit.text, 10);
  }

  // Rank candidates by composite English fitness
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      text: `[!] No confident auto-decoding found for this input.\n\n` +
            `• Input Length: ${input.length} chars (${rawBytes.length} bytes)\n` +
            `• Shannon Entropy: ${shannonEntropy(rawBytes).toFixed(3)} bits/byte\n` +
            `• Index of Coincidence: ${indexOfCoincidence(input).toFixed(4)}`,
      meta: 'No matches above threshold',
    };
  }

  // Render High-Tech Auto-Decoder Card
  const lines = [];
  lines.push(`⚡ AUTO-DECODER RESULTS (${candidates.length} candidates evaluated)`);
  lines.push(`Top ${Math.min(candidates.length, 6)} Candidate(s) ranked by English fitness:\n`);

  for (let i = 0; i < Math.min(candidates.length, 6); i++) {
    const c = candidates[i];
    const rank = i + 1;
    const confidence = Math.min(100, Math.max(15, Math.round(c.score)));
    const badge = rank === 1 ? '★ [BEST MATCH]' : `[#${rank}]`;
    const bar = '■'.repeat(Math.min(15, Math.round(confidence / 7)));

    lines.push(`${badge} METHOD: ${c.method} (Key: ${c.key})`);
    lines.push(`CONFIDENCE: ${confidence}% ${bar}`);
    lines.push(`PLAINTEXT:`);
    lines.push(c.text);
    lines.push('─'.repeat(52));
  }

  return {
    text: lines.join('\n'),
    meta: `⚡ ${candidates[0].method} (${Math.min(100, Math.round(candidates[0].score))}% conf)`,
  };
}

/**
 * Frequency Analysis & Cryptanalysis Diagnostic Inspector
 */
export function frequencyAnalysisInspector(ctx) {
  const text = ctx.text || '';
  if (!text) {
    return { text: '', meta: 'Input text required for statistical analysis' };
  }

  const bytes = ctx.bytes || utf8Encode(text);
  const entropy = shannonEntropy(bytes);
  const ioc = indexOfCoincidence(text);
  const chi = chiSquared(text);

  const counts = new Int32Array(26);
  let alphaCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      counts[code - 65]++;
      alphaCount++;
    } else if (code >= 97 && code <= 122) {
      counts[code - 97]++;
      alphaCount++;
    }
  }

  const sorted = [];
  for (let i = 0; i < 26; i++) {
    sorted.push([String.fromCharCode(65 + i), counts[i]]);
  }
  sorted.sort((a, b) => b[1] - a[1]);

  let assessment = '';
  if (entropy > 7.2) {
    assessment = 'High Entropy (>7.2 b/B): High probability of AES/RSA ciphertext, strong compression, or random bytes.';
  } else if (ioc >= 0.060) {
    assessment = 'Monoalphabetic / Transposition (IoC ≈ 0.066): High probability of Caesar, Atbash, Affine, or Rail Fence.';
  } else if (ioc >= 0.045) {
    assessment = 'Polyalphabetic Cipher (IoC 0.045 - 0.060): Probable Vigenère, Beaufort, or short-period repeating key.';
  } else {
    assessment = 'Low IoC (<0.045): High polyalphabeticity, non-English charset, or uniform noise.';
  }

  const lines = [
    `=== CRYPTANALYSIS & STATISTICAL PROFILE ===`,
    `Total Length:       ${text.length} characters (${bytes.length} bytes)`,
    `Alphabetic Letters: ${alphaCount}`,
    `Shannon Entropy:    ${entropy.toFixed(3)} bits/byte (Max: 8.000)`,
    `Index of Coincidence (IoC): ${ioc.toFixed(4)} (English standard: ~0.0667)`,
    `Chi-Squared (vs English):   ${chi < 9999 ? chi.toFixed(2) : 'N/A'} (Lower = closer to English)`,
    ``,
    `DIAGNOSTIC VERDICT:`,
    `→ ${assessment}`,
    ``,
    `TOP MONOGRAM FREQUENCIES (Observed vs Standard English):`,
  ];

  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    const [ch, count] = sorted[i];
    const obsPercent = alphaCount > 0 ? ((count / alphaCount) * 100).toFixed(2) : '0.00';
    const stdPercent = ((ENGLISH_FREQ[ch] || 0) * 100).toFixed(2);
    const bar = '█'.repeat(Math.min(20, Math.round(Number(obsPercent) * 1.5)));
    lines.push(`  ${ch}: ${obsPercent.padStart(5)}% [${count.toString().padStart(3)}] (Std: ${stdPercent.padStart(5)}%)  ${bar}`);
  }

  return {
    text: lines.join('\n'),
    meta: `Entropy ${entropy.toFixed(2)} b/B · IoC ${ioc.toFixed(4)}`,
  };
}

/**
 * Caesar Brute-Force & Frequency Auto-Solver
 */
export function caesarSolver(ctx) {
  const text = ctx.text || '';
  if (!text) return { text: '', meta: 'Input ciphertext to solve' };

  const hits = crackCaesar(text);
  const lines = [
    `=== CAESAR CIPHER AUTO-SOLVER (ALL 25 SHIFTS) ===`,
    `Ranked by Chi-Squared English frequency fitness:`,
    '',
  ];

  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const mark = i === 0 ? '★ [BEST MATCH] ' : `[#${i + 1}] `;
    lines.push(`${mark}${h.method} (Score: ${h.score})`);
    lines.push(`  ${h.text}`);
    lines.push('');
  }

  return {
    text: lines.join('\n'),
    meta: `Best: Shift ${hits[0]?.key} (Score ${hits[0]?.score})`,
  };
}

/**
 * Single-Byte XOR Keyless Auto-Solver
 */
export function xorAutoSolver(ctx) {
  let bytes = ctx.bytes;
  const input = ctx.text.trim();
  if (/^[0-9a-fA-F\s]+$/.test(input) && input.replace(/\s+/g, '').length % 2 === 0) {
    try {
      bytes = hexToBytes(input);
    } catch {}
  }

  if (!bytes || bytes.length === 0) {
    return { text: '', meta: 'Input hex bytes or text to crack XOR' };
  }

  const hits = crackSingleXor(bytes);
  if (hits.length === 0) {
    return { text: 'No printable English plaintext found with single-byte XOR.', meta: '0 matches' };
  }

  const lines = [
    `=== SINGLE-BYTE XOR AUTO-SOLVER ===`,
    `Found ${hits.length} plausible keys (Ranked by English score):`,
    '',
  ];

  for (let i = 0; i < Math.min(10, hits.length); i++) {
    const h = hits[i];
    const mark = i === 0 ? '★ [BEST KEY] ' : `[#${i + 1}] `;
    lines.push(`${mark}KEY: ${h.key} (Score: ${h.score})`);
    lines.push(`  PLAINTEXT: ${h.text}`);
    lines.push('');
  }

  return {
    text: lines.join('\n'),
    meta: `Best Key: ${hits[0]?.key}`,
  };
}

/**
 * Hash Identifier & Simple Cracker
 * Detects algorithm by hex-string length and allows targetted brute-force/dictionary attack.
 */
export async function hashCracker(ctx) {
  const input = ctx.text?.trim() || '';
  if (!input || !/^[0-9a-fA-F]+$/.test(input)) {
    return { text: 'Paste hexadecimal ciphertext to identify and crack.', meta: 'Awaiting hex...' };
  }

  const bytes = hexToBytes(input);
  const len = input.length;

  let algo = 'unknown';
  let algoName = 'Unknown Hex';

  if (len === 8) { algo = 'CRC-32'; algoName = 'CRC-32'; }
  else if (len === 32) { algo = 'MD5'; algoName = 'MD5'; }
  else if (len === 40) { algo = 'SHA-1'; algoName = 'SHA-1'; }
  else if (len === 56) { algo = 'SHA-224'; algoName = 'SHA-224'; }
  else if (len === 64) { algo = 'SHA-256'; algoName = 'SHA-256'; }
  else if (len === 96) { algo = 'SHA-384'; algoName = 'SHA-384'; }
  else if (len === 128) { algo = 'SHA-512'; algoName = 'SHA-512'; }

  const lines = [
    `=== HASH IDENTIFIER ===`,
    `Algorithm: ${algoName} (${len * 4} bits)`,
    ``,
    `To crack (Brute-force in-place):`
  ];

  if (algo === 'unknown') {
    lines.push(`Error: Unsupported hash length (${len} chars). Supported: 8, 32, 40, 56, 64, 96, 128 hex chars.`);
    return { text: lines.join('\n'), meta: 'Unsupported' };
  }

  const candidates = (ctx.fields?.dictionary || '').split('\n').map(l => l.trim()).filter(Boolean);
  if (candidates.length === 0) {
    return { text: lines.join('\n') + `\n\n[!] Add words to the dictionary text-area to run cracking.`, meta: 'Dictionary required' };
  }

  let found = null;
  for (const candidate of candidates) {
    const b = utf8Encode(candidate);
    let hexHash = '';

    if (algo === 'MD5') {
      hexHash = bytesToHex(md5bytes(b));
    } else if (algo === 'CRC-32') {
      const CRC_TABLE = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        CRC_TABLE[i] = c >>> 0;
      }
      let c = 0xffffffff;
      for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8);
      hexHash = ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
    } else {
      const hash = await crypto.subtle.digest(algo, b);
      hexHash = bytesToHex(new Uint8Array(hash));
    }

    if (hexHash.toLowerCase() === input.toLowerCase()) {
      found = candidate;
      break;
    }
  }

  if (found) {
    lines.push(`\n★ [CRACKED!]`);
    lines.push(`PLAINTEXT: ${found}`);
  } else {
    lines.push(`\n[!] No match found in dictionary.`);
  }

  return { text: lines.join('\n'), meta: `Detected ${algo}` };
}
