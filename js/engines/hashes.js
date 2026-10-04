import { RotorError, utf8Encode, bytesToHex, bytesToB64, hexToBytes } from './bytes.js';

function format(bytes, fmt) {
  return fmt === 'base64' ? bytesToB64(bytes) : bytesToHex(bytes);
}

async function subtleDigest(algo, bytes) {
  const buf = await crypto.subtle.digest(algo, bytes);
  return new Uint8Array(buf);
}

export async function sha(ctx, algo) {
  const fmt = ctx.fields?.format || 'hex';
  const bytes = await subtleDigest(algo, ctx.bytes);
  return { text: format(bytes, fmt), meta: `${bytes.length * 8}-bit` };
}

export const sha1 = (ctx) => sha(ctx, 'SHA-1');
export const sha256 = (ctx) => sha(ctx, 'SHA-256');
export const sha384 = (ctx) => sha(ctx, 'SHA-384');
export const sha512 = (ctx) => sha(ctx, 'SHA-512');

export async function hmac(ctx, algo) {
  const keyText = ctx.fields?.key ?? '';
  if (!keyText) throw new RotorError('bad-key', 'HMAC key is required.');
  const fmt = ctx.fields?.format || 'hex';
  const key = await crypto.subtle.importKey(
    'raw',
    utf8Encode(keyText),
    { name: 'HMAC', hash: algo },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, ctx.bytes);
  const bytes = new Uint8Array(sig);
  return { text: format(bytes, fmt), meta: `${algo} · ${bytes.length * 8}-bit` };
}

export const hmacSha256 = (ctx) => hmac(ctx, 'SHA-256');
export const hmacSha512 = (ctx) => hmac(ctx, 'SHA-512');

export async function pbkdf2(ctx) {
  const password = ctx.fields?.password ?? '';
  if (!password) throw new RotorError('bad-key', 'Password required.');
  const saltText = ctx.fields?.salt ?? '';
  if (!saltText) throw new RotorError('bad-input', 'Salt required (any text).');
  const iterations = Number(ctx.fields?.iterations ?? 210000);
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new RotorError('bad-input', 'Iterations must be a positive integer.');
  }
  if (iterations > 5_000_000) throw new RotorError('bad-input', 'Iterations capped at 5,000,000.');
  const length = Number(ctx.fields?.length ?? 32);
  if (![16, 24, 32, 48, 64].includes(length)) {
    throw new RotorError('bad-input', 'Length must be 16, 24, 32, 48, or 64 bytes.');
  }
  const key = await crypto.subtle.importKey('raw', utf8Encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: utf8Encode(saltText), iterations },
    key,
    length * 8,
  );
  const bytes = new Uint8Array(bits);
  const fmt = ctx.fields?.format || 'hex';
  return { text: format(bytes, fmt), meta: `${iterations} rounds · ${length * 8}-bit` };
}

/* MD5 — RFC 1321 portable. Not Subtle Crypto. */

function md5bytes(bytes) {
  const n = bytes.length;
  const bitLen = n * 8;
  const paddedLen = (((n + 8) >> 6) + 1) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(bytes);
  buf[n] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, bitLen >>> 0, true);
  view.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  const rol = (x, c) => (x << c) | (x >>> (32 - c));
  const M = new Uint32Array(16);

  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const tmp = D;
      D = C;
      C = B;
      B = (B + rol((A + F + K[i] + M[g]) >>> 0, s[i])) >>> 0;
      A = tmp;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, a0, true);
  ov.setUint32(4, b0, true);
  ov.setUint32(8, c0, true);
  ov.setUint32(12, d0, true);
  return out;
}

export function md5(ctx) {
  const fmt = ctx.fields?.format || 'hex';
  const bytes = md5bytes(ctx.bytes);
  return { text: format(bytes, fmt), meta: '128-bit · not for secrets' };
}

/* CRC-32 ISO 3309 / PNG polynomial 0xEDB88320 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(ctx) {
  let c = 0xffffffff;
  const b = ctx.bytes;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8);
  const n = (c ^ 0xffffffff) >>> 0;
  return { text: n.toString(16).padStart(8, '0'), meta: 'CRC-32' };
}

export { md5bytes };
