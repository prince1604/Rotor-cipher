import { GROUPS, ALGORITHMS, byId, inGroup } from './registry.js';
import { utf8Encode, RotorError } from './engines/bytes.js';
import { runSelfTests } from './selftest.js';

const $ = (id) => document.getElementById(id);

const state = {
  algoId: 'base64',
  group: 'encodings',
  mode: 'encode',
  fields: {},
  live: true,
  search: '',
  timer: null,
  tickTimer: null,
};

/* Unified storage helper that works in both Chrome Extensions and Localhost / Web */
const storage = {
  async getSync(keys) {
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      try {
        return await chrome.storage.sync.get(keys);
      } catch {}
    }
    const res = {};
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      try {
        const val = localStorage.getItem('rotor_' + k);
        if (val !== null) res[k] = val;
      } catch {}
    }
    return res;
  },

  async setSync(items) {
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      try {
        return await chrome.storage.sync.set(items);
      } catch {}
    }
    for (const [k, v] of Object.entries(items)) {
      try {
        localStorage.setItem('rotor_' + k, typeof v === 'string' ? v : JSON.stringify(v));
      } catch {}
    }
  },

  async getSession(key) {
    if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
      try {
        return await chrome.storage.session.get(key);
      } catch {}
    }
    try {
      const val = sessionStorage.getItem('rotor_' + key);
      return val ? { [key]: JSON.parse(val) } : {};
    } catch {
      return {};
    }
  },

  async removeSession(key) {
    if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
      try {
        return await chrome.storage.session.remove(key);
      } catch {}
    }
    try {
      sessionStorage.removeItem('rotor_' + key);
    } catch {}
  },
};

function renderGroups() {
  const host = $('groups');
  if (!host) return;
  host.replaceChildren();
  for (const g of GROUPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-group', g.id);
    b.setAttribute('aria-selected', String(g.id === state.group));
    if (g.id === 'analysis') {
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="none"/><path d="M12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 14h-2v-2h2v2zm0-4h-2V7h2v7z" fill="none"/><circle cx="12" cy="12" r="3"/><path d="M12 1L9 6h6l-3-5zm0 22l3-5H9l3 5zM1 12l5 3V9l-5 3zm22 0l-5-3v6l5-3z"/></svg><span>${g.label}</span>`;
    } else {
      b.textContent = g.label;
    }
    b.addEventListener('click', () => {
      state.group = g.id;
      const first = inGroup(g.id)[0];
      if (first) selectAlgo(first.id);
      else render();
    });
    host.appendChild(b);
  }
}

function renderChips() {
  const host = $('chips');
  if (!host) return;
  host.replaceChildren();
  let list = state.search
    ? ALGORITHMS.filter((a) => a.label.toLowerCase().includes(state.search.toLowerCase()) || a.id.includes(state.search.toLowerCase()))
    : inGroup(state.group);

  for (const a of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = a.label;
    b.setAttribute('data-group', a.group);
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(a.id === state.algoId));
    b.addEventListener('click', () => selectAlgo(a.id));
    host.appendChild(b);
  }
}

function renderMeta() {
  const a = byId(state.algoId);
  if (!a) return;
  const nameEl = $('algo-name');
  const hintEl = $('hint');
  const warn = $('warn');
  if (nameEl) nameEl.textContent = a.label;
  if (hintEl) hintEl.textContent = a.hint || '';
  if (warn) {
    if (a.group === 'analysis') {
      warn.hidden = false;
      warn.className = 'auto-badge';
      warn.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> AUTO-SOLVER`;
    } else if (a.warn) {
      warn.hidden = false;
      warn.className = 'warn';
      warn.innerHTML = '';
      warn.textContent =
        a.warn === 'unsafe' ? 'broken · unsafe' :
        a.warn === 'historic' ? 'historic · unsafe' :
        a.warn === 'unauthenticated' ? 'unauthenticated' :
        a.warn === 'jwt' ? 'no verify' :
        a.warn === 'kdf' ? 'slow KDF' : a.warn;
    } else {
      warn.hidden = true;
      warn.className = 'warn';
      warn.innerHTML = '';
      warn.textContent = '';
    }
  }
}

function renderModes() {
  const host = $('modes');
  if (!host) return;
  host.replaceChildren();
  const a = byId(state.algoId);
  if (!a) return;
  const modes = a.modes || ['encode'];
  if (!modes.includes(state.mode)) state.mode = modes[0];
  for (const m of modes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(m === state.mode));
    b.addEventListener('click', () => {
      state.mode = m;
      renderModes();
      renderFields();
      queueRun();
    });
    host.appendChild(b);
  }
}

function renderFields() {
  const host = $('fields');
  if (!host) return;
  host.replaceChildren();
  const a = byId(state.algoId);
  if (!a || !a.fields) return;
  for (const f of a.fields) {
    if (f.modes && !f.modes.includes(state.mode)) continue;
    const wrap = document.createElement('div');
    wrap.className = `field ${f.type === 'textarea' ? 'wide textarea' : ''} ${f.wide ? 'wide' : ''}`;

    if (f.type === 'toggle') {
      const label = document.createElement('label');
      label.className = 'toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = (state.fields[f.name] ?? f.value ?? '1') === '1';
      input.addEventListener('change', () => {
        state.fields[f.name] = input.checked ? '1' : '0';
        queueRun();
      });
      label.appendChild(input);
      label.appendChild(document.createTextNode(f.label));
      wrap.appendChild(label);
      host.appendChild(wrap);
      continue;
    }

    const label = document.createElement('label');
    label.className = 'field-label';
    label.textContent = f.label;
    wrap.appendChild(label);

    let ctrl;
    if (f.type === 'select') {
      ctrl = document.createElement('select');
      for (const opt of f.options) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        ctrl.appendChild(o);
      }
      ctrl.value = state.fields[f.name] ?? f.value ?? f.options[0]?.value;
    } else if (f.type === 'textarea') {
      ctrl = document.createElement('textarea');
      ctrl.value = state.fields[f.name] ?? f.value ?? '';
      ctrl.placeholder = f.placeholder || '';
    } else {
      ctrl = document.createElement('input');
      ctrl.type = f.type || 'text';
      ctrl.value = state.fields[f.name] ?? f.value ?? '';
      ctrl.placeholder = f.placeholder || '';
    }

    ctrl.addEventListener('input', () => {
      state.fields[f.name] = ctrl.value;
      queueRun();
    });
    wrap.appendChild(ctrl);
    host.appendChild(wrap);
  }
}

function updateControls() {
  const a = byId(state.algoId);
  const isGenerate = state.mode === 'generate';
  const isLive = (a?.live !== false) && !isGenerate;
  const runBtn = $('run');
  const swapBtn = $('swap');
  if (runBtn) {
    runBtn.hidden = isLive;
    runBtn.textContent = isGenerate ? 'GENERATE' : (state.mode === 'sign' ? 'SIGN' : (state.mode === 'verify' ? 'VERIFY' : 'RUN'));
  }
  const canSwap = ['encode', 'decode', 'encrypt', 'decrypt'].includes(state.mode);
  if (swapBtn) {
    swapBtn.disabled = !canSwap;
  }
}

function selectAlgo(id) {
  const a = byId(id);
  if (!a) return;
  state.algoId = a.id;
  state.group = a.group;
  state.mode = a.modes[0];
  state.fields = {};
  if (a.fields) {
    for (const f of a.fields) {
      if (f.value !== undefined) state.fields[f.name] = f.value;
    }
  }
  render();
  saveLastAlgo(id);
  setupTicker();
  queueRun();
}

function render() {
  renderGroups();
  renderChips();
  renderMeta();
  renderModes();
  renderFields();
  updateControls();
}

async function execute() {
  const errEl = $('err');
  const outEl = $('output');
  const metaEl = $('meta');
  const inputEl = $('input');
  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = '';
  }
  const a = byId(state.algoId);
  if (!a || !inputEl) return;
  const text = inputEl.value;
  const bytes = utf8Encode(text);
  const ctx = {
    mode: state.mode,
    text,
    bytes,
    fields: { ...state.fields },
  };

  try {
    const res = await a.run(ctx);
    if (outEl) outEl.value = res.text ?? '';
    const byteLen = res.bytes ? res.bytes.length : utf8Encode(res.text || '').length;
    const metaParts = [];
    if (res.meta) metaParts.push(res.meta);
    if (byteLen) metaParts.push(`${byteLen} bytes`);
    if (a.live !== false && state.mode !== 'generate') metaParts.push('live');
    if (metaEl) metaEl.textContent = metaParts.join(' · ');
  } catch (err) {
    if (outEl) outEl.value = '';
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = err instanceof RotorError ? err.message : (err?.message || 'Operation failed.');
    }
    if (metaEl) metaEl.textContent = '';
  }
}

function queueRun() {
  const a = byId(state.algoId);
  const isGenerate = state.mode === 'generate';
  const isLive = (a?.live !== false) && !isGenerate;
  if (!isLive) return;
  clearTimeout(state.timer);
  state.timer = setTimeout(execute, 80);
}

function setupTicker() {
  clearInterval(state.tickTimer);
  const a = byId(state.algoId);
  if (a?.tick) {
    state.tickTimer = setInterval(() => {
      if (document.visibilityState === 'visible') execute();
    }, a.tick);
  }
}

async function saveLastAlgo(id) {
  await storage.setSync({ lastAlgorithmId: id });
}

async function loadLastAlgo() {
  const res = await storage.getSync(['lastAlgorithmId', 'theme']);
  if (res.theme) document.documentElement.setAttribute('data-theme', res.theme);
  if (res.lastAlgorithmId && byId(res.lastAlgorithmId)) {
    return res.lastAlgorithmId;
  }
  return 'base64';
}

async function consumeHandoff() {
  const res = await storage.getSession('rotorHandOff');
  if (res?.rotorHandOff) {
    await storage.removeSession('rotorHandOff');
    const { text, prefer } = res.rotorHandOff;
    if (text && $('input')) $('input').value = text;
    if (prefer && byId(prefer)) selectAlgo(prefer);
    else queueRun();
  }
}

/* Event bindings */
const searchInput = $('search');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderChips();
  });
}

const inputTape = $('input');
if (inputTape) {
  inputTape.addEventListener('input', queueRun);
}

const swapBtn = $('swap');
if (swapBtn) {
  swapBtn.addEventListener('click', () => {
    const out = $('output')?.value || '';
    const inp = $('input')?.value || '';
    if ($('input')) $('input').value = out;
    if ($('output')) $('output').value = inp;
    const a = byId(state.algoId);
    if (state.mode === 'encode' && a?.modes?.includes('decode')) state.mode = 'decode';
    else if (state.mode === 'decode' && a?.modes?.includes('encode')) state.mode = 'encode';
    else if (state.mode === 'encrypt' && a?.modes?.includes('decrypt')) state.mode = 'decrypt';
    else if (state.mode === 'decrypt' && a?.modes?.includes('encrypt')) state.mode = 'encrypt';
    renderModes();
    queueRun();
  });
}

const runBtn = $('run');
if (runBtn) {
  runBtn.addEventListener('click', execute);
}

const copyBtn = $('copy');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    const out = $('output')?.value;
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
    } catch {
      $('output')?.select();
      document.execCommand('copy');
    }
    copyBtn.textContent = 'COPIED';
    copyBtn.style.color = 'var(--brass)';
    setTimeout(() => {
      copyBtn.textContent = 'COPY';
      copyBtn.style.color = '';
    }, 1200);
  });
}

const themeBtn = $('theme');
if (themeBtn) {
  themeBtn.addEventListener('click', async () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', cur);
    await storage.setSync({ theme: cur });
  });
}

const fileInput = $('file');
if (fileInput) {
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    if ($('input')) {
      $('input').value = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      execute();
    }
  });
}

// Drop directly on the input tape
if (inputTape) {
  inputTape.addEventListener('dragover', (e) => {
    e.preventDefault();
    inputTape.style.boxShadow = '0 0 0 2px var(--brass)';
  });
  inputTape.addEventListener('dragleave', () => {
    inputTape.style.boxShadow = '';
  });
  inputTape.addEventListener('drop', async (e) => {
    e.preventDefault();
    inputTape.style.boxShadow = '';
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const buf = await file.arrayBuffer();
      inputTape.value = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      execute();
    }
  });
}

// Interactive Spotlight Cursor Tracking
window.addEventListener('pointermove', (e) => {
  requestAnimationFrame(() => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty('--mouse-x', `${x}%`);
    document.documentElement.style.setProperty('--mouse-y', `${y}%`);
  });
}, { passive: true });

/* Init */
(async () => {
  const initial = await loadLastAlgo();
  selectAlgo(initial);
  await consumeHandoff();
  const listEl = $('selftest-list');
  const countEl = $('selftest-count');
  if (listEl && countEl) {
    runSelfTests(listEl, countEl);
  }
})();
