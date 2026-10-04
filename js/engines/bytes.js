/** Shared byte helpers. Engines import this; the DOM never does. */

export class RotorError extends Error {
  /**
   * @param {'bad-input'|'bad-key'|'auth-fail'|'unsupported'|'cancelled'} code
   * @param {string} message user-facing, specific, no trailing cheer
   */
  constructor(code, message) {
    super(message);
    this.name = 'RotorError';
    this.code = code;
  }
}

const te = new TextEncoder();
const td = new TextDecoder('utf-8', { fatal: false });
const tdFatal = new TextDecoder('utf-8', { fatal: true });

export function utf8Encode(text) {
  return te.encode(text ?? '');
}

export function utf8Decode(bytes) {
  return td.decode(bytes);
}

/** @returns {string} @throws {RotorError} */
export function utf8DecodeStrict(bytes) {
  try {
    return tdFatal.decode(bytes);
  } catch {
    throw new RotorError('bad-input', 'Bytes are not valid UTF-8.');
  }
}

export function concatBytes(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function bytesToHex(bytes) {
  const hex = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) hex[i] = bytes[i].toString(16).padStart(2, '0');
  return hex.join('');
}

export function hexToBytes(text) {
  const clean = String(text).replace(/\s+/g, '').replace(/^0x/i, '');
  if (clean.length === 0) return new Uint8Array(0);
  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    throw new RotorError('bad-input', 'Hex only accepts 0-9 a-f.');
  }
  const padded = clean.length % 2 ? '0' + clean : clean;
  const out = new Uint8Array(padded.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function bytesToB64(bytes, alphabet = B64, pad = '=') {
  let out = '';
  const n = bytes.length;
  for (let i = 0; i < n; i += 3) {
    const a = bytes[i];
    const b = i + 1 < n ? bytes[i + 1] : 0;
    const c = i + 2 < n ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += alphabet[(triple >> 18) & 63];
    out += alphabet[(triple >> 12) & 63];
    out += i + 1 < n ? alphabet[(triple >> 6) & 63] : pad;
    out += i + 2 < n ? alphabet[triple & 63] : pad;
  }
  
  return out;
}

export function b64ToBytes(text, alphabet = B64, pad = '=') {
  const clean = String(text).replace(/\s+/g, '');
  if (!clean) return new Uint8Array(0);
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i;
  if (alphabet === B64) {
    table[45] = 62; // url '-' sometimes sneaks in; reject — keep strict
  }
  let s = clean;
  if (pad) {
    const m = s.length % 4;
    if (m) s += pad.repeat(4 - m);
  }
  const out = [];
  for (let i = 0; i < s.length; i += 4) {
    const c0 = s.charCodeAt(i);
    const c1 = s.charCodeAt(i + 1);
    const c2 = s.charCodeAt(i + 2);
    const c3 = s.charCodeAt(i + 3);
    const v0 = table[c0];
    const v1 = table[c1];
    const v2 = s[i + 2] === pad || s[i + 2] === undefined ? 0 : table[c2];
    const v3 = s[i + 3] === pad || s[i + 3] === undefined ? 0 : table[c3];
    if (v0 < 0 || v1 < 0 || (s[i + 2] !== pad && s[i + 2] !== undefined && v2 < 0) || (s[i + 3] !== pad && s[i + 3] !== undefined && v3 < 0)) {
      throw new RotorError('bad-input', 'Invalid Base64 alphabet.');
    }
    const triple = (v0 << 18) | (v1 << 12) | (v2 << 6) | v3;
    out.push((triple >> 16) & 255);
    if (s[i + 2] !== pad && s[i + 2] !== undefined) out.push((triple >> 8) & 255);
    if (s[i + 3] !== pad && s[i + 3] !== undefined) out.push(triple & 255);
  }
  return new Uint8Array(out);
}

export function bytesToB64url(bytes) {
  return bytesToB64(bytes, B64URL, '');
}

export function b64urlToBytes(text) {
  const clean = String(text).replace(/\s+/g, '');
  if (!clean) return new Uint8Array(0);
  const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < B64URL.length; i++) table[B64URL.charCodeAt(i)] = i;
  table[43] = 62; // '+'
  table[47] = 63; // '/'
  const out = [];
  for (let i = 0; i < padded.length; i += 4) {
    const chars = [0, 1, 2, 3].map((k) => padded[i + k]);
    const vals = chars.map((ch) => (ch === '=' ? 0 : table[ch.charCodeAt(0)]));
    if (vals.some((v, idx) => chars[idx] !== '=' && v < 0)) {
      throw new RotorError('bad-input', 'Invalid Base64url alphabet.');
    }
    const triple = (vals[0] << 18) | (vals[1] << 12) | (vals[2] << 6) | vals[3];
    out.push((triple >> 16) & 255);
    if (chars[2] !== '=') out.push((triple >> 8) & 255);
    if (chars[3] !== '=') out.push(triple & 255);
  }
  return new Uint8Array(out);
}

export function timingSafeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

/** Rejection-sample indexes in [0, max) without modulo bias. */
export function randomIndexes(count, max) {
  if (max <= 0 || max > 256) throw new RotorError('unsupported', 'Alphabet too large for one-byte sampling.');
  const limit = 256 - (256 % max);
  const out = new Uint8Array(count);
  const buf = new Uint8Array(Math.max(count, 32));
  let filled = 0;
  while (filled < count) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && filled < count; i++) {
      if (buf[i] < limit) out[filled++] = buf[i] % max;
    }
  }
  return out;
}

export const B64_ALPHABET = B64;
export const B64URL_ALPHABET = B64URL;
