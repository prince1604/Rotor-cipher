import { RotorError } from './bytes.js';

function wrap(text) {
  return { text };
}

function lettersOnly(s) {
  return s.toUpperCase().replace(/[^A-Z]/g, '');
}

function isLetter(c) {
  return c >= 'A' && c <= 'Z';
}

function shiftChar(ch, k) {
  const up = ch.toUpperCase();
  if (up < 'A' || up > 'Z') return ch;
  const base = ch === up ? 65 : 97;
  return String.fromCharCode(((ch.charCodeAt(0) - base + k + 26) % 26) + base);
}

export function caesar(ctx) {
  const shift = Number(ctx.fields?.shift ?? 13);
  if (!Number.isInteger(shift)) throw new RotorError('bad-input', 'Shift must be an integer.');
  const k = ((shift % 26) + 26) % 26;
  const dir = ctx.mode === 'decode' ? -k : k;
  return wrap([...ctx.text].map((ch) => shiftChar(ch, dir)).join(''));
}

export function rot13(ctx) {
  return wrap([...ctx.text].map((ch) => shiftChar(ch, 13)).join(''));
}

export function rot47(ctx) {
  return wrap([...ctx.text].map((ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 33 && c <= 126) return String.fromCharCode(33 + ((c - 33 + 47) % 94));
    return ch;
  }).join(''));
}

export function atbash(ctx) {
  return wrap([...ctx.text].map((ch) => {
    const up = ch.toUpperCase();
    if (up < 'A' || up > 'Z') return ch;
    const flipped = String.fromCharCode(90 - (up.charCodeAt(0) - 65));
    return ch === up ? flipped : flipped.toLowerCase();
  }).join(''));
}

function modInverse(a, m) {
  let t = 0, newt = 1, r = m, newr = ((a % m) + m) % m;
  while (newr !== 0) {
    const q = Math.floor(r / newr);
    [t, newt] = [newt, t - q * newt];
    [r, newr] = [newr, r - q * newr];
  }
  if (r > 1) return null;
  if (t < 0) t += m;
  return t;
}

export function affine(ctx) {
  const a = Number(ctx.fields?.a ?? 5);
  const b = Number(ctx.fields?.b ?? 8);
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new RotorError('bad-input', 'a and b must be integers.');
  const inv = modInverse(a, 26);
  if (inv == null) throw new RotorError('bad-input', 'a must be coprime with 26 (try 1,3,5,7,9,11,15,17,19,21,23,25).');
  const encode = ctx.mode !== 'decode';
  return wrap([...ctx.text].map((ch) => {
    const up = ch.toUpperCase();
    if (up < 'A' || up > 'Z') return ch;
    const x = up.charCodeAt(0) - 65;
    const y = encode ? (a * x + b) % 26 : (inv * (x - b + 26 * 26)) % 26;
    const out = String.fromCharCode(65 + y);
    return ch === up ? out : out.toLowerCase();
  }).join(''));
}

function vigKey(key) {
  const k = lettersOnly(key || '');
  if (!k) throw new RotorError('bad-key', 'Key must contain at least one A–Z letter.');
  return k;
}

function vigTransform(text, key, mode, beaufort = false, autokey = false) {
  const k0 = vigKey(key);
  let k = k0;
  let ki = 0;
  let extra = '';
  return [...text].map((ch) => {
    const up = ch.toUpperCase();
    if (up < 'A' || up > 'Z') return ch;
    if (autokey && ki >= k.length) k = k0 + extra;
    const kv = k[ki % k.length].charCodeAt(0) - 65;
    const p = up.charCodeAt(0) - 65;
    let c;
    if (beaufort) c = (kv - p + 26) % 26;
    else if (mode === 'decode') c = (p - kv + 26) % 26;
    else c = (p + kv) % 26;
    const out = String.fromCharCode(65 + c);
    if (autokey) extra += mode === 'decode' ? out : up;
    ki++;
    return ch === up ? out : out.toLowerCase();
  }).join('');
}

export function vigenere(ctx) {
  return wrap(vigTransform(ctx.text, ctx.fields?.key, ctx.mode, false, false));
}

export function beaufort(ctx) {
  return wrap(vigTransform(ctx.text, ctx.fields?.key, ctx.mode, true, false));
}

export function autokey(ctx) {
  return wrap(vigTransform(ctx.text, ctx.fields?.key, ctx.mode, false, true));
}

/* Playfair — 5x5, J→I, X pad. */

function playfairSquare(key) {
  const seen = new Set();
  const cells = [];
  const src = lettersOnly((key || '') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ').replace(/J/g, 'I');
  for (const ch of src) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    cells.push(ch);
  }
  const pos = {};
  cells.forEach((ch, i) => { pos[ch] = [Math.floor(i / 5), i % 5]; });
  return { cells, pos };
}

function playfairPairs(s, encode) {
  const out = [];
  let i = 0;
  const letters = lettersOnly(s).replace(/J/g, 'I');
  while (i < letters.length) {
    let a = letters[i++];
    let b = i < letters.length ? letters[i] : 'X';
    if (a === b) b = 'X';
    else i++;
    out.push([a, b]);
  }
  if (encode && out.length && out[out.length - 1][1] === undefined) out[out.length - 1][1] = 'X';
  return out;
}

export function playfair(ctx) {
  const { cells, pos } = playfairSquare(ctx.fields?.key);
  const encode = ctx.mode !== 'decode';
  const dir = encode ? 1 : 4;
  const pairs = playfairPairs(ctx.text, encode);
  const chars = pairs.map(([a, b]) => {
    const [r1, c1] = pos[a];
    const [r2, c2] = pos[b];
    if (r1 === r2) return cells[r1 * 5 + ((c1 + dir) % 5)] + cells[r2 * 5 + ((c2 + dir) % 5)];
    if (c1 === c2) return cells[((r1 + dir) % 5) * 5 + c1] + cells[((r2 + dir) % 5) * 5 + c2];
    return cells[r1 * 5 + c2] + cells[r2 * 5 + c1];
  }).join('');
  return wrap(chars);
}

export function railFence(ctx) {
  const rails = Number(ctx.fields?.rails ?? 3);
  if (!Number.isInteger(rails) || rails < 2) throw new RotorError('bad-input', 'Rails must be an integer ≥ 2.');
  const s = ctx.text;
  if (ctx.mode !== 'decode') {
    const rows = Array.from({ length: rails }, () => []);
    let r = 0, dir = 1;
    for (const ch of s) {
      rows[r].push(ch);
      r += dir;
      if (r === 0 || r === rails - 1) dir *= -1;
    }
    return wrap(rows.map((row) => row.join('')).join(''));
  }
  const n = s.length;
  const pattern = [];
  let r = 0, dir = 1;
  for (let i = 0; i < n; i++) {
    pattern.push(r);
    r += dir;
    if (r === 0 || r === rails - 1) dir *= -1;
  }
  const counts = Array(rails).fill(0);
  pattern.forEach((p) => counts[p]++);
  const buckets = [];
  let o = 0;
  for (let i = 0; i < rails; i++) {
    buckets.push(s.slice(o, o + counts[i]).split(''));
    o += counts[i];
  }
  return wrap(pattern.map((p) => buckets[p].shift()).join(''));
}

export function columnar(ctx) {
  const key = lettersOnly(ctx.fields?.key || '');
  if (!key) throw new RotorError('bad-key', 'Key must contain A–Z letters.');
  const order = key.split('').map((ch, i) => ({ ch, i })).sort((a, b) => a.ch.localeCompare(b.ch) || a.i - b.i).map((x) => x.i);
  const cols = key.length;
  if (ctx.mode !== 'decode') {
    const s = ctx.text;
    const rows = Math.ceil(s.length / cols);
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => s[r * cols + c] ?? 'X'));
    return wrap(order.map((c) => grid.map((row) => row[c]).join('')).join(''));
  }
  const s = ctx.text;
  const rows = Math.ceil(s.length / cols);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(''));
  let o = 0;
  for (const c of order) {
    for (let r = 0; r < rows; r++) {
      if (o < s.length) grid[r][c] = s[o++];
    }
  }
  return wrap(grid.map((row) => row.join('')).join('').replace(/X+$/, ''));
}

const BACON = {
  A: 'aaaaa', B: 'aaaab', C: 'aaaba', D: 'aaabb', E: 'aabaa', F: 'aabab',
  G: 'aabba', H: 'aabbb', I: 'abaaa', J: 'abaaa', K: 'abaab', L: 'ababa',
  M: 'ababb', N: 'abbaa', O: 'abbab', P: 'abbba', Q: 'abbbb', R: 'baaaa',
  S: 'baaab', T: 'baaba', U: 'baabb', V: 'baabb', W: 'babaa', X: 'babab',
  Y: 'babba', Z: 'babbb',
};
const BACON_REV = {};
for (const [k, v] of Object.entries(BACON)) if (!BACON_REV[v]) BACON_REV[v] = k;

export function baconian(ctx) {
  if (ctx.mode !== 'decode') {
    return wrap(lettersOnly(ctx.text).split('').map((ch) => BACON[ch]).join(' '));
  }
  const parts = ctx.text.toLowerCase().replace(/[^ab\s]/g, '').trim().split(/\s+/);
  return wrap(parts.map((p) => {
    const ch = BACON_REV[p];
    if (!ch) throw new RotorError('bad-input', `Unknown Bacon code “${p}”.`);
    return ch;
  }).join(''));
}

export function polybius(ctx) {
  const square = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // J=I
  const pos = {};
  for (let i = 0; i < 25; i++) pos[square[i]] = `${Math.floor(i / 5) + 1}${ (i % 5) + 1 }`;
  if (ctx.mode !== 'decode') {
    return wrap(lettersOnly(ctx.text).replace(/J/g, 'I').split('').map((ch) => pos[ch]).join(' '));
  }
  const digits = ctx.text.replace(/\D/g, '');
  if (digits.length % 2) throw new RotorError('bad-input', 'Polybius needs an even number of digits.');
  let out = '';
  for (let i = 0; i < digits.length; i += 2) {
    const r = Number(digits[i]) - 1;
    const c = Number(digits[i + 1]) - 1;
    if (r < 0 || r > 4 || c < 0 || c > 4) throw new RotorError('bad-input', 'Polybius digits must be 1–5.');
    out += square[r * 5 + c];
  }
  return wrap(out);
}

export function substitution(ctx) {
  const mapStr = lettersOnly(ctx.fields?.alphabet || '');
  if (mapStr.length !== 26 || new Set(mapStr).size !== 26) {
    throw new RotorError('bad-key', 'Substitution alphabet must be 26 unique letters.');
  }
  const encode = ctx.mode !== 'decode';
  const fwd = {};
  const rev = {};
  for (let i = 0; i < 26; i++) {
    const from = String.fromCharCode(65 + i);
    fwd[from] = mapStr[i];
    rev[mapStr[i]] = from;
  }
  const table = encode ? fwd : rev;
  return wrap([...ctx.text].map((ch) => {
    const up = ch.toUpperCase();
    if (!table[up]) return ch;
    const out = table[up];
    return ch === up ? out : out.toLowerCase();
  }).join(''));
}

export function xorRepeat(ctx) {
  const keyHex = (ctx.fields?.key || '').replace(/\s+/g, '');
  if (!keyHex) throw new RotorError('bad-key', 'XOR key is hex bytes, e.g. 6b6579.');
  if (!/^[0-9a-fA-F]+$/.test(keyHex) || keyHex.length % 2) {
    throw new RotorError('bad-key', 'XOR key must be even-length hex.');
  }
  const key = new Uint8Array(keyHex.length / 2);
  for (let i = 0; i < key.length; i++) key[i] = parseInt(keyHex.slice(i * 2, i * 2 + 2), 16);
  const src = ctx.mode === 'decode'
    ? Uint8Array.from(ctx.text.trim().match(/.{1,2}/g) || [], (h) => parseInt(h, 16))
    : ctx.bytes;
  if (ctx.mode === 'decode' && /[^0-9a-fA-F\s]/.test(ctx.text)) {
    throw new RotorError('bad-input', 'XOR decode expects hex ciphertext.');
  }
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i] ^ key[i % key.length];
  if (ctx.mode === 'decode') {
    return wrap(new TextDecoder().decode(out));
  }
  return wrap([...out].map((b) => b.toString(16).padStart(2, '0')).join(''));
}

/* ---------- Enigma M3 ----------
   Rotors I–V, reflector UKW-B, plugboard.
   Rings 01–26 (Ringstellung). Windows A–Z (Grundstellung).
   Double-stepping as on the Wehrmacht M3.
   Encoding is reciprocal — decode is the same path with the same settings.
*/

const ROTORS = {
  I:   { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  II:  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
  IV:  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  V:   { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' },
};
const REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';

function enigmaPlug(board) {
  const map = {};
  for (let i = 0; i < 26; i++) map[String.fromCharCode(65 + i)] = String.fromCharCode(65 + i);
  const pairs = String(board || '').toUpperCase().replace(/[^A-Z]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const used = new Set();
  for (const p of pairs) {
    if (p.length !== 2) throw new RotorError('bad-key', 'Plugboard pairs look like AB CD EF.');
    const [a, b] = p;
    if (used.has(a) || used.has(b)) throw new RotorError('bad-key', `Plugboard letter ${a}${b} reused.`);
    used.add(a); used.add(b);
    map[a] = b; map[b] = a;
  }
  return map;
}

function rotorFwd(wiring, ch, offset, ring) {
  const inPos = (ch.charCodeAt(0) - 65 + offset - ring + 26) % 26;
  const wired = wiring[inPos];
  return String.fromCharCode(((wired.charCodeAt(0) - 65 - offset + ring + 26) % 26) + 65);
}

function rotorRev(wiring, ch, offset, ring) {
  const inPos = (ch.charCodeAt(0) - 65 + offset - ring + 26) % 26;
  const letter = String.fromCharCode(inPos + 65);
  const idx = wiring.indexOf(letter);
  return String.fromCharCode(((idx - offset + ring + 26) % 26) + 65);
}

export function enigma(ctx) {
  const names = [ctx.fields?.r1 || 'I', ctx.fields?.r2 || 'II', ctx.fields?.r3 || 'III'];
  for (const n of names) if (!ROTORS[n]) throw new RotorError('bad-key', `Unknown rotor ${n}.`);
  const rings = [ctx.fields?.ring1, ctx.fields?.ring2, ctx.fields?.ring3].map((v) => {
    const n = Number(v ?? 1);
    if (!Number.isInteger(n) || n < 1 || n > 26) throw new RotorError('bad-key', 'Rings are 01–26.');
    return n - 1;
  });
  const windows = [ctx.fields?.w1 || 'A', ctx.fields?.w2 || 'A', ctx.fields?.w3 || 'A'].map((w) => {
    const ch = String(w).toUpperCase()[0];
    if (!ch || ch < 'A' || ch > 'Z') throw new RotorError('bad-key', 'Windows are A–Z.');
    return ch.charCodeAt(0) - 65;
  });
  const plug = enigmaPlug(ctx.fields?.plugboard);
  const rotors = names.map((n) => ROTORS[n]);
  const pos = windows.slice();

  const step = () => {
    // right rotor always steps; middle double-steps at its notch
    const middleAtNotch = String.fromCharCode(65 + pos[1]) === rotors[1].notch;
    const rightAtNotch = String.fromCharCode(65 + pos[2]) === rotors[2].notch;
    if (middleAtNotch) {
      pos[0] = (pos[0] + 1) % 26;
      pos[1] = (pos[1] + 1) % 26;
    }
    if (rightAtNotch) pos[1] = (pos[1] + 1) % 26;
    pos[2] = (pos[2] + 1) % 26;
  };

  let out = '';
  for (const raw of ctx.text) {
    const up = raw.toUpperCase();
    if (up < 'A' || up > 'Z') {
      out += raw;
      continue;
    }
    step();
    let ch = plug[up];
    ch = rotorFwd(rotors[2].wiring, ch, pos[2], rings[2]);
    ch = rotorFwd(rotors[1].wiring, ch, pos[1], rings[1]);
    ch = rotorFwd(rotors[0].wiring, ch, pos[0], rings[0]);
    ch = REFLECTOR_B[ch.charCodeAt(0) - 65];
    ch = rotorRev(rotors[0].wiring, ch, pos[0], rings[0]);
    ch = rotorRev(rotors[1].wiring, ch, pos[1], rings[1]);
    ch = rotorRev(rotors[2].wiring, ch, pos[2], rings[2]);
    ch = plug[ch];
    out += raw === up ? ch : ch.toLowerCase();
  }
  return wrap(out);
}
