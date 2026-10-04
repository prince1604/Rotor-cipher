import * as encodings from './engines/encodings.js';
import * as classical from './engines/classical.js';
import * as hashes from './engines/hashes.js';
import * as modern from './engines/modern.js';
import * as generate from './engines/generate.js';
import * as analysis from './engines/analysis.js';

const FORMAT = {
  name: 'format',
  type: 'select',
  label: 'Output',
  options: [
    { value: 'hex', label: 'hex' },
    { value: 'base64', label: 'Base64' },
  ],
};

const KEY_TEXT = { name: 'key', type: 'text', label: 'Key', required: true };
const PASSWORD = { name: 'password', type: 'password', label: 'Password', required: true };

export const GROUPS = [
  { id: 'encodings', label: 'encodings' },
  { id: 'classical', label: 'classical' },
  { id: 'analysis', label: 'analysis / auto' },
  { id: 'hashes', label: 'hashes' },
  { id: 'modern', label: 'modern' },
  { id: 'generate', label: 'generate' },
];

export const ALGORITHMS = [
  /* encodings */
  { id: 'base64', group: 'encodings', label: 'Base64', hint: 'RFC 4648, padded.', modes: ['encode', 'decode'], run: encodings.base64 },
  { id: 'base64url', group: 'encodings', label: 'Base64 URL', hint: 'URL-safe, no padding.', modes: ['encode', 'decode'], run: encodings.base64url },
  { id: 'base32', group: 'encodings', label: 'Base32', hint: 'RFC 4648.', modes: ['encode', 'decode'], run: encodings.base32 },
  { id: 'base58', group: 'encodings', label: 'Base58', hint: 'Bitcoin alphabet.', modes: ['encode', 'decode'], run: encodings.base58 },
  { id: 'ascii85', group: 'encodings', label: 'ASCII85', hint: 'Adobe <~ ~> framing.', modes: ['encode', 'decode'], run: encodings.ascii85 },
  { id: 'hex', group: 'encodings', label: 'Hex', hint: '0-9 a-f, optional 0x.', modes: ['encode', 'decode'], run: encodings.hex },
  { id: 'binary', group: 'encodings', label: 'Binary', hint: '8-bit groups.', modes: ['encode', 'decode'], run: encodings.binary },
  { id: 'octal', group: 'encodings', label: 'Octal', hint: 'Space-separated bytes.', modes: ['encode', 'decode'], run: encodings.octal },
  { id: 'url', group: 'encodings', label: 'URL component', hint: 'encodeURIComponent.', modes: ['encode', 'decode'], run: encodings.urlComponent },
  { id: 'html', group: 'encodings', label: 'HTML entities', hint: 'Named + numeric.', modes: ['encode', 'decode'], run: encodings.htmlEntities },
  { id: 'quoted-printable', group: 'encodings', label: 'Quoted-printable', hint: 'MIME Q-P.', modes: ['encode', 'decode'], run: encodings.quotedPrintable },
  { id: 'uuencode', group: 'encodings', label: 'UUEncode', hint: 'begin 644 … end', modes: ['encode', 'decode'], fields: [{ name: 'filename', type: 'text', label: 'File name' }], run: encodings.uuencode },
  { id: 'morse', group: 'encodings', label: 'Morse', hint: 'ITU, / between words.', modes: ['encode', 'decode'], run: encodings.morse },
  { id: 'nato', group: 'encodings', label: 'NATO phonetic', hint: 'Alfa Bravo …', modes: ['encode', 'decode'], run: encodings.nato },
  { id: 'unicode', group: 'encodings', label: 'Unicode points', hint: 'U+0041 form.', modes: ['encode', 'decode'], run: encodings.unicodePoints },
  { id: 'utf8', group: 'encodings', label: 'UTF-8 bytes', hint: 'Hex per byte.', modes: ['encode', 'decode'], run: encodings.utf8Bytes },
  { id: 'jwt', group: 'encodings', label: 'JWT decode', hint: 'Decoded. Signature not checked.', modes: ['decode'], warn: 'jwt', run: encodings.jwtDecode },

  /* classical */
  { id: 'caesar', group: 'classical', label: 'Caesar', hint: 'Historic toy. Do not hide secrets with this.', modes: ['encode', 'decode'], warn: 'historic', fields: [{ name: 'shift', type: 'number', label: 'Shift', value: '13' }], run: classical.caesar },
  { id: 'rot13', group: 'classical', label: 'ROT13', hint: 'Historic toy. Do not hide secrets with this.', modes: ['encode', 'decode'], warn: 'historic', run: classical.rot13 },
  { id: 'rot47', group: 'classical', label: 'ROT47', hint: 'ASCII 33–126. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', run: classical.rot47 },
  { id: 'atbash', group: 'classical', label: 'Atbash', hint: 'A↔Z. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', run: classical.atbash },
  { id: 'affine', group: 'classical', label: 'Affine', hint: 'E(x)=ax+b mod 26. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', fields: [{ name: 'a', type: 'number', label: 'a', value: '5' }, { name: 'b', type: 'number', label: 'b', value: '8' }], run: classical.affine },
  { id: 'vigenere', group: 'classical', label: 'Vigenère', hint: 'Historic toy. Do not hide secrets with this.', modes: ['encode', 'decode'], warn: 'historic', fields: [KEY_TEXT], run: classical.vigenere },
  { id: 'beaufort', group: 'classical', label: 'Beaufort', hint: 'Reciprocal Vigenère variant. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', fields: [KEY_TEXT], run: classical.beaufort },
  { id: 'autokey', group: 'classical', label: 'Autokey', hint: 'Key + plaintext. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', fields: [KEY_TEXT], run: classical.autokey },
  { id: 'playfair', group: 'classical', label: 'Playfair', hint: '5×5, J→I. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', fields: [KEY_TEXT], run: classical.playfair },
  { id: 'rail-fence', group: 'classical', label: 'Rail fence', hint: 'Zigzag transposition. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', fields: [{ name: 'rails', type: 'number', label: 'Rails', value: '3' }], run: classical.railFence },
  { id: 'columnar', group: 'classical', label: 'Columnar', hint: 'Key-ordered columns. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', fields: [KEY_TEXT], run: classical.columnar },
  { id: 'baconian', group: 'classical', label: 'Baconian', hint: 'a/b 5-bit. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', run: classical.baconian },
  { id: 'polybius', group: 'classical', label: 'Polybius', hint: '5×5, J=I. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', run: classical.polybius },
  { id: 'substitution', group: 'classical', label: 'Substitution', hint: '26-letter alphabet. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', fields: [{ name: 'alphabet', type: 'text', label: 'Alphabet', value: 'QWERTYUIOPASDFGHJKLZXCVBNM' }], run: classical.substitution },
  { id: 'xor', group: 'classical', label: 'Repeating XOR', hint: 'Hex key. Historic toy.', modes: ['encode', 'decode'], warn: 'historic', fields: [{ name: 'key', type: 'text', label: 'Key (hex)', required: true }], run: classical.xorRepeat },
  {
    id: 'enigma',
    group: 'classical',
    label: 'Enigma M3',
    hint: 'Wehrmacht M3, UKW-B, double-step. Historic toy.',
    modes: ['encode', 'decode'],
    warn: 'historic',
    fields: [
      { name: 'r1', type: 'select', label: 'Left', options: ['I', 'II', 'III', 'IV', 'V'].map((v) => ({ value: v, label: v })), value: 'I' },
      { name: 'r2', type: 'select', label: 'Middle', options: ['I', 'II', 'III', 'IV', 'V'].map((v) => ({ value: v, label: v })), value: 'II' },
      { name: 'r3', type: 'select', label: 'Right', options: ['I', 'II', 'III', 'IV', 'V'].map((v) => ({ value: v, label: v })), value: 'III' },
      { name: 'ring1', type: 'number', label: 'Ring L', value: '1' },
      { name: 'ring2', type: 'number', label: 'Ring M', value: '1' },
      { name: 'ring3', type: 'number', label: 'Ring R', value: '1' },
      { name: 'w1', type: 'text', label: 'Window L', value: 'A' },
      { name: 'w2', type: 'text', label: 'Window M', value: 'A' },
      { name: 'w3', type: 'text', label: 'Window R', value: 'A' },
      { name: 'plugboard', type: 'text', label: 'Plugs', value: '' },
    ],
    run: classical.enigma,
  },

  /* analysis / auto-decoder */
  {
    id: 'magic-decode',
    group: 'analysis',
    label: 'Magic Auto-Decoder',
    hint: 'Heuristic auto-solver across all encodings and classical ciphers without key.',
    modes: ['decode'],
    run: analysis.magicAutoDecode,
  },
  {
    id: 'frequency-analysis',
    group: 'analysis',
    label: 'Frequency Analysis',
    hint: 'Entropy, Index of Coincidence, Chi-Squared, and monogram distribution.',
    modes: ['decode'],
    run: analysis.frequencyAnalysisInspector,
  },
  {
    id: 'caesar-crack',
    group: 'analysis',
    label: 'Caesar Auto-Crack',
    hint: 'Evaluates all 25 shifts and ranks by English Chi-Squared fitness.',
    modes: ['decode'],
    run: analysis.caesarSolver,
  },
  {
    id: 'xor-crack',
    group: 'analysis',
    label: 'Single-Byte XOR Crack',
    hint: 'Brute-forces 256 keys and finds English plaintext.',
    modes: ['decode'],
    run: analysis.xorAutoSolver,
  },
  {
    id: 'hash-crack',
    group: 'analysis',
    label: 'Hash Identifier & Cracker',
    hint: 'Identifies hash types and runs local dictionary attacks.',
    modes: ['decode'],
    fields: [{ name: 'dictionary', type: 'textarea', label: 'Dictionary (One word per line)' }],
    run: analysis.hashCracker,
  },

  /* hashes */
  { id: 'md5', group: 'hashes', label: 'MD5', hint: 'Broken. Not for secrets.', modes: ['hash'], warn: 'unsafe', fields: [FORMAT], run: hashes.md5 },
  { id: 'sha-1', group: 'hashes', label: 'SHA-1', hint: 'Broken. Not for secrets.', modes: ['hash'], warn: 'unsafe', fields: [FORMAT], run: hashes.sha1 },
  { id: 'sha-256', group: 'hashes', label: 'SHA-256', hint: 'FIPS 180-4.', modes: ['hash'], fields: [FORMAT], run: hashes.sha256 },
  { id: 'sha-384', group: 'hashes', label: 'SHA-384', hint: 'FIPS 180-4.', modes: ['hash'], fields: [FORMAT], run: hashes.sha384 },
  { id: 'sha-512', group: 'hashes', label: 'SHA-512', hint: 'FIPS 180-4.', modes: ['hash'], fields: [FORMAT], run: hashes.sha512 },
  { id: 'hmac-sha-256', group: 'hashes', label: 'HMAC-SHA-256', hint: 'RFC 2104.', modes: ['hash'], fields: [KEY_TEXT, FORMAT], run: hashes.hmacSha256 },
  { id: 'hmac-sha-512', group: 'hashes', label: 'HMAC-SHA-512', hint: 'RFC 2104.', modes: ['hash'], fields: [KEY_TEXT, FORMAT], run: hashes.hmacSha512 },
  { id: 'crc32', group: 'hashes', label: 'CRC-32', hint: 'Checksum, not a hash.', modes: ['hash'], warn: 'unsafe', run: hashes.crc32 },
  {
    id: 'pbkdf2',
    group: 'hashes',
    label: 'PBKDF2-SHA-256',
    hint: 'Slow on purpose. Default 210000 rounds.',
    modes: ['hash'],
    warn: 'kdf',
    live: false,
    fields: [
      PASSWORD,
      { name: 'salt', type: 'text', label: 'Salt', required: true },
      { name: 'iterations', type: 'number', label: 'Iterations', value: '210000' },
      { name: 'length', type: 'select', label: 'Bytes', options: [16, 24, 32, 48, 64].map((n) => ({ value: String(n), label: String(n) })), value: '32' },
      FORMAT,
    ],
    run: hashes.pbkdf2,
  },

  /* modern */
  { id: 'aes-gcm', group: 'modern', label: 'AES-GCM', hint: 'Password → PBKDF2 → AES-GCM. Authenticated.', modes: ['encrypt', 'decrypt'], warn: 'kdf', live: false, fields: [PASSWORD], run: modern.aesGcm },
  { id: 'aes-cbc', group: 'modern', label: 'AES-CBC', hint: 'Unauthenticated. Prefer AES-GCM.', modes: ['encrypt', 'decrypt'], warn: 'unauthenticated', live: false, fields: [PASSWORD], run: modern.aesCbc },
  {
    id: 'rsa-oaep',
    group: 'modern',
    label: 'RSA-OAEP',
    hint: 'PEM, SHA-256. Short messages only.',
    modes: ['encrypt', 'decrypt'],
    live: false,
    fields: [{ name: 'pem', type: 'textarea', label: 'PEM', required: true }],
    run: modern.rsaOaep,
  },
  {
    id: 'ecdsa',
    group: 'modern',
    label: 'ECDSA P-256',
    hint: 'Sign with private PEM, verify with public PEM.',
    modes: ['sign', 'verify'],
    live: false,
    fields: [
      { name: 'pem', type: 'textarea', label: 'PEM', required: true },
      { name: 'signature', type: 'textarea', label: 'Signature', modes: ['verify'] },
    ],
    run: modern.ecdsa,
  },
  {
    id: 'totp',
    group: 'modern',
    label: 'TOTP',
    hint: 'RFC 6238. Secret stays on this machine.',
    modes: ['generate'],
    live: false,
    tick: 1000,
    fields: [
      { name: 'secret', type: 'text', label: 'Secret (Base32)', required: true },
      { name: 'digits', type: 'select', label: 'Digits', options: [6, 7, 8].map((n) => ({ value: String(n), label: String(n) })), value: '6' },
      { name: 'period', type: 'number', label: 'Period', value: '30' },
      { name: 'hash', type: 'select', label: 'HMAC', options: ['SHA-1', 'SHA-256', 'SHA-512'].map((v) => ({ value: v, label: v })), value: 'SHA-1' },
    ],
    run: modern.totp,
  },

  /* generate */
  {
    id: 'password',
    group: 'generate',
    label: 'Password',
    hint: 'Rejection-sampled from crypto.getRandomValues.',
    modes: ['generate'],
    live: false,
    fields: [
      { name: 'length', type: 'number', label: 'Length', value: '20' },
      { name: 'lower', type: 'toggle', label: 'a–z', value: '1' },
      { name: 'upper', type: 'toggle', label: 'A–Z', value: '1' },
      { name: 'digits', type: 'toggle', label: '0–9', value: '1' },
      { name: 'symbols', type: 'toggle', label: 'symbols', value: '0' },
    ],
    run: generate.password,
  },
  { id: 'passphrase', group: 'generate', label: 'Passphrase', hint: 'Random syllables, not a dictionary.', modes: ['generate'], live: false, fields: [{ name: 'words', type: 'number', label: 'Words', value: '5' }], run: generate.passphrase },
  { id: 'uuid', group: 'generate', label: 'UUIDv4', hint: 'RFC 4122 random.', modes: ['generate'], live: false, run: generate.uuidv4 },
  {
    id: 'random-key',
    group: 'generate',
    label: 'Random key',
    hint: 'Raw bytes as hex or Base64.',
    modes: ['generate'],
    live: false,
    fields: [
      { name: 'bytes', type: 'select', label: 'Bytes', options: [16, 24, 32, 48, 64].map((n) => ({ value: String(n), label: String(n) })), value: '32' },
      FORMAT,
    ],
    run: generate.randomKey,
  },
  { id: 'aes-key', group: 'generate', label: 'AES-256 key', hint: '32 raw bytes, hex.', modes: ['generate'], live: false, run: generate.aesKey },
  {
    id: 'rsa-pem',
    group: 'generate',
    label: 'RSA PEM pair',
    hint: 'PKCS8 + SPKI. Slow at 4096.',
    modes: ['generate'],
    live: false,
    fields: [{ name: 'bits', type: 'select', label: 'Bits', options: [{ value: '2048', label: '2048' }, { value: '4096', label: '4096' }], value: '2048' }],
    run: generate.rsaPem,
  },
  { id: 'ecdsa-pem', group: 'generate', label: 'ECDSA PEM pair', hint: 'P-256 PKCS8 + SPKI.', modes: ['generate'], live: false, run: generate.ecdsaPem },
  { id: 'totp-secret', group: 'generate', label: 'TOTP secret', hint: '160-bit Base32.', modes: ['generate'], live: false, run: generate.totpSecret },
];

export function byId(id) {
  return ALGORITHMS.find((a) => a.id === id) || null;
}

export function inGroup(groupId) {
  return ALGORITHMS.filter((a) => a.group === groupId);
}
