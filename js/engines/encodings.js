import {
  RotorError,
  utf8Encode,
  utf8Decode,
  utf8DecodeStrict,
  bytesToHex,
  hexToBytes,
  bytesToB64,
  b64ToBytes,
  bytesToB64url,
  b64urlToBytes,
  B64_ALPHABET,
  B64URL_ALPHABET,
} from './bytes.js';

function wrap(text) {
  return { text };
}

/* ---------- Base64 / Base64url ---------- */

export function base64(ctx) {
  if (ctx.mode === 'encode') return wrap(bytesToB64(ctx.bytes, B64_ALPHABET, '='));
  return wrap(utf8Decode(b64ToBytes(ctx.text, B64_ALPHABET, '=')));
}

export function base64url(ctx) {
  if (ctx.mode === 'encode') return wrap(bytesToB64url(ctx.bytes));
  return wrap(utf8Decode(b64urlToBytes(ctx.text)));
}

/* ---------- Base32 RFC 4648 ---------- */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  while (out.length % 8) out += '=';
  return out;
}

export function base32Decode(text) {
  const clean = String(text).replace(/\s+/g, '').replace(/=+$/, '').toUpperCase();
  if (!clean) return new Uint8Array(0);
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < B32.length; i++) table[B32.charCodeAt(i)] = i;
  let bits = 0;
  let value = 0;
  const out = [];
  for (let i = 0; i < clean.length; i++) {
    const v = table[clean.charCodeAt(i)];
    if (v < 0) throw new RotorError('bad-input', 'Invalid Base32 alphabet.');
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function base32(ctx) {
  if (ctx.mode === 'encode') return wrap(base32Encode(ctx.bytes));
  return wrap(utf8Decode(base32Decode(ctx.text)));
}

/* ---------- Base58 Bitcoin ---------- */

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Encode(bytes) {
  if (!bytes.length) return '';
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const size = Math.ceil(((bytes.length - zeros) * 138) / 100) + 1;
  const b = new Uint8Array(size);
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = size - 1; j >= 0; j--) {
      carry += 256 * b[j];
      b[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
  }
  let it = 0;
  while (it < size && b[it] === 0) it++;
  let out = '1'.repeat(zeros);
  for (; it < size; it++) out += B58[b[it]];
  return out;
}

export function base58Decode(text) {
  const s = String(text).replace(/\s+/g, '');
  if (!s) return new Uint8Array(0);
  let zeros = 0;
  while (zeros < s.length && s[zeros] === '1') zeros++;
  const size = Math.ceil((s.length * 733) / 1000) + 1;
  const b = new Uint8Array(size);
  for (let i = zeros; i < s.length; i++) {
    const ch = s[i];
    const v = B58.indexOf(ch);
    if (v < 0) throw new RotorError('bad-input', 'Invalid Base58 alphabet.');
    let carry = v;
    for (let j = size - 1; j >= 0; j--) {
      carry += 58 * b[j];
      b[j] = carry & 255;
      carry >>= 8;
    }
  }
  let it = 0;
  while (it < size && b[it] === 0) it++;
  const out = new Uint8Array(zeros + (size - it));
  out.fill(0, 0, zeros);
  out.set(b.subarray(it), zeros);
  return out;
}

export function base58(ctx) {
  if (ctx.mode === 'encode') return wrap(base58Encode(ctx.bytes));
  return wrap(utf8Decode(base58Decode(ctx.text)));
}

/* ---------- ASCII85 / Adobe ---------- */

export function ascii85Encode(bytes) {
  let out = '<~';
  const n = bytes.length;
  for (let i = 0; i < n; i += 4) {
    const a = bytes[i];
    const b = i + 1 < n ? bytes[i + 1] : 0;
    const c = i + 2 < n ? bytes[i + 2] : 0;
    const d = i + 3 < n ? bytes[i + 3] : 0;
    let v = ((a * 256 + b) * 256 + c) * 256 + d;
    if (v === 0 && i + 4 <= n) {
      out += 'z';
      continue;
    }
    const chunk = [];
    for (let k = 0; k < 5; k++) {
      chunk.push(String.fromCharCode(33 + (v % 85)));
      v = Math.floor(v / 85);
    }
    const keep = i + 4 <= n ? 5 : (n - i) + 1;
    out += chunk.reverse().join('').slice(0, keep);
  }
  return out + '~>';
}

export function ascii85Decode(text) {
  let s = String(text).replace(/\s+/g, '');
  if (s.startsWith('<~')) s = s.slice(2);
  if (s.endsWith('~>')) s = s.slice(0, -2);
  const out = [];
  const buf = [];
  const flush = (pad) => {
    while (buf.length < 5) buf.push(84);
    let v = 0;
    for (let i = 0; i < 5; i++) v = v * 85 + buf[i];
    const bytes = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    const keep = 4 - pad;
    for (let i = 0; i < keep; i++) out.push(bytes[i]);
    buf.length = 0;
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === 'z') {
      if (buf.length) throw new RotorError('bad-input', 'ASCII85 z in the middle of a tuple.');
      out.push(0, 0, 0, 0);
      continue;
    }
    const v = ch.charCodeAt(0) - 33;
    if (v < 0 || v > 84) throw new RotorError('bad-input', 'Invalid ASCII85 character.');
    buf.push(v);
    if (buf.length === 5) flush(0);
  }
  if (buf.length) {
    const pad = 5 - buf.length;
    flush(pad);
  }
  return new Uint8Array(out);
}

export function ascii85(ctx) {
  if (ctx.mode === 'encode') return wrap(ascii85Encode(ctx.bytes));
  return wrap(utf8Decode(ascii85Decode(ctx.text)));
}

/* ---------- Hex / binary / octal ---------- */

export function hex(ctx) {
  if (ctx.mode === 'encode') return wrap(bytesToHex(ctx.bytes));
  return wrap(utf8Decode(hexToBytes(ctx.text)));
}

export function binary(ctx) {
  if (ctx.mode === 'encode') {
    return wrap([...ctx.bytes].map((b) => b.toString(2).padStart(8, '0')).join(' '));
  }
  const clean = ctx.text.replace(/[^01]/g, '');
  if (clean.length % 8) throw new RotorError('bad-input', 'Binary length must be a multiple of 8 bits.');
  const out = new Uint8Array(clean.length / 8);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
  return wrap(utf8Decode(out));
}

export function octal(ctx) {
  if (ctx.mode === 'encode') {
    return wrap([...ctx.bytes].map((b) => b.toString(8).padStart(3, '0')).join(' '));
  }
  const parts = ctx.text.trim().split(/[\s,]+/).filter(Boolean);
  const out = new Uint8Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    if (!/^[0-7]{1,3}$/.test(parts[i])) throw new RotorError('bad-input', 'Octal only accepts 000–377.');
    const n = parseInt(parts[i], 8);
    if (n > 255) throw new RotorError('bad-input', 'Octal value exceeds 255.');
    out[i] = n;
  }
  return wrap(utf8Decode(out));
}

/* ---------- URL / HTML ---------- */

export function urlComponent(ctx) {
  if (ctx.mode === 'encode') return wrap(encodeURIComponent(ctx.text));
  try {
    return wrap(decodeURIComponent(ctx.text.replace(/\+/g, '%20')));
  } catch {
    throw new RotorError('bad-input', 'Malformed percent-encoding.');
  }
}

const HTML_NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};
const HTML_ESCAPE = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

export function htmlEntities(ctx) {
  if (ctx.mode === 'encode') {
    return wrap([...ctx.text].map((ch) => HTML_ESCAPE[ch] || (ch.charCodeAt(0) > 127 ? `&#${ch.codePointAt(0)};` : ch)).join(''));
  }
  const out = ctx.text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (_, body) => {
    if (body[0] === '#') {
      const n = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return _;
      return String.fromCodePoint(n);
    }
    return HTML_NAMED[body] ?? _;
  });
  return wrap(out);
}

/* ---------- Quoted-printable / UUEncode ---------- */

export function quotedPrintable(ctx) {
  if (ctx.mode === 'encode') {
    let out = '';
    let line = 0;
    const push = (s) => {
      if (line + s.length > 75) {
        out += '=\r\n';
        line = 0;
      }
      out += s;
      line += s.length;
    };
    for (const b of ctx.bytes) {
      const ch = String.fromCharCode(b);
      if ((b >= 33 && b <= 60) || (b >= 62 && b <= 126)) push(ch);
      else if (ch === ' ' || ch === '\t') push(ch);
      else if (ch === '\n') {
        out += '\r\n';
        line = 0;
      } else push('=' + b.toString(16).toUpperCase().padStart(2, '0'));
    }
    return wrap(out);
  }
  const s = ctx.text.replace(/=\r?\n/g, '');
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
      out.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else out.push(s.charCodeAt(i) & 255);
  }
  return wrap(utf8Decode(new Uint8Array(out)));
}

export function uuencode(ctx) {
  if (ctx.mode === 'encode') {
    const name = ctx.fields?.filename || 'data';
    const lines = [`begin 644 ${name}`];
    const bytes = ctx.bytes;
    for (let i = 0; i < bytes.length; i += 45) {
      const chunk = bytes.subarray(i, i + 45);
      let line = String.fromCharCode(32 + chunk.length);
      for (let j = 0; j < chunk.length; j += 3) {
        const a = chunk[j] || 0;
        const b = chunk[j + 1] || 0;
        const c = chunk[j + 2] || 0;
        const v = (a << 16) | (b << 8) | c;
        line += String.fromCharCode(32 + ((v >> 18) & 63));
        line += String.fromCharCode(32 + ((v >> 12) & 63));
        line += String.fromCharCode(32 + ((v >> 6) & 63));
        line += String.fromCharCode(32 + (v & 63));
      }
      lines.push(line);
    }
    lines.push('`');
    lines.push('end');
    return wrap(lines.join('\n'));
  }
  const lines = ctx.text.replace(/\r/g, '').split('\n');
  const start = lines.findIndex((l) => /^begin /i.test(l));
  if (start < 0) throw new RotorError('bad-input', 'UUEncode needs a begin line.');
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line === 'end' || /^end$/i.test(line)) break;
    const len = (line.charCodeAt(0) - 32) & 63;
    if (len === 0) break;
    let got = 0;
    for (let j = 1; j < line.length && got < len; j += 4) {
      const v = [0, 1, 2, 3].map((k) => ((line.charCodeAt(j + k) || 32) - 32) & 63);
      const triple = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3];
      if (got < len) out.push((triple >> 16) & 255);
      got++;
      if (got < len) out.push((triple >> 8) & 255);
      got++;
      if (got < len) out.push(triple & 255);
      got++;
    }
  }
  return wrap(utf8Decode(new Uint8Array(out)));
}

/* ---------- Morse / NATO / Unicode / UTF-8 dump ---------- */

const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....',
  6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', _: '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

export function morse(ctx) {
  if (ctx.mode === 'encode') {
    const words = ctx.text.trim().split(/\s+/);
    return wrap(words.map((w) => [...w.toUpperCase()].map((ch) => {
      if (!MORSE[ch]) throw new RotorError('bad-input', `No Morse for “${ch}”.`);
      return MORSE[ch];
    }).join(' ')).join(' / '));
  }
  const words = ctx.text.trim().split(/\s*\/\s*/);
  return wrap(words.map((w) => w.trim().split(/\s+/).filter(Boolean).map((code) => {
    const ch = MORSE_REV[code];
    if (!ch) throw new RotorError('bad-input', `Unknown Morse “${code}”.`);
    return ch;
  }).join('')).join(' '));
}

const NATO = {
  A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot',
  G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima',
  M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo',
  S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'Xray',
  Y: 'Yankee', Z: 'Zulu',
  0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five',
  6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
};
const NATO_REV = Object.fromEntries(Object.entries(NATO).map(([k, v]) => [v.toLowerCase(), k]));

export function nato(ctx) {
  if (ctx.mode === 'encode') {
    return wrap([...ctx.text.toUpperCase()].map((ch) => {
      if (ch === ' ') return '/';
      if (!NATO[ch]) throw new RotorError('bad-input', `No NATO word for “${ch}”.`);
      return NATO[ch];
    }).join(' '));
  }
  return wrap(ctx.text.trim().split(/\s+/).map((w) => {
    if (w === '/') return ' ';
    const ch = NATO_REV[w.toLowerCase()];
    if (!ch) throw new RotorError('bad-input', `Unknown NATO word “${w}”.`);
    return ch;
  }).join(''));
}

export function unicodePoints(ctx) {
  if (ctx.mode === 'encode') {
    return wrap([...ctx.text].map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '));
  }
  const parts = ctx.text.trim().split(/\s+/).filter(Boolean);
  return wrap(parts.map((p) => {
    const m = p.match(/^(?:U\+|0x)?([0-9a-fA-F]{1,6})$/);
    if (!m) throw new RotorError('bad-input', `Not a code point: ${p}`);
    const n = parseInt(m[1], 16);
    if (n > 0x10ffff) throw new RotorError('bad-input', 'Code point out of range.');
    return String.fromCodePoint(n);
  }).join(''));
}

export function utf8Bytes(ctx) {
  if (ctx.mode === 'encode') {
    return wrap([...ctx.bytes].map((b) => b.toString(16).padStart(2, '0')).join(' '));
  }
  return wrap(utf8DecodeStrict(hexToBytes(ctx.text.replace(/[,\s]+/g, ''))));
}

/* ---------- JWT decode (no verify) ---------- */

function b64urlJson(part) {
  const json = utf8Decode(b64urlToBytes(part));
  try {
    return JSON.parse(json);
  } catch {
    throw new RotorError('bad-input', 'JWT part is not JSON.');
  }
}

export function jwtDecode(ctx) {
  const parts = ctx.text.trim().split('.');
  if (parts.length < 2) throw new RotorError('bad-input', 'JWT needs at least header.payload.');
  const header = b64urlJson(parts[0]);
  const payload = b64urlJson(parts[1]);
  const sig = parts[2] || '';
  return {
    text: JSON.stringify({ header, payload, signature: sig, verified: false }, null, 2),
    meta: 'Decoded. Signature not checked.',
  };
}
