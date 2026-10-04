import {
  RotorError,
  utf8Encode,
  utf8DecodeStrict,
  concatBytes,
  bytesToB64url,
  b64urlToBytes,
} from './bytes.js';
import { base32Encode, base32Decode } from './encodings.js';

const PBKDF2_ITERS = 210_000;
const GCM_PREFIX = 'rotor1.';
const CBC_PREFIX = 'rotor1cbc.';

async function deriveAesKey(password, salt, usages) {
  const base = await crypto.subtle.importKey('raw', utf8Encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERS },
    base,
    { name: usages.includes('encrypt') || usages.includes('decrypt') ? (usages.alg || 'AES-GCM') : 'AES-GCM', length: 256 },
    false,
    usages.filter((u) => u === 'encrypt' || u === 'decrypt'),
  );
}

async function pbkdf2Key(password, salt, algo, usages) {
  const base = await crypto.subtle.importKey('raw', utf8Encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERS },
    base,
    { name: algo, length: 256 },
    false,
    usages,
  );
}

export async function aesGcm(ctx) {
  const password = ctx.fields?.password ?? '';
  if (!password) throw new RotorError('bad-key', 'Password required.');
  if (ctx.mode === 'encrypt') {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await pbkdf2Key(password, salt, 'AES-GCM', ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ctx.bytes));
    return {
      text: `${GCM_PREFIX}${bytesToB64url(salt)}.${bytesToB64url(iv)}.${bytesToB64url(ct)}`,
      meta: `PBKDF2 ${PBKDF2_ITERS} · AES-GCM-256`,
    };
  }
  const raw = ctx.text.trim();
  if (!raw.startsWith(GCM_PREFIX)) throw new RotorError('bad-input', 'Not a rotor1 AES-GCM envelope.');
  const parts = raw.slice(GCM_PREFIX.length).split('.');
  if (parts.length !== 3) throw new RotorError('bad-input', 'Envelope must be rotor1.salt.iv.ciphertext.');
  let salt, iv, ct;
  try {
    salt = b64urlToBytes(parts[0]);
    iv = b64urlToBytes(parts[1]);
    ct = b64urlToBytes(parts[2]);
  } catch {
    throw new RotorError('bad-input', 'Envelope fields are not Base64url.');
  }
  if (salt.length !== 16 || iv.length !== 12 || ct.length < 16) {
    throw new RotorError('bad-input', 'Envelope lengths look wrong.');
  }
  const key = await pbkdf2Key(password, salt, 'AES-GCM', ['decrypt']);
  try {
    const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ct));
    return { text: utf8DecodeStrict(pt), meta: 'AES-GCM authenticated' };
  } catch {
    throw new RotorError('auth-fail', 'Auth tag mismatch — ciphertext was changed or the password is wrong.');
  }
}

function pkcs7Pad(bytes) {
  const pad = 16 - (bytes.length % 16);
  const out = new Uint8Array(bytes.length + pad);
  out.set(bytes);
  out.fill(pad, bytes.length);
  return out;
}

function pkcs7Unpad(bytes) {
  if (!bytes.length || bytes.length % 16) throw new RotorError('bad-input', 'CBC ciphertext length is not a block multiple.');
  const pad = bytes[bytes.length - 1];
  if (pad < 1 || pad > 16) throw new RotorError('bad-input', 'CBC padding is invalid.');
  for (let i = bytes.length - pad; i < bytes.length; i++) {
    if (bytes[i] !== pad) throw new RotorError('bad-input', 'CBC padding is invalid.');
  }
  return bytes.subarray(0, bytes.length - pad);
}

export async function aesCbc(ctx) {
  const password = ctx.fields?.password ?? '';
  if (!password) throw new RotorError('bad-key', 'Password required.');
  if (ctx.mode === 'encrypt') {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const key = await pbkdf2Key(password, salt, 'AES-CBC', ['encrypt']);
    const padded = pkcs7Pad(ctx.bytes);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, padded));
    return {
      text: `${CBC_PREFIX}${bytesToB64url(salt)}.${bytesToB64url(iv)}.${bytesToB64url(ct)}`,
      meta: `PBKDF2 ${PBKDF2_ITERS} · AES-CBC-256 · unauthenticated`,
    };
  }
  const raw = ctx.text.trim();
  if (!raw.startsWith(CBC_PREFIX)) throw new RotorError('bad-input', 'Not a rotor1cbc AES-CBC envelope.');
  const parts = raw.slice(CBC_PREFIX.length).split('.');
  if (parts.length !== 3) throw new RotorError('bad-input', 'Envelope must be rotor1cbc.salt.iv.ciphertext.');
  let salt, iv, ct;
  try {
    salt = b64urlToBytes(parts[0]);
    iv = b64urlToBytes(parts[1]);
    ct = b64urlToBytes(parts[2]);
  } catch {
    throw new RotorError('bad-input', 'Envelope fields are not Base64url.');
  }
  if (salt.length !== 16 || iv.length !== 16) throw new RotorError('bad-input', 'Envelope lengths look wrong.');
  const key = await pbkdf2Key(password, salt, 'AES-CBC', ['decrypt']);
  try {
    const padded = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ct));
    const pt = pkcs7Unpad(padded);
    return { text: utf8DecodeStrict(pt), meta: 'AES-CBC · no authenticity' };
  } catch (err) {
    if (err instanceof RotorError) throw err;
    throw new RotorError('bad-key', 'Decrypt failed — wrong password or corrupt ciphertext.');
  }
}

/* ---------- RSA-OAEP + ECDSA, PEM ---------- */

function derToPem(bytes, label) {
  const b64 = btoa(String.fromCharCode(...bytes));
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

function pemToDer(pem, expect) {
  const m = String(pem).match(/-----BEGIN ([^-]+)-----([A-Za-z0-9+/=\s]+)-----END \1-----/);
  if (!m) throw new RotorError('bad-key', 'Need a PEM block.');
  if (expect && m[1] !== expect) throw new RotorError('bad-key', `Expected ${expect} PEM.`);
  const b64 = m[2].replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return { der: out, label: m[1] };
}

export async function rsaGenerate(bits = 2048) {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );
  const pub = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
  const priv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  return {
    publicPem: derToPem(pub, 'PUBLIC KEY'),
    privatePem: derToPem(priv, 'PRIVATE KEY'),
  };
}

export async function rsaOaep(ctx) {
  if (ctx.mode === 'encrypt') {
    const pem = ctx.fields?.pubkey || ctx.fields?.pem || '';
    if (!pem) throw new RotorError('bad-key', 'Public key PEM required.');
    const { der } = pemToDer(pem, 'PUBLIC KEY');
    const key = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    try {
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, ctx.bytes));
      return { text: bytesToB64url(ct), meta: 'RSA-OAEP SHA-256' };
    } catch {
      throw new RotorError('bad-input', 'Message is too long for this RSA key.');
    }
  }
  const pem = ctx.fields?.privkey || ctx.fields?.pem || '';
  if (!pem) throw new RotorError('bad-key', 'Private key PEM required.');
  const { der } = pemToDer(pem, 'PRIVATE KEY');
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  try {
    const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, b64urlToBytes(ctx.text.trim())));
    return { text: utf8DecodeStrict(pt), meta: 'RSA-OAEP' };
  } catch {
    throw new RotorError('bad-key', 'RSA decrypt failed — wrong key or corrupt ciphertext.');
  }
}

export async function ecdsaGenerate() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
  const priv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  return {
    publicPem: derToPem(pub, 'PUBLIC KEY'),
    privatePem: derToPem(priv, 'PRIVATE KEY'),
  };
}

export async function ecdsa(ctx) {
  if (ctx.mode === 'sign') {
    const pem = ctx.fields?.privkey || ctx.fields?.pem || '';
    if (!pem) throw new RotorError('bad-key', 'Private key PEM required.');
    const { der } = pemToDer(pem, 'PRIVATE KEY');
    const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, ctx.bytes));
    return { text: bytesToB64url(sig), meta: 'ECDSA P-256 SHA-256' };
  }
  const pem = ctx.fields?.pubkey || ctx.fields?.pem || '';
  const sigText = ctx.fields?.signature || '';
  if (!pem) throw new RotorError('bad-key', 'Public key PEM required.');
  if (!sigText) throw new RotorError('bad-input', 'Signature (Base64url) required.');
  const { der } = pemToDer(pem, 'PUBLIC KEY');
  const key = await crypto.subtle.importKey('spki', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlToBytes(sigText.trim()), ctx.bytes);
  if (!ok) throw new RotorError('auth-fail', 'Signature does not match this message and key.');
  return { text: 'valid', meta: 'ECDSA P-256 verified' };
}

/* ---------- TOTP RFC 6238 ---------- */

async function hotp(secretBytes, counter, digits, hash) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // JS cannot represent full uint64; TOTP counters fit in 32 bits for centuries.
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const off = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  const mod = 10 ** digits;
  return String(bin % mod).padStart(digits, '0');
}

export async function totp(ctx) {
  const secret = (ctx.fields?.secret || '').replace(/\s+/g, '');
  if (!secret) throw new RotorError('bad-key', 'TOTP secret (Base32) required.');
  const digits = Number(ctx.fields?.digits ?? 6);
  if (![6, 7, 8].includes(digits)) throw new RotorError('bad-input', 'Digits must be 6, 7, or 8.');
  const period = Number(ctx.fields?.period ?? 30);
  if (!Number.isInteger(period) || period < 1) throw new RotorError('bad-input', 'Period must be a positive integer.');
  const hash = ctx.fields?.hash || 'SHA-1';
  const secretBytes = base32Decode(secret);
  if (!secretBytes.length) throw new RotorError('bad-key', 'TOTP secret decoded empty.');
  const now = ctx.fields?._now != null ? Number(ctx.fields._now) : Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / period);
  const remain = period - (now % period);
  const code = await hotp(secretBytes, counter, digits, hash);
  return { text: code, meta: `${remain}s left · HMAC-${hash}` };
}

export { PBKDF2_ITERS, GCM_PREFIX, CBC_PREFIX, pemToDer, derToPem, hotp };
