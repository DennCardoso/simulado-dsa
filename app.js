/* Simulado DSA — contador, filtro por dia e revisão de erradas */
const KEY = 'dsa_sim_v1';
const KEY_BK = 'dsa_sim_v1_backup';
const IMG_BASE = 'img/';
const AREAS = {
  1: 'Não supervisionado', 2: 'Regressão OLS', 3: 'Máxima verossimilhança',
  4: 'Árvores, ensembles e redes', 5: 'Técnicas diversas', 6: 'Gestão em Data Science'
};
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

/* Cronograma: dia → disciplinas */
const DIAS = {
  qua: { rotulo: 'Qua 11', discs: [
    'Supervised Machine Learning: Análise de Regressão Simples e Múltipla I',
    'Supervised Machine Learning: Análise de Regressão Simples e Múltipla II',
    'Supervised Machine Learning: Análise de Regressão Simples e Múltipla III',
    'Supervised Machine Learning: Análise de Regressão Simples e Múltipla IV',
    'Fundamentos de Estatística e Introdução à Programação com Python',
    'Análise da Conjuntura Econômica em Cenários de Tecnologias Disruptivas I',
    'Análise da Conjuntura Econômica em Cenários de Tecnologias Disruptivas II'] },
  qui: { rotulo: 'Qui 12', discs: [
    'Data Wrangling I', 'Data Wrangling II', 'Data Wrangling III', 'Data Wrangling IV',
    'Coleta de Dados: Crawlers e Web Scraping',
    'Text Mining, Sentiment Analysis e NLP I', 'Text Mining, Sentiment Analysis e NLP II',
    'Text Mining, Sentiment Analysis e NLP III',
    'Cloud Computing I', 'Cloud Computing II'] },
  sex: { rotulo: 'Sex 13', discs: [
    'Social Network Analysis I', 'Social Network Analysis II',
    'Pesquisa Operacional e Modelos de Otimização I',
    'Pesquisa Operacional e Modelos de Otimização II',
    'Pesquisa Operacional e Modelos de Otimização III',
    'Séries Temporais I', 'Séries Temporais II', 'Séries Temporais III',
    'Analytics e Gestão de Riscos I', 'Analytics e Gestão de Riscos II',
    'Big Data e Deployment de Modelos I', 'Big Data e Deployment de Modelos II',
    'Modelagem Matemática e Estruturação de Problemas Complexos I',
    'Modelagem Matemática e Estruturação de Problemas Complexos II'] },
  sab: { rotulo: 'Sáb 14', discs: [
    'Supervised Machine Learning: Modelos Logísticos Binários e Multinomiais I',
    'Supervised Machine Learning: Modelos Logísticos Binários e Multinomiais II',
    'Supervised Machine Learning: Modelos para Dados de Contagem I',
    'Supervised Machine Learning: Modelos para Dados de Contagem II',
    'Supervised Machine Learning: Modelagem Multinível I',
    'Supervised Machine Learning: Modelagem Multinível II',
    'Árvores, Redes e Ensemble Models I', 'Árvores, Redes e Ensemble Models II',
    'Árvores, Redes e Ensemble Models III',
    'Introdução ao Deep Learning e Inteligência Artificial',
    'Deep Learning e Inteligência Artificial I',
    'Engenharia de dados I', 'Engenharia de dados II', 'Engenharia de dados III',
    'Computação Evolucionária I', 'Computação Evolucionária II'] },
  dom: { rotulo: 'Dom 15', discs: [
    'Unsupervised Machine Learning: Clustering I', 'Unsupervised Machine Learning: Clustering II',
    'Unsupervised Machine Learning: Análise Fatorial e PCA I',
    'Unsupervised Machine Learning: Análise Fatorial e PCA II',
    'Unsupervised Machine Learning: Análise de Correspondência Simples e Múltipla I - 13/01/26',
    'Unsupervised Machine Learning: Análise de Correspondência Simples e Múltipla II',
    'Unsupervised Machine Learning: Exercícios Aplicados',
    'Metodologias Ágeis I', 'Metodologias Ágeis II',
    'Legislação no Ambiente Digital (LGPD)',
    'Business Intelligence e Data Visualization I',
    'Business Intelligence e Data Visualization II',
    'Business Intelligence e Data Visualization III',
    'Liderança em Data Science'] }
};
const DIA_DE = {};
for (const [k, d] of Object.entries(DIAS)) d.discs.forEach(nome => DIA_DE[nome] = k);

const byId = {};
for (const q of BANCO) byId[q.id] = q;

let store = load();
let quiz = null;
let filtroArea = 0;
let filtroDia = '';

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
    localStorage.setItem(KEY_BK, txt);
    flash('Salvo ' + new Date().toLocaleTimeString('pt-BR'));
  } catch (e) { flash('ERRO ao salvar: ' + e.message, true); }
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
addEventListener('pagehide', () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} });
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} } });

/* ---------- utilidades ---------- */
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const paras = t => esc(t).split('\n').filter(x => x.trim()).map(x => `<p>${x}</p>`).join('');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function answered(q) { const a = store.answers[q.id]; return !!(a && a.sel != null); }
function isCorrect(q) { const a = store.answers[q.id]; return !!(a && a.ok === true); }
function isWrong(q) { return answered(q) && !isCorrect(q); }

function stats(list) {
  let ans = 0, ok = 0, wrong = 0;
  for (const q of list) {
    if (answered(q)) { ans++; if (isCorrect(q)) ok++; else wrong++; }
  }
  return { ans, ok, wrong, total: list.length };
}

/* ---------- home ---------- */
function renderHome() {
  const geral = stats(BANCO);
  const pct = geral.ans ? Math.round(geral.ok / geral.ans * 100) : 0;

  const discs = [...new Set(BANCO.map(q => q.d))].sort((a, b) => a.localeCompare(b, 'pt'));
  const visiveis = discs.filter(d => {
    if (filtroDia && DIA_DE[d] !== filtroDia) return false;
    if (filtroArea && !BANCO.some(q => q.d === d && q.a === filtroArea)) return false;
    return true;
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

  const chipsArea = [0, 1, 2, 3, 4, 5, 6].map(a => {
    const label = a === 0 ? 'Todas as áreas' : `${a}. ${AREAS[a]}`;
    return `<button class="chip ${filtroArea === a ? 'on' : ''}" data-area="${a}">${esc(label)}</button>`;
  }).join('');

  const chipsDia = ['', 'qua', 'qui', 'sex', 'sab', 'dom'].map(k => {
    const label = k === '' ? 'Todos os dias' : DIAS[k].rotulo;
    return `<button class="chip ${filtroDia === k ? 'on' : ''}" data-dia="${k}">${esc(label)}</button>`;
  }).join('');

  const rows = visiveis.map(d => {
    const list = BANCO.filter(q => q.d === d);
    const s = stats(list);
    const p = s.total ? Math.round(s.ans / s.total * 100) : 0;
    const dia = DIA_DE[d] ? DIAS[DIA_DE[d]].rotulo : '—';
    const btnErr = s.wrong ? `<button class="btn alt" data-start="${esc(d)}" data-mode="erradas">Erradas (${s.wrong})</button>` : '';
    return `
      <div class="disc">
        <div class="disc-main">
          <div class="disc-name">${esc(d)} <span class="tag">${dia}</span></div>
          <div class="disc-meta">
            <span>${s.ans}/${s.total} respondidas · ${s.ok} certas · ${s.wrong} erradas</span>
            <span>${s.ans ? Math.round(s.ok / s.ans * 100) : 0}% acerto</span>
          </div>
          <div class="bar"><i style="width:${p}%"></i></div>
        </div>
        <div class="disc-actions">
          <button class="btn" data-start="${esc(d)}" data-mode="treino">Treinar</button>
          <button class="btn alt" data-start="${esc(d)}" data-mode="prova">Prova</button>
          ${btnErr}
        </div>
      </div>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="grid">
      <div class="tile"><b>${geral.ans}/${geral.total}</b><span>respondidas</span></div>
      <div class="tile"><b>${geral.ok}</b><span>certas</span></div>
      <div class="tile"><b class="${geral.wrong ? 'fail' : ''}">${geral.wrong}</b><span>erradas</span></div>
    </div>

    ${banner}

    ${geral.wrong ? `<button class="btn" id="btn-review-all" style="width:100%;padding:11px">Revisar todas as erradas (${geral.wrong})</button>` : ''}

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <b>Disciplinas</b>
        <button class="ghost" id="btn-reset">Zerar progresso</button>
      </div>
      <div class="chips">${chipsDia}</div>
      <div class="chips">${chipsArea}</div>
      <div style="margin-top:6px">${rows || '<p class="muted small">Nenhuma disciplina neste filtro.</p>'}</div>
    </div>
  `;

  document.querySelectorAll('[data-area]').forEach(b => b.onclick = () => { filtroArea = +b.dataset.area; renderHome(); });
  document.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { filtroDia = b.dataset.dia; renderHome(); });
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startDisc(b.dataset.start, b.dataset.mode));
  document.getElementById('btn-reset').onclick = resetAll;
  if (geral.wrong) document.getElementById('btn-review-all').onclick = () => startList(BANCO.filter(isWrong), 'Revisão — todas as erradas', 'treino');
  if (store.session) {
    document.getElementById('btn-resume').onclick = resumeQuiz;
    document.getElementById('btn-discard').onclick = () => { store.session = null; save(); renderHome(); };
  }
}

function resetAll() {
  if (!confirm('Apagar TODO o progresso salvo? Isso não pode ser desfeito.')) return;
  store = vazio(); save(); renderHome();
}

/* ---------- quiz ---------- */
function buildItems(list) {
  return list.map(q => {
    const opts = q.fixa ? q.ordem.map((_, k) => k) : shuffle(q.ordem.map((_, k) => k));
    return { id: q.id, opts, sel: null, done: false };
  });
}

function startDisc(disc, mode) {
  const base = BANCO.filter(q => q.d === disc);
  if (mode === 'erradas') return startList(base.filter(isWrong), disc + ' — erradas', 'treino');
  startList(base, disc, mode);
}

function startList(list, titulo, mode) {
  if (!list.length) { alert('Nenhuma questão para esta seleção.'); return; }
  quiz = { disc: titulo, mode, items: buildItems(list), i: 0 };
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
  quiz = { disc: s.disc, mode: s.mode, items: s.items.map(it => ({ ...it })), i: Math.min(s.i, s.items.length - 1) };
  renderQuiz();
}

function recordAnswer(item, reveal) {
  const q = byId[item.id];
  const prev = store.answers[q.id] || {};
  store.answers[q.id] = {
    sel: item.sel,
    ok: reveal ? item.sel === q.c : null,
    ts: new Date().toISOString(),
    tent: (prev.tent || 0) + 1
  };
}

function choose(k) {
  const it = quiz.items[quiz.i];
  if (it.done) return;
  it.sel = k;
  if (quiz.mode === 'treino') { it.done = true; recordAnswer(it, true); }
  else recordAnswer(it, false);
  persistSession();
  renderQuiz();
}

function next() {
  if (quiz.i < quiz.items.length - 1) { quiz.i++; persistSession(); renderQuiz(); }
  else finish();
}
function prev() { if (quiz.i > 0) { quiz.i--; persistSession(); renderQuiz(); } }

function finish() {
  for (const it of quiz.items) {
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

  const tent = (store.answers[q.id] && store.answers[q.id].tent) || 0;

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
    <p class="small muted" style="margin-top:14px">
      Respondida: ${it.sel != null ? 'sim' : 'não'} · tentativas nesta questão: ${tent} · sessão e progresso salvos automaticamente.
    </p>
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
  const erradas = quiz.items.filter(it => it.sel == null || it.sel !== byId[it.id].c);

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
    ${erradas.length ? `<button class="btn" id="btn-err-now" style="width:100%;padding:11px">Revisar as ${erradas.length} erradas desta sessão</button>` : ''}
    <div class="card">
      <b>Resultado item a item</b>
      <ul class="clean">${linhas}</ul>
    </div>
    <div class="nav">
      <button class="btn alt" id="btn-home">← Disciplinas</button>
      <button class="btn" id="btn-again">Refazer</button>
    </div>
  `;
  const disc = quiz.disc; const mode = quiz.mode;
  document.getElementById('btn-home').onclick = () => { store.session = null; save(); quiz = null; renderHome(); };
  document.getElementById('btn-again').onclick = () => { store.session = null; startList(BANCO.filter(q => quiz.items.some(it => it.id === q.id)), disc, mode); };
  if (erradas.length) document.getElementById('btn-err-now').onclick = () => {
    const ids = erradas.map(it => it.id);
    startList(BANCO.filter(q => ids.includes(q.id)), disc + ' — erradas', 'treino');
  };
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
