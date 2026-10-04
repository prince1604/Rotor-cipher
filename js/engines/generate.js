import { RotorError, bytesToHex, bytesToB64, randomIndexes } from './bytes.js';
import { base32Encode } from './encodings.js';
import { rsaGenerate, ecdsaGenerate } from './modern.js';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT = '0123456789';
const SYMBOL = '!@#$%^&*()-_=+[]{};:,.?';

function pick(alphabet, n) {
  const idx = randomIndexes(n, alphabet.length);
  let out = '';
  for (let i = 0; i < n; i++) out += alphabet[idx[i]];
  return out;
}

function shuffle(chars) {
  const a = chars.split('');
  const n = a.length;
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  for (let i = n - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.join('');
}

function entropyBits(alphabetSize, length) {
  return Math.floor(length * Math.log2(alphabetSize));
}

export function password(ctx) {
  const length = Number(ctx.fields?.length ?? 20);
  if (!Number.isInteger(length) || length < 8 || length > 128) {
    throw new RotorError('bad-input', 'Length must be 8–128.');
  }
  let alphabet = '';
  const classes = [];
  if (ctx.fields?.lower !== '0') { alphabet += LOWER; classes.push(LOWER); }
  if (ctx.fields?.upper !== '0') { alphabet += UPPER; classes.push(UPPER); }
  if (ctx.fields?.digits !== '0') { alphabet += DIGIT; classes.push(DIGIT); }
  if (ctx.fields?.symbols === '1') { alphabet += SYMBOL; classes.push(SYMBOL); }
  if (!alphabet) throw new RotorError('bad-input', 'Pick at least one character class.');
  if (length < classes.length) throw new RotorError('bad-input', 'Length shorter than the number of classes.');
  // guarantee one from each selected class, then fill
  let out = classes.map((c) => pick(c, 1)).join('');
  out += pick(alphabet, length - classes.length);
  out = shuffle(out);
  return { text: out, meta: `~${entropyBits(alphabet.length, length)} bits` };
}

const SYL_ONSET = 'b c d f g h j k l m n p r s t v w z br cr dr fr gr pr st tr'.split(' ');
const SYL_VOWEL = 'a e i o u a e i o u ai ea ou'.split(' ');
const SYL_CODA = ['', '', '', 'n', 'r', 'l', 's', 't'];

export function passphrase(ctx) {
  const words = Number(ctx.fields?.words ?? 5);
  if (!Number.isInteger(words) || words < 3 || words > 12) {
    throw new RotorError('bad-input', 'Words must be 3–12.');
  }
  const list = [];
  for (let w = 0; w < words; w++) {
    const syls = 2 + (randomIndexes(1, 2)[0]);
    let word = '';
    for (let s = 0; s < syls; s++) {
      word += SYL_ONSET[randomIndexes(1, SYL_ONSET.length)[0]];
      word += SYL_VOWEL[randomIndexes(1, SYL_VOWEL.length)[0]];
      word += SYL_CODA[randomIndexes(1, SYL_CODA.length)[0]];
    }
    list.push(word);
  }
  const alphabet = SYL_ONSET.length * SYL_VOWEL.length * SYL_CODA.length;
  return { text: list.join('-'), meta: `~${entropyBits(alphabet, words * 2)} bits (rough)` };
}

export function uuidv4() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = bytesToHex(b);
  const text = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  return { text, meta: 'UUIDv4' };
}

export function randomKey(ctx) {
  const bytes = Number(ctx.fields?.bytes ?? 32);
  if (![16, 24, 32, 48, 64].includes(bytes)) throw new RotorError('bad-input', 'Bytes must be 16, 24, 32, 48, or 64.');
  const fmt = ctx.fields?.format || 'hex';
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return { text: fmt === 'base64' ? bytesToB64(buf) : bytesToHex(buf), meta: `${bytes * 8}-bit` };
}

export function aesKey() {
  const buf = crypto.getRandomValues(new Uint8Array(32));
  return { text: bytesToHex(buf), meta: 'AES-256 raw' };
}

export async function rsaPem(ctx) {
  const bits = Number(ctx.fields?.bits ?? 2048);
  if (![2048, 4096].includes(bits)) throw new RotorError('bad-input', 'RSA bits must be 2048 or 4096.');
  const pair = await rsaGenerate(bits);
  return {
    text: `${pair.privatePem}\n\n${pair.publicPem}`,
    meta: `RSA-${bits} OAEP`,
  };
}

export async function ecdsaPem() {
  const pair = await ecdsaGenerate();
  return {
    text: `${pair.privatePem}\n\n${pair.publicPem}`,
    meta: 'ECDSA P-256',
  };
}

export function totpSecret() {
  const buf = crypto.getRandomValues(new Uint8Array(20));
  return { text: base32Encode(buf).replace(/=+$/, ''), meta: '160-bit · Base32' };
}
