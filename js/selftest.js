import { byId } from './registry.js';
import { utf8Encode, RotorError } from './engines/bytes.js';
import { rsaGenerate, ecdsaGenerate } from './engines/modern.js';

/**
 * Self-test vectors. Every algorithm ships at least one known answer.
 * If you add an algorithm to registry.js, add a vector here.
 */
export const VECTORS = [
  /* Encodings */
  { id: 'base64', mode: 'encode', input: 'Man', expected: 'TWFu' },
  { id: 'base64', mode: 'decode', input: 'TWFu', expected: 'Man' },
  { id: 'base64url', mode: 'encode', input: 'subjects?_d', expected: 'c3ViamVjdHM_X2Q' },
  { id: 'base32', mode: 'encode', input: 'foobar', expected: 'MZXW6YTBOI======' },
  { id: 'base32', mode: 'decode', input: 'MZXW6YTBOI======', expected: 'foobar' },
  { id: 'base58', mode: 'encode', input: 'Hello World', expected: 'JxF12TrwUP45BMd' },
  { id: 'ascii85', mode: 'encode', input: 'Man ', expected: '<~9jqo^~>' },
  { id: 'hex', mode: 'encode', input: 'hello', expected: '68656c6c6f' },
  { id: 'binary', mode: 'encode', input: 'A', expected: '01000001' },
  { id: 'octal', mode: 'encode', input: 'A', expected: '101' },
  { id: 'url', mode: 'encode', input: 'a b/c?d=1', expected: 'a%20b%2Fc%3Fd%3D1' },
  { id: 'html', mode: 'encode', input: '<foo & bar>', expected: '&lt;foo &amp; bar&gt;' },
  { id: 'quoted-printable', mode: 'encode', input: 'hello = world', expected: 'hello =3D world' },
  { id: 'uuencode', mode: 'encode', input: 'Cat', expected: 'begin 644 data\n#0V%T\n`\nend', fields: { filename: 'data' } },
  { id: 'morse', mode: 'encode', input: 'SOS', expected: '... --- ...' },
  { id: 'nato', mode: 'encode', input: 'HI', expected: 'Hotel India' },
  { id: 'unicode', mode: 'encode', input: 'A', expected: 'U+0041' },
  { id: 'utf8', mode: 'encode', input: '€', expected: 'e2 82 ac' },
  {
    id: 'jwt',
    mode: 'decode',
    input: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig',
    check: (res) => {
      const parsed = JSON.parse(res.text);
      return parsed.header.alg === 'HS256' && parsed.payload.sub === '123' && parsed.verified === false;
    },
  },

  /* Classical */
  { id: 'caesar', mode: 'encode', input: 'HELLO', expected: 'URYYB', fields: { shift: '13' } },
  { id: 'rot13', mode: 'encode', input: 'HELLO', expected: 'URYYB' },
  { id: 'rot47', mode: 'encode', input: 'Hello', expected: 'w6==@' },
  { id: 'atbash', mode: 'encode', input: 'AZ', expected: 'ZA' },
  { id: 'affine', mode: 'encode', input: 'AFFINE', expected: 'IHHWVC', fields: { a: '5', b: '8' } },
  { id: 'vigenere', mode: 'encode', input: 'ATTACKATDAWN', expected: 'LXFOPVEFRNHR', fields: { key: 'LEMON' } },
  { id: 'beaufort', mode: 'encode', input: 'DEFENDTHEEASTWALLOFTHECASTLE', expected: 'CKMPVCPVWPIWUJOGIUAPVWRIWUUK', fields: { key: 'FORTIFICATION' } },
  { id: 'autokey', mode: 'encode', input: 'ATTACKATDAWN', expected: 'QNXEPVYTWTWP', fields: { key: 'QUEENLY' } },
  { id: 'playfair', mode: 'encode', input: 'HIDETHEGOLDINTHETREESTUMP', expected: 'BMODZBXDNABEKUDMUIXMMOUVIF', fields: { key: 'PLAYFAIREXAMPLE' } },
  { id: 'rail-fence', mode: 'encode', input: 'WEAREDISCOVEREDFLEEATONCE', expected: 'WECRLTEERDSOEEFEAOCAIVDEN', fields: { rails: '3' } },
  { id: 'columnar', mode: 'encode', input: 'DEFENDTHEEASTWALL', expected: 'NALEHWDTTEELDSXFEA', fields: { key: 'GERMAN' } },
  { id: 'baconian', mode: 'encode', input: 'STRIKE', expected: 'baaab baaba baaaa abaaa abaab aabaa' },
  { id: 'polybius', mode: 'encode', input: 'BAT', expected: '12 11 44' },
  { id: 'substitution', mode: 'encode', input: 'ATTACK', expected: 'QZZQEA', fields: { alphabet: 'QWERTYUIOPASDFGHJKLZXCVBNM' } },
  { id: 'xor', mode: 'encode', input: 'wiki', expected: '1c0c1202', fields: { key: '6b6579' } },
  {
    id: 'enigma',
    mode: 'encode',
    input: 'AAAAA',
    expected: 'BDZGO',
    fields: { r1: 'I', r2: 'II', r3: 'III', ring1: '1', ring2: '1', ring3: '1', w1: 'A', w2: 'A', w3: 'A', plugboard: '' },
  },

  /* Hashes */
  { id: 'md5', mode: 'hash', input: 'abc', expected: '900150983cd24fb0d6963f7d28e17f72', fields: { format: 'hex' } },
  { id: 'sha-1', mode: 'hash', input: 'abc', expected: 'a9993e364706816aba3e25717850c26c9cd0d89d', fields: { format: 'hex' } },
  { id: 'sha-256', mode: 'hash', input: 'abc', expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', fields: { format: 'hex' } },
  { id: 'sha-384', mode: 'hash', input: 'abc', expected: 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7', fields: { format: 'hex' } },
  { id: 'sha-512', mode: 'hash', input: 'abc', expected: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f', fields: { format: 'hex' } },
  { id: 'hmac-sha-256', mode: 'hash', input: 'what do ya want for nothing?', expected: '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843', fields: { key: 'Jefe', format: 'hex' } },
  { id: 'crc32', mode: 'hash', input: '123456789', expected: 'cbf43926' },
  { id: 'pbkdf2', mode: 'hash', input: '', expected: '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b', fields: { password: 'password', salt: 'salt', iterations: '1', length: '32', format: 'hex' } },

  /* TOTP RFC 6238 Appendix B (HMAC-SHA-1, Base32 for '12345678901234567890' at t=59s → 94287082 for 8 digits; for 6 digits 287082) */
  {
    id: 'totp',
    mode: 'generate',
    input: '',
    expected: '287082',
    fields: {
      secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', // 12345678901234567890
      digits: '6',
      period: '30',
      hash: 'SHA-1',
      _now: '59',
    },
  },

  /* Analysis / Auto-Decoders */
  {
    id: 'magic-decode',
    mode: 'decode',
    input: 'TWFu',
    check: (res) => res.text.includes('Man') && res.text.includes('Base64'),
  },
  {
    id: 'magic-decode',
    mode: 'decode',
    input: 'URYYB',
    check: (res) => res.text.includes('HELLO'),
  },
  {
    id: 'frequency-analysis',
    mode: 'decode',
    input: 'ATTACK AT DAWN ON THE EAST CASTLE WALL',
    check: (res) => res.text.includes('Shannon Entropy') && res.text.includes('Index of Coincidence'),
  },
  {
    id: 'caesar-crack',
    mode: 'decode',
    input: 'URYYB JBEYQ',
    check: (res) => res.text.includes('HELLO WORLD') && res.text.includes('[BEST MATCH]'),
  },
  {
    id: 'xor-crack',
    mode: 'decode',
    input: '0610160710010a11140114',
    check: (res) => res.text.includes('SECRET_DATA') && res.text.includes('0x55'),
  },
  {
    id: 'hash-crack',
    mode: 'decode',
    input: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    fields: { dictionary: 'hello\nabc\nsecret' },
    check: (res) => res.text.includes('SHA-256') && res.text.includes('abc'),
  },
];

export async function runSelfTests(listEl, countEl) {
  listEl.replaceChildren();
  let okCount = 0;
  const total = VECTORS.length + 3; // + AES-GCM round-trip + tamper + RSA round-trip

  const record = (name, pass, detail) => {
    const li = document.createElement('li');
    li.className = pass ? 'ok' : 'fail';
    li.textContent = `${pass ? '✓' : '✗'} ${name}${detail ? ` (${detail})` : ''}`;
    listEl.appendChild(li);
    if (pass) okCount++;
    countEl.textContent = `${okCount}/${total}`;
  };

  for (const v of VECTORS) {
    const a = byId(v.id);
    if (!a) {
      record(v.id, false, 'not in registry');
      continue;
    }
    try {
      const res = await a.run({
        mode: v.mode,
        text: v.input,
        bytes: utf8Encode(v.input),
        fields: v.fields || {},
      });
      const pass = v.check ? v.check(res) : res.text === v.expected;
      record(`${v.id} [${v.mode}]`, pass, pass ? null : `got ${res.text?.slice(0, 30)}`);
    } catch (err) {
      record(`${v.id} [${v.mode}]`, false, err.message);
    }
  }

  // Dynamic test 1: AES-GCM round-trip
  try {
    const a = byId('aes-gcm');
    const enc = await a.run({ mode: 'encrypt', text: 'secret message', bytes: utf8Encode('secret message'), fields: { password: 'pass' } });
    const dec = await a.run({ mode: 'decrypt', text: enc.text, bytes: utf8Encode(enc.text), fields: { password: 'pass' } });
    record('AES-GCM round-trip', dec.text === 'secret message');
  } catch (err) {
    record('AES-GCM round-trip', false, err.message);
  }

  // Dynamic test 2: AES-GCM tamper must fail
  try {
    const a = byId('aes-gcm');
    const enc = await a.run({ mode: 'encrypt', text: 'secret', bytes: utf8Encode('secret'), fields: { password: 'pass' } });
    const tampered = enc.text.slice(0, -2) + (enc.text.endsWith('A') ? 'B' : 'A') + enc.text.slice(-1);
    let threw = false;
    try {
      await a.run({ mode: 'decrypt', text: tampered, bytes: utf8Encode(tampered), fields: { password: 'pass' } });
    } catch (err) {
      if (err instanceof RotorError && err.code === 'auth-fail') threw = true;
    }
    record('AES-GCM tamper fails closed', threw);
  } catch (err) {
    record('AES-GCM tamper fails closed', false, err.message);
  }

  // Dynamic test 3: RSA-OAEP generate + round-trip
  try {
    const pair = await rsaGenerate(2048);
    const rsa = byId('rsa-oaep');
    const enc = await rsa.run({ mode: 'encrypt', text: 'rsa test', bytes: utf8Encode('rsa test'), fields: { pem: pair.publicPem } });
    const dec = await rsa.run({ mode: 'decrypt', text: enc.text, bytes: utf8Encode(enc.text), fields: { pem: pair.privatePem } });
    record('RSA-OAEP 2048 round-trip', dec.text === 'rsa test');
  } catch (err) {
    record('RSA-OAEP 2048 round-trip', false, err.message);
  }
}
