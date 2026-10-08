const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~'
};
const AMBIG = /[1lI0O|`'"]/g;
const LEVELS = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
const COLORS = ['#ff5d6c', '#ff8a4c', '#f5a623', '#7bd96b', '#3ddc97'];

const $ = id => document.getElementById(id);
const els = { pw: $('pw'), len: $('len'), lenv: $('lenv'), bar: $('bar'), strength: $('strength'), entropy: $('entropy'), err: $('err'), list: $('list'), toast: $('toast') };
const history = [];
let current = '', pool = '', toastTimer;

/* uniform random int with rejection sampling (no modulo bias) */
function rnd(max) {
  const lim = Math.floor(0x100000000 / max) * max, buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= lim);
  return buf[0] % max;
}
const strip = s => ($('ambig').checked ? s.replace(AMBIG, '') : s);

function generate() {
  const sel = ['lower', 'upper', 'digits', 'symbols'].filter(k => $(k).checked);
  if (!sel.length) { els.err.hidden = false; current = ''; render(); return; }
  els.err.hidden = true;
  const sets = sel.map(k => strip(SETS[k]));
  pool = sets.join('');
  const n = +els.len.value, out = [];
  sets.forEach(s => out.push(s[rnd(s.length)]));       // guarantee one of each chosen type
  while (out.length < n) out.push(pool[rnd(pool.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = rnd(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  current = out.slice(0, n).join('');
  render();
  history.unshift(current); if (history.length > 8) history.pop();
  renderHistory();
}

function render() {
  els.pw.replaceChildren(...[...current].map(c => {
    const s = document.createElement('span');
    s.className = /\d/.test(c) ? 'd' : /[a-z]/.test(c) ? 'l' : /[A-Z]/.test(c) ? 'u' : 's';
    s.textContent = c; return s;
  }));
  const bits = current ? Math.round(current.length * Math.log2(pool.length)) : 0;
  const lvl = bits < 40 ? 0 : bits < 60 ? 1 : bits < 80 ? 2 : bits < 110 ? 3 : 4;
  els.bar.style.width = current ? ((lvl + 1) * 20) + '%' : '0';
  els.bar.style.background = COLORS[lvl];
  els.strength.textContent = current ? LEVELS[lvl] : '';
  els.strength.style.color = COLORS[lvl];
  els.entropy.textContent = current ? `${bits} بت` : '';
}

function renderHistory() {
  els.list.dataset.empty = 'لا شيء بعد';
  els.list.replaceChildren(...history.map(p => {
    const li = document.createElement('li'), c = document.createElement('code'), s = document.createElement('small');
    c.textContent = p; s.textContent = 'نسخ'; li.append(c, s);
    li.tabIndex = 0; li.setAttribute('role', 'button');
    li.addEventListener('click', () => copy(p));
    li.addEventListener('keydown', e => { if (e.key === 'Enter') copy(p); });
    return li;
  }));
}

async function copy(text) {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select();
    document.execCommand('copy'); t.remove();
  }
  els.toast.textContent = 'تم النسخ ✓'; els.toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1400);
}

els.len.addEventListener('input', () => { els.lenv.textContent = els.len.value; generate(); });
['lower', 'upper', 'digits', 'symbols', 'ambig'].forEach(k => $(k).addEventListener('change', generate));
$('regen').addEventListener('click', generate);
$('copy').addEventListener('click', () => copy(current));
$('clear').addEventListener('click', () => { history.length = 0; renderHistory(); });
document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|BUTTON|LI/.test(document.activeElement.tagName)) { e.preventDefault(); generate(); } });

function setTheme(t, save) {
  document.documentElement.dataset.theme = t;
  $('tc').content = t === 'light' ? '#f4f7fc' : '#0b0f1a';
  if (save) { try { localStorage.setItem('theme', t); } catch (e) {} }
}
$('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true));
setTheme(document.documentElement.dataset.theme || 'dark', false);

generate();
