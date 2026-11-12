/* Simulado DSA — contador + persistência robusta (localStorage + backup + sessão retomável) */
const KEY = 'dsa_sim_v1';
const KEY_BK = 'dsa_sim_v1_backup';
const IMG_BASE = 'img/';
const AREAS = {
  1: 'Não supervisionado', 2: 'Regressão OLS', 3: 'Máxima verossimilhança',
  4: 'Árvores, ensembles e redes', 5: 'Técnicas diversas', 6: 'Gestão em Data Science'
};
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

const byId = {};
for (const q of BANCO) byId[q.id] = q;

let store = load();
let quiz = null;
let filtroArea = 0;

/* ---------- persistência ---------- */
function vazio() { return { answers: {}, session: null, updatedAt: null }; }
function load() {
  try { return Object.assign(vazio(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { return vazio(); }
}
function save() {
  store.updatedAt = new Date().toISOString();
  try {
    const txt = JSON.stringify(store);
    localStorage.setItem(KEY, txt);
    localStorage.setItem(KEY_BK, txt);      // cópia de segurança
    flash('Salvo ' + new Date().toLocaleTimeString('pt-BR'));
  } catch (e) {
    flash('ERRO ao salvar: ' + e.message, true);
  }
}
let flashTimer = null;
function flash(msg, erro) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = msg + ' · progresso persistente neste navegador';
  el.style.color = erro ? 'var(--bad)' : 'var(--muted)';
  clearTimeout(flashTimer);
  if (!erro) flashTimer = setTimeout(() => {
    el.textContent = 'Progresso salvo automaticamente neste navegador';
    el.style.color = 'var(--muted)';
  }, 2500);
}
/* grava também ao sair/trocar de aba */
addEventListener('pagehide', () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} });
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} } });

/* ---------- utilidades ---------- */
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const paras = t => esc(t).split('\n').filter(x => x.trim()).map(x => `<p>${x}</p>`).join('');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function answered(q) { const a = store.answers[q.id]; return !!(a && a.sel != null); }
function isCorrect(q) { const a = store.answers[q.id]; return !!(a && a.ok === true); }

function stats(list) {
  let ans = 0, ok = 0;
  for (const q of list) { if (answered(q)) { ans++; if (isCorrect(q)) ok++; } }
  return { ans, ok, total: list.length };
}

/* ---------- home ---------- */
function renderHome() {
  const geral = stats(BANCO);
  const pct = geral.ans ? Math.round(geral.ok / geral.ans * 100) : 0;

  const discs = [...new Set(BANCO.map(q => q.d))].sort((a, b) => a.localeCompare(b, 'pt'));
  const visiveis = discs.filter(d => {
    if (!filtroArea) return true;
    return BANCO.some(q => q.d === d && q.a === filtroArea);
  });

  const banner = store.session ? `
    <div class="banner">
      <div>
        <b>Sessão em andamento</b><br>
        <span class="small muted">${esc(store.session.disc)} · ${store.session.mode === 'prova' ? 'Prova' : 'Treino'} · item ${store.session.i + 1} de ${store.session.items.length}</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" id="btn-resume">Continuar</button>
        <button class="btn alt" id="btn-discard">Descartar</button>
      </div>
    </div>` : '';

  const chips = [0, 1, 2, 3, 4, 5, 6].map(a => {
    const label = a === 0 ? 'Todas' : `${a}. ${AREAS[a]}`;
    return `<button class="chip ${filtroArea === a ? 'on' : ''}" data-area="${a}">${esc(label)}</button>`;
  }).join('');

  const rows = visiveis.map(d => {
    const list = BANCO.filter(q => q.d === d);
    const s = stats(list);
    const p = s.total ? Math.round(s.ans / s.total * 100) : 0;
    const area = list[0].a;
    return `
      <div class="disc">
        <div class="disc-main">
          <div class="disc-name">${esc(d)}</div>
          <div class="disc-meta">
            <span>${s.ans}/${s.total} respondidas · ${s.ok} certas</span>
            <span>${p}%</span>
          </div>
          <div class="bar"><i style="width:${p}%"></i></div>
        </div>
        <div class="disc-actions">
          <button class="btn" data-start="${esc(d)}" data-mode="treino">Treinar</button>
          <button class="btn alt" data-start="${esc(d)}" data-mode="prova">Prova</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="grid">
      <div class="tile"><b>${geral.ans}/${geral.total}</b><span>respondidas</span></div>
      <div class="tile"><b>${geral.ok}</b><span>certas</span></div>
      <div class="tile"><b>${pct}%</b><span>aproveitamento</span></div>
    </div>

    ${banner}

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <b>Disciplinas</b>
        <button class="ghost" id="btn-reset">Zerar progresso</button>
      </div>
      <div class="chips">${chips}</div>
      <div style="margin-top:6px">${rows}</div>
    </div>
  `;

  document.querySelectorAll('[data-area]').forEach(b => b.onclick = () => { filtroArea = +b.dataset.area; renderHome(); });
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startQuiz(b.dataset.start, b.dataset.mode));
  document.getElementById('btn-reset').onclick = resetAll;
  if (store.session) {
    document.getElementById('btn-resume').onclick = resumeQuiz;
    document.getElementById('btn-discard').onclick = () => { store.session = null; save(); renderHome(); };
  }
}

function resetAll() {
  if (!confirm('Apagar TODO o progresso salvo? Isso não pode ser desfeito.')) return;
  store = vazio();
  save();
  renderHome();
}

/* ---------- quiz ---------- */
function buildItems(disc) {
  return BANCO.filter(q => q.d === disc).map(q => {
    const opts = q.fixa ? q.ordem.map((_, k) => k) : shuffle(q.ordem.map((_, k) => k));
    return { id: q.id, opts, sel: null, done: false };
  });
}

function startQuiz(disc, mode) {
  const items = buildItems(disc);
  if (!items.length) return;
  quiz = { disc, mode, items, i: 0 };
  persistSession();
  renderQuiz();
}

function persistSession() {
  if (!quiz) return;
  store.session = {
    disc: quiz.disc, mode: quiz.mode, i: quiz.i,
    items: quiz.items.map(it => ({ id: it.id, opts: it.opts, sel: it.sel, done: it.done })),
    startedAt: (store.session && store.session.startedAt) || new Date().toISOString()
  };
  save();
}

function resumeQuiz() {
  const s = store.session;
  if (!s) return;
  const items = s.items.map(it => ({ ...it }));
  quiz = { disc: s.disc, mode: s.mode, items, i: Math.min(s.i, items.length - 1) };
  renderQuiz();
}

function recordAnswer(item, reveal) {
  const q = byId[item.id];
  store.answers[q.id] = {
    sel: item.sel,
    ok: reveal ? item.sel === q.c : null,
    ts: new Date().toISOString()
  };
}

function choose(k) {
  const it = quiz.items[quiz.i];
  const q = byId[it.id];
  if (it.done) return;
  it.sel = k;

  if (quiz.mode === 'treino') {
    it.done = true;
    recordAnswer(it, true);
  } else {
    recordAnswer(it, false);
  }
  persistSession();
  renderQuiz();
}

function next() {
  if (quiz.i < quiz.items.length - 1) { quiz.i++; persistSession(); renderQuiz(); }
  else finish();
}
function prev() { if (quiz.i > 0) { quiz.i--; persistSession(); renderQuiz(); } }

function finish() {
  // registra respostas pendentes da prova
  for (const it of quiz.items) {
    const q = byId[it.id];
    if (!it.done) { it.done = true; recordAnswer(it, true); }
  }
  persistSession();
  renderResult();
}

function renderQuiz() {
  const it = quiz.items[quiz.i];
  const q = byId[it.id];
  const reveal = quiz.mode === 'treino' && it.done;
  const n = quiz.items.length;

  const imgs = (q.img || []).map(f => `<img class="qimg" src="${IMG_BASE}${encodeURIComponent(f)}" alt="figura da questão" loading="lazy">`).join('');

  const ops = it.opts.map((k, pos) => {
    let cls = 'opt';
    if (reveal) {
      if (k === q.c) cls += ' ok';
      else if (k === it.sel) cls += ' bad';
    } else if (it.sel === k) cls += ' sel';
    return `<button class="${cls}" data-k="${k}" ${reveal ? 'disabled' : ''}>
      <b>${LETRAS[pos]}</b><span>${esc(q.ordem[k])}</span>
    </button>`;
  }).join('');

  let feedback = '';
  if (reveal) {
    const acertou = it.sel === q.c;
    feedback = `
      <div class="exp ${acertou ? 'ok' : 'bad'}">
        ${acertou ? 'Correto.' : `Errado. A resposta certa é a alternativa ${LETRAS[it.opts.indexOf(q.c)]}.`}
      </div>
      <div class="why">
        <h4>Por que essa é a resposta</h4>
        <p>${esc(q.e || '')}</p>
        <p class="small muted">${q.s === 'confirma' ? '✓ ' : ''}${esc(q.f || '')}</p>
      </div>`;
  }

  document.getElementById('app').innerHTML = `
    <button class="ghost" id="btn-back">← Disciplinas</button>
    <div class="sticky">
      <div class="qhead">
        <span><b>${esc(quiz.disc)}</b> · ${quiz.mode === 'prova' ? 'Prova' : 'Treino'}</span>
        <span><b>${quiz.i + 1}/${n}</b></span>
      </div>
    </div>
    <div class="enun">${paras(q.q)}</div>
    ${imgs}
    ${ops}
    ${feedback}
    <div class="nav">
      <button class="btn alt" id="btn-prev" ${quiz.i === 0 ? 'disabled' : ''}>← Anterior</button>
      <button class="btn" id="btn-next">${quiz.i === n - 1 ? 'Finalizar' : 'Próxima →'}</button>
    </div>
    <p class="small muted" style="margin-top:14px">Respondida: ${it.sel != null ? 'sim' : 'não'} · a sessão e o progresso são salvos automaticamente.</p>
  `;

  document.getElementById('btn-back').onclick = () => { persistSession(); quiz = null; renderHome(); };
  document.getElementById('btn-prev').onclick = prev;
  document.getElementById('btn-next').onclick = next;
  if (!reveal) document.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(+b.dataset.k));
}

function renderResult() {
  const total = quiz.items.length;
  let ans = 0, ok = 0;
  quiz.items.forEach(it => { if (it.sel != null) { ans++; if (it.sel === byId[it.id].c) ok++; } });
  const pct = total ? Math.round(ok / total * 100) : 0;
  const nota = (ok / total * 10).toFixed(1).replace('.', ',');

  const linhas = quiz.items.map((it, idx) => {
    const q = byId[it.id];
    const acertou = it.sel === q.c;
    const nao = it.sel == null;
    return `<li>${idx + 1}. ${nao ? '<b class="muted">em branco</b>' : acertou ? '<b class="pass">certa</b>' : '<b class="fail">errada</b>'} — ${esc(q.q.slice(0, 110))}${q.q.length > 110 ? '…' : ''}</li>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="card" style="text-align:center">
      <div class="big ${pct >= 70 ? 'pass' : 'fail'}">${pct}%</div>
      <p>${ok} de ${total} certas · nota ${nota}</p>
      <p class="small muted">${esc(quiz.disc)}</p>
    </div>
    <div class="card">
      <b>Resultado item a item</b>
      <ul class="clean">${linhas}</ul>
    </div>
    <div class="nav">
      <button class="btn alt" id="btn-home">← Disciplinas</button>
      <button class="btn" id="btn-again">Refazer</button>
    </div>
  `;
  document.getElementById('btn-home').onclick = () => { store.session = null; save(); quiz = null; renderHome(); };
  document.getElementById('btn-again').onclick = () => { store.session = null; startQuiz(quiz.disc, quiz.mode); };
  store.session = null; save();
}

/* ---------- backup ---------- */
function exportBackup() {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `simulado-dsa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBackup(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data.answers) throw new Error('arquivo sem campo answers');
      store = Object.assign(vazio(), data);
      save(); renderHome();
      alert('Backup restaurado.');
    } catch (e) { alert('Falha ao restaurar: ' + e.message); }
  };
  r.readAsText(file);
}

/* ---------- boot ---------- */
document.getElementById('btn-export').onclick = exportBackup;
document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
document.getElementById('file-import').onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; };

renderHome();
