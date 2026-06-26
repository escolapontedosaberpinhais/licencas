/**
 * Aplicação de Gestão de Licenças — Escola Ponte do Saber.
 * Lógica de telas (painel, lista, detalhe), formulários, arquivos e backup.
 */
(() => {
  'use strict';

  // Janelas de alerta (em dias) antes do vencimento.
  const DIAS_BREVE = 30;     // vence em breve  (laranja)
  const DIAS_ATENCAO = 90;   // atenção         (amarelo)

  const main = document.getElementById('main');
  const estado = {
    view: 'dashboard',
    busca: '',
    categoria: 'todas',
    statusFiltro: 'todos',
    licencas: [],
  };

  // ---------------- Utilidades ----------------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function hoje0() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  function diasAteVencimento(dataStr) {
    if (!dataStr) return null;
    const d = new Date(dataStr + 'T00:00:00');
    return Math.round((d - hoje0()) / 86400000);
  }

  function statusDe(licenca) {
    const dias = diasAteVencimento(licenca.dataVencimento);
    if (dias === null) return 'semvenc';
    if (dias < 0) return 'vencida';
    if (dias <= DIAS_BREVE) return 'breve';
    if (dias <= DIAS_ATENCAO) return 'atencao';
    return 'emdia';
  }

  const STATUS_LABEL = {
    vencida: 'Vencida', breve: 'Vence em breve', atencao: 'Atenção',
    emdia: 'Em dia', semvenc: 'Sem vencimento',
  };

  function textoPrazo(licenca) {
    const dias = diasAteVencimento(licenca.dataVencimento);
    if (dias === null) return 'Sem data de vencimento';
    if (dias < 0) return `Vencida há ${Math.abs(dias)} dia(s)`;
    if (dias === 0) return 'Vence hoje';
    return `Vence em ${dias} dia(s)`;
  }

  function fmtData(s) {
    if (!s) return '—';
    const [a, m, d] = s.split('-');
    return `${d}/${m}/${a}`;
  }

  function fmtTamanho(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function iconeArquivo(tipo, nome) {
    const n = (nome || '').toLowerCase();
    if ((tipo || '').includes('pdf') || n.endsWith('.pdf')) return '📕';
    if ((tipo || '').startsWith('image/')) return '🖼️';
    if (n.match(/\.(doc|docx)$/)) return '📘';
    if (n.match(/\.(xls|xlsx|csv)$/)) return '📗';
    return '📎';
  }

  function toast(msg, tipo = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + tipo;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  async function carregar() {
    estado.licencas = await DB.listarLicencas();
  }

  // ---------------- Render principal ----------------
  function render() {
    document.querySelectorAll('.nav-link').forEach((b) =>
      b.classList.toggle('active', b.dataset.view === estado.view));
    if (estado.view === 'dashboard') renderDashboard();
    else if (estado.view === 'licencas') renderLista();
    else if (estado.view === 'config') renderConfig();
  }

  // ---------------- Painel ----------------
  function renderDashboard() {
    const lics = estado.licencas;
    const cont = { vencida: 0, breve: 0, atencao: 0, emdia: 0, semvenc: 0 };
    lics.forEach((l) => cont[statusDe(l)]++);

    const proximas = lics
      .filter((l) => l.dataVencimento)
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      .slice(0, 8);

    const acoes = lics.filter((l) => ['vencida', 'breve'].includes(statusDe(l)))
      .sort((a, b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || ''));

    main.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Painel</h1>
          <p>Visão geral das licenças da escola.</p>
        </div>
      </div>

      <div class="stats">
        ${statCard('vencida', cont.vencida, 'Vencidas')}
        ${statCard('breve', cont.breve, `Vencem em ${DIAS_BREVE} dias`)}
        ${statCard('atencao', cont.atencao, `Atenção (até ${DIAS_ATENCAO} dias)`)}
        ${statCard('emdia', cont.emdia, 'Em dia')}
        ${statCard('', lics.length, 'Total de licenças')}
      </div>

      ${acoes.length ? `
      <div class="detail-section">
        <h3>⚠️ Requer ação</h3>
        <div class="lic-list">
          ${acoes.map(cardLicenca).join('')}
        </div>
      </div>` : `
      <div class="card" style="text-align:center">
        <p style="margin:0">✅ Nenhuma licença vencida ou vencendo nos próximos ${DIAS_BREVE} dias.</p>
      </div>`}

      <div class="detail-section">
        <h3>Próximos vencimentos</h3>
        ${proximas.length ? `<div class="lic-list">${proximas.map(cardLicenca).join('')}</div>`
          : `<p class="muted">Nenhuma licença com data de vencimento cadastrada.</p>`}
      </div>
    `;

    main.querySelectorAll('[data-stat]').forEach((el) => {
      el.addEventListener('click', () => {
        estado.statusFiltro = el.dataset.stat || 'todos';
        estado.categoria = 'todas';
        estado.view = 'licencas';
        render();
      });
    });
    ligarCardsLicenca();
  }

  function statCard(cls, num, lbl) {
    return `<div class="stat ${cls}" data-stat="${cls || 'todos'}">
      <div class="num">${num}</div><div class="lbl">${lbl}</div>
    </div>`;
  }

  // ---------------- Lista ----------------
  function renderLista() {
    const cats = ORDEM_CATEGORIAS;
    let lics = estado.licencas.slice();

    if (estado.categoria !== 'todas') lics = lics.filter((l) => l.categoria === estado.categoria);
    if (estado.statusFiltro !== 'todos') lics = lics.filter((l) => statusDe(l) === estado.statusFiltro);
    if (estado.busca.trim()) {
      const q = estado.busca.toLowerCase();
      lics = lics.filter((l) =>
        (l.nome || '').toLowerCase().includes(q) ||
        (l.orgao || '').toLowerCase().includes(q) ||
        (l.numero || '').toLowerCase().includes(q) ||
        (l.observacoes || '').toLowerCase().includes(q));
    }
    lics.sort((a, b) => {
      const da = a.dataVencimento || '9999-12-31';
      const db = b.dataVencimento || '9999-12-31';
      return da.localeCompare(db);
    });

    main.innerHTML = `
      <div class="page-head">
        <div><h1>Licenças</h1><p>${lics.length} licença(s) listada(s).</p></div>
      </div>

      <div class="toolbar">
        <div class="search"><input type="text" id="busca" placeholder="Buscar por nome, órgão, número..." value="${esc(estado.busca)}"></div>
        <select class="filtro" id="filtro-status">
          <option value="todos">Todos os status</option>
          <option value="vencida">Vencidas</option>
          <option value="breve">Vencem em breve</option>
          <option value="atencao">Atenção</option>
          <option value="emdia">Em dia</option>
          <option value="semvenc">Sem vencimento</option>
        </select>
      </div>

      <div class="chips">
        <span class="chip ${estado.categoria === 'todas' ? 'active' : ''}" data-cat="todas">Todas</span>
        ${cats.map((c) => `<span class="chip ${estado.categoria === c ? 'active' : ''}" data-cat="${c}">${CATEGORIAS[c].icone} ${CATEGORIAS[c].nome}</span>`).join('')}
      </div>

      ${lics.length ? `<div class="lic-list">${lics.map(cardLicenca).join('')}</div>` : telaVazia()}
    `;

    document.getElementById('filtro-status').value = estado.statusFiltro;
    document.getElementById('filtro-status').addEventListener('change', (e) => {
      estado.statusFiltro = e.target.value; renderLista();
    });
    const busca = document.getElementById('busca');
    busca.addEventListener('input', (e) => { estado.busca = e.target.value; renderListaSomenteResultados(); });
    main.querySelectorAll('.chip').forEach((c) =>
      c.addEventListener('click', () => { estado.categoria = c.dataset.cat; renderLista(); }));
    ligarCardsLicenca();
  }

  // Atualiza só a lista enquanto digita, sem perder o foco do campo de busca.
  function renderListaSomenteResultados() {
    const sel = main.querySelector('.lic-list') || main.querySelector('.empty');
    if (!sel) return;
    let lics = estado.licencas.slice();
    if (estado.categoria !== 'todas') lics = lics.filter((l) => l.categoria === estado.categoria);
    if (estado.statusFiltro !== 'todos') lics = lics.filter((l) => statusDe(l) === estado.statusFiltro);
    if (estado.busca.trim()) {
      const q = estado.busca.toLowerCase();
      lics = lics.filter((l) =>
        (l.nome || '').toLowerCase().includes(q) ||
        (l.orgao || '').toLowerCase().includes(q) ||
        (l.numero || '').toLowerCase().includes(q) ||
        (l.observacoes || '').toLowerCase().includes(q));
    }
    lics.sort((a, b) => (a.dataVencimento || '9999-12-31').localeCompare(b.dataVencimento || '9999-12-31'));
    const html = lics.length ? `<div class="lic-list">${lics.map(cardLicenca).join('')}</div>` : telaVazia();
    sel.outerHTML = html;
    ligarCardsLicenca();
  }

  function telaVazia() {
    return `<div class="empty">
      <div class="em-icon">🗂️</div>
      <h3>Nenhuma licença encontrada</h3>
      <p>Clique em "Nova licença" para começar o cadastro.</p>
    </div>`;
  }

  function cardLicenca(l) {
    const st = statusDe(l);
    const cat = CATEGORIAS[l.categoria] || CATEGORIAS.outros;
    const reqTotal = (l.exigencias || []).length;
    const reqOk = (l.exigencias || []).filter((r) => r.concluido).length;
    const nArq = (l.arquivos || []).length;
    return `<div class="lic-card ${st}" data-id="${l.id}">
      <div class="lic-icon">${cat.icone}</div>
      <div class="lic-main">
        <div class="lic-title">${esc(l.nome)}</div>
        <div class="lic-meta">
          <span class="cat-tag" style="background:${cat.corBg};color:${cat.cor}">${cat.nome}</span>
          ${l.orgao ? `<span>🏢 ${esc(l.orgao)}</span>` : ''}
          ${l.numero ? `<span># ${esc(l.numero)}</span>` : ''}
        </div>
        <div class="mini-icons" style="margin-top:6px">
          ${reqTotal ? `<span>✅ ${reqOk}/${reqTotal} exigências</span>` : ''}
          ${nArq ? `<span>📎 ${nArq} arquivo(s)</span>` : ''}
          <span>🗓️ Vence: ${fmtData(l.dataVencimento)}</span>
        </div>
      </div>
      <div class="lic-right">
        <span class="badge ${st}">${STATUS_LABEL[st]}</span>
        <span class="lic-prazo muted">${textoPrazo(l)}</span>
      </div>
    </div>`;
  }

  function ligarCardsLicenca() {
    main.querySelectorAll('.lic-card').forEach((c) =>
      c.addEventListener('click', () => abrirDetalhe(c.dataset.id)));
  }

  // ---------------- Modal ----------------
  const overlay = document.getElementById('modal-overlay');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');

  function abrirModal(titulo, html) {
    modalTitle.textContent = titulo;
    modalBody.innerHTML = html;
    overlay.hidden = false;
  }
  function fecharModal() { overlay.hidden = true; modalBody.innerHTML = ''; }
  document.getElementById('modal-close').addEventListener('click', fecharModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) fecharModal(); });

  // ---------------- Formulário (criar/editar) ----------------
  function abrirFormulario(licenca) {
    const editando = !!licenca;
    const l = licenca || { categoria: 'sanitaria', exigencias: [], arquivos: [], historico: [] };
    const opcoesCat = ORDEM_CATEGORIAS.map((c) =>
      `<option value="${c}" ${l.categoria === c ? 'selected' : ''}>${CATEGORIAS[c].icone} ${CATEGORIAS[c].nome}</option>`).join('');

    abrirModal(editando ? 'Editar licença' : 'Nova licença', `
      <form id="form-licenca">
        <div class="form-grid">
          <div class="field full">
            <label>Nome / Descrição da licença *</label>
            <input name="nome" required value="${esc(l.nome || '')}" placeholder="Ex.: Alvará Sanitário 2026">
          </div>
          <div class="field">
            <label>Categoria *</label>
            <select name="categoria" id="sel-categoria">${opcoesCat}</select>
          </div>
          <div class="field">
            <label>Órgão emissor</label>
            <input name="orgao" id="inp-orgao" value="${esc(l.orgao || '')}" placeholder="Ex.: Vigilância Sanitária">
          </div>
          <div class="field">
            <label>Número / Protocolo</label>
            <input name="numero" value="${esc(l.numero || '')}" placeholder="Nº do documento">
          </div>
          <div class="field">
            <label>Responsável</label>
            <input name="responsavel" value="${esc(l.responsavel || '')}" placeholder="Quem cuida desta licença">
          </div>
          <div class="field">
            <label>Data de emissão</label>
            <input type="date" name="dataEmissao" value="${esc(l.dataEmissao || '')}">
          </div>
          <div class="field">
            <label>Data de vencimento</label>
            <input type="date" name="dataVencimento" value="${esc(l.dataVencimento || '')}">
            <span class="hint">Deixe em branco se a licença não vence.</span>
          </div>
          <div class="field full">
            <label>Observações</label>
            <textarea name="observacoes" placeholder="Anotações, condições, pendências...">${esc(l.observacoes || '')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" id="cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primary">${editando ? 'Salvar alterações' : 'Cadastrar licença'}</button>
        </div>
      </form>
    `);

    const form = document.getElementById('form-licenca');
    const selCat = document.getElementById('sel-categoria');
    const inpOrgao = document.getElementById('inp-orgao');

    // Ao trocar categoria num cadastro novo, sugere o órgão padrão.
    if (!editando) {
      const aplicar = () => { if (!inpOrgao.value) inpOrgao.value = CATEGORIAS[selCat.value].orgaoPadrao || ''; };
      aplicar();
      selCat.addEventListener('change', () => { inpOrgao.value = CATEGORIAS[selCat.value].orgaoPadrao || ''; });
    }

    document.getElementById('cancelar').addEventListener('click', fecharModal);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const dados = Object.fromEntries(fd.entries());
      const agora = new Date().toISOString();

      if (editando) {
        Object.assign(l, dados, { atualizadoEm: agora });
        await DB.salvarLicenca(l);
        toast('Licença atualizada.', 'ok');
      } else {
        const nova = {
          id: uid(),
          ...dados,
          exigencias: (CATEGORIAS[dados.categoria].exigencias || []).map((t) => ({ texto: t, concluido: false })),
          arquivos: [],
          historico: [{ data: agora, acao: 'Licença cadastrada' }],
          criadoEm: agora,
          atualizadoEm: agora,
        };
        await DB.salvarLicenca(nova);
        toast('Licença cadastrada com a checklist padrão da categoria.', 'ok');
      }
      await carregar();
      fecharModal();
      if (editando) abrirDetalhe(l.id); else render();
    });
  }

  // ---------------- Detalhe ----------------
  async function abrirDetalhe(id) {
    const l = await DB.obterLicenca(id);
    if (!l) return;
    const st = statusDe(l);
    const cat = CATEGORIAS[l.categoria] || CATEGORIAS.outros;
    const exig = l.exigencias || [];
    const ok = exig.filter((r) => r.concluido).length;
    const pct = exig.length ? Math.round((ok / exig.length) * 100) : 0;

    abrirModal(`${cat.icone} ${l.nome}`, `
      <div class="tags-line" style="margin-bottom:14px">
        <span class="cat-tag" style="background:${cat.corBg};color:${cat.cor}">${cat.nome}</span>
        <span class="badge ${st}">${STATUS_LABEL[st]}</span>
        <span class="muted">${textoPrazo(l)}</span>
      </div>

      <div class="detail-grid">
        <div class="detail-item"><div class="k">Órgão emissor</div><div class="v">${esc(l.orgao) || '—'}</div></div>
        <div class="detail-item"><div class="k">Número / Protocolo</div><div class="v">${esc(l.numero) || '—'}</div></div>
        <div class="detail-item"><div class="k">Emissão</div><div class="v">${fmtData(l.dataEmissao)}</div></div>
        <div class="detail-item"><div class="k">Vencimento</div><div class="v">${fmtData(l.dataVencimento)}</div></div>
        <div class="detail-item"><div class="k">Responsável</div><div class="v">${esc(l.responsavel) || '—'}</div></div>
      </div>
      ${l.observacoes ? `<div class="detail-item" style="margin-top:12px"><div class="k">Observações</div><div class="v" style="font-weight:400;white-space:pre-wrap">${esc(l.observacoes)}</div></div>` : ''}

      <div class="detail-section">
        <h3>Exigências / Checklist ${exig.length ? `(${ok}/${exig.length})` : ''}</h3>
        ${exig.length ? `<div class="progress"><div style="width:${pct}%"></div></div>` : ''}
        <ul class="check-list" id="check-list"></ul>
        <div class="check-add">
          <input type="text" id="nova-exig" class="" placeholder="Adicionar item à checklist..." style="padding:9px 11px;border:1px solid var(--borda);border-radius:8px;font-size:14px">
          <button class="btn btn-sm" id="add-exig">+ Adicionar</button>
        </div>
      </div>

      <div class="detail-section">
        <h3>Arquivos / Documentos</h3>
        <div class="file-list" id="file-list"></div>
        <div class="dropzone" id="dropzone" style="margin-top:10px">
          📤 Clique aqui ou arraste arquivos (PDF, imagens, etc.)
          <input type="file" id="file-input" multiple hidden>
        </div>
      </div>

      <div class="detail-section">
        <h3>Histórico</h3>
        <ul class="hist-list" id="hist-list"></ul>
      </div>

      <div class="divider"></div>
      <div class="form-actions" style="justify-content:space-between">
        <button class="btn btn-danger" id="del-lic">🗑️ Excluir</button>
        <div style="display:flex;gap:10px">
          <button class="btn" id="renovar-lic">🔄 Registrar renovação</button>
          <button class="btn btn-primary" id="edit-lic">✏️ Editar</button>
        </div>
      </div>
    `);

    renderChecklist(l);
    renderArquivos(l);
    renderHistorico(l);

    document.getElementById('edit-lic').addEventListener('click', () => abrirFormulario(l));
    document.getElementById('del-lic').addEventListener('click', async () => {
      if (!confirm(`Excluir a licença "${l.nome}"? Esta ação não pode ser desfeita e remove também os arquivos anexados.`)) return;
      await DB.removerLicenca(l.id);
      await carregar();
      fecharModal();
      render();
      toast('Licença excluída.', '');
    });
    document.getElementById('renovar-lic').addEventListener('click', () => abrirRenovacao(l));

    // Adicionar exigência
    const addExig = async () => {
      const inp = document.getElementById('nova-exig');
      const txt = inp.value.trim();
      if (!txt) return;
      l.exigencias = l.exigencias || [];
      l.exigencias.push({ texto: txt, concluido: false });
      await DB.salvarLicenca(l);
      inp.value = '';
      renderChecklist(l);
    };
    document.getElementById('add-exig').addEventListener('click', addExig);
    document.getElementById('nova-exig').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addExig(); } });

    // Upload de arquivos
    const dz = document.getElementById('dropzone');
    const fi = document.getElementById('file-input');
    dz.addEventListener('click', () => fi.click());
    fi.addEventListener('change', () => receberArquivos(l, fi.files));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('drag'); receberArquivos(l, e.dataTransfer.files); });
  }

  function renderChecklist(l) {
    const ul = document.getElementById('check-list');
    if (!ul) return;
    const exig = l.exigencias || [];
    ul.innerHTML = exig.map((r, i) => `
      <li class="check-item ${r.concluido ? 'done' : ''}">
        <input type="checkbox" data-i="${i}" ${r.concluido ? 'checked' : ''}>
        <span class="txt">${esc(r.texto)}</span>
        <button class="icon-btn btn-sm" data-del="${i}" title="Remover" style="font-size:14px">✕</button>
      </li>`).join('') || '<li class="muted" style="font-size:14px">Nenhuma exigência cadastrada.</li>';

    ul.querySelectorAll('input[type=checkbox]').forEach((cb) =>
      cb.addEventListener('change', async () => {
        l.exigencias[+cb.dataset.i].concluido = cb.checked;
        await DB.salvarLicenca(l);
        renderChecklist(l);
        atualizarProgresso(l);
      }));
    ul.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        l.exigencias.splice(+b.dataset.del, 1);
        await DB.salvarLicenca(l);
        renderChecklist(l);
        atualizarProgresso(l);
      }));
  }

  function atualizarProgresso(l) {
    const exig = l.exigencias || [];
    const ok = exig.filter((r) => r.concluido).length;
    const pct = exig.length ? Math.round((ok / exig.length) * 100) : 0;
    const bar = modalBody.querySelector('.progress > div');
    if (bar) bar.style.width = pct + '%';
    const h = [...modalBody.querySelectorAll('.detail-section h3')].find((x) => x.textContent.startsWith('Exigências'));
    if (h) h.textContent = `Exigências / Checklist ${exig.length ? `(${ok}/${exig.length})` : ''}`;
  }

  async function receberArquivos(l, fileList) {
    const arquivos = Array.from(fileList);
    if (!arquivos.length) return;
    l.arquivos = l.arquivos || [];
    for (const f of arquivos) {
      if (f.size > 15 * 1048576) { toast(`"${f.name}" é maior que 15 MB e foi ignorado.`, 'err'); continue; }
      const aid = uid();
      await DB.salvarArquivo(aid, f);
      l.arquivos.push({ id: aid, nome: f.name, tipo: f.type, tamanho: f.size, adicionadoEm: new Date().toISOString() });
    }
    await DB.salvarLicenca(l);
    renderArquivos(l);
    toast('Arquivo(s) anexado(s).', 'ok');
  }

  function renderArquivos(l) {
    const wrap = document.getElementById('file-list');
    if (!wrap) return;
    const arqs = l.arquivos || [];
    wrap.innerHTML = arqs.map((a) => `
      <div class="file-row">
        <span class="fi">${iconeArquivo(a.tipo, a.nome)}</span>
        <span class="fn" title="${esc(a.nome)}">${esc(a.nome)}</span>
        <span class="fs">${fmtTamanho(a.tamanho || 0)}</span>
        <button class="icon-btn btn-sm" data-ver="${a.id}" title="Abrir/baixar" style="font-size:15px">⬇️</button>
        <button class="icon-btn btn-sm" data-rem="${a.id}" title="Remover" style="font-size:15px">🗑️</button>
      </div>`).join('') || '<p class="muted" style="font-size:14px">Nenhum arquivo anexado.</p>';

    wrap.querySelectorAll('[data-ver]').forEach((b) =>
      b.addEventListener('click', async () => {
        const reg = await DB.obterArquivo(b.dataset.ver);
        if (!reg) return toast('Arquivo não encontrado.', 'err');
        const meta = (l.arquivos || []).find((x) => x.id === b.dataset.ver);
        const url = URL.createObjectURL(reg.blob);
        const a = document.createElement('a');
        a.href = url; a.download = meta ? meta.nome : 'arquivo';
        a.target = '_blank';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }));
    wrap.querySelectorAll('[data-rem]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Remover este arquivo?')) return;
        await DB.removerArquivo(b.dataset.rem);
        l.arquivos = (l.arquivos || []).filter((x) => x.id !== b.dataset.rem);
        await DB.salvarLicenca(l);
        renderArquivos(l);
      }));
  }

  function renderHistorico(l) {
    const ul = document.getElementById('hist-list');
    if (!ul) return;
    const h = (l.historico || []).slice().reverse();
    ul.innerHTML = h.map((it) => `
      <li class="hist-item">
        <div>${esc(it.acao)}</div>
        <div class="ht">${new Date(it.data).toLocaleString('pt-BR')}</div>
      </li>`).join('') || '<li class="muted" style="font-size:14px">Sem registros.</li>';
  }

  // ---------------- Renovação ----------------
  function abrirRenovacao(l) {
    abrirModal('🔄 Registrar renovação', `
      <p class="muted" style="margin-bottom:14px">Informe os dados da renovação. O vencimento anterior (${fmtData(l.dataVencimento)}) será guardado no histórico.</p>
      <form id="form-renov">
        <div class="form-grid">
          <div class="field">
            <label>Nova data de emissão</label>
            <input type="date" name="dataEmissao" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="field">
            <label>Nova data de vencimento *</label>
            <input type="date" name="dataVencimento" required>
          </div>
          <div class="field full">
            <label>Novo número / protocolo (opcional)</label>
            <input name="numero" placeholder="Deixe em branco para manter o atual">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" id="cancel-renov">Cancelar</button>
          <button type="submit" class="btn btn-primary">Confirmar renovação</button>
        </div>
      </form>
    `);
    document.getElementById('cancel-renov').addEventListener('click', () => abrirDetalhe(l.id));
    document.getElementById('form-renov').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      const venctoAnterior = l.dataVencimento;
      l.historico = l.historico || [];
      l.historico.push({
        data: new Date().toISOString(),
        acao: `Renovada. Vencimento anterior: ${fmtData(venctoAnterior)} → novo: ${fmtData(fd.dataVencimento)}${fd.numero ? ` · nº ${fd.numero}` : ''}`,
      });
      l.dataEmissao = fd.dataEmissao || l.dataEmissao;
      l.dataVencimento = fd.dataVencimento;
      if (fd.numero) l.numero = fd.numero;
      l.atualizadoEm = new Date().toISOString();
      await DB.salvarLicenca(l);
      await carregar();
      toast('Renovação registrada.', 'ok');
      abrirDetalhe(l.id);
    });
  }

  // ---------------- Backup / Config ----------------
  function renderConfig() {
    main.innerHTML = `
      <div class="page-head"><div><h1>Backup e dados</h1><p>Exporte e guarde seus dados com segurança.</p></div></div>

      <div class="card">
        <h2>⚠️ Importante</h2>
        <p>Os dados deste sistema ficam salvos <strong>apenas neste navegador, neste computador</strong>. Se o navegador for limpo, o computador trocado ou os dados apagados, tudo se perde. Faça backups regularmente e guarde o arquivo em local seguro (pen drive, e-mail, nuvem).</p>
      </div>

      <div class="card">
        <h2>Exportar backup</h2>
        <p>Gera um arquivo <code>.json</code> com todas as licenças, exigências e arquivos anexados. Recomenda-se exportar ao menos uma vez por semana.</p>
        <div class="row"><button class="btn btn-primary" id="btn-export">⬇️ Exportar backup completo</button></div>
      </div>

      <div class="card">
        <h2>Importar backup</h2>
        <p>Restaura os dados a partir de um arquivo de backup. Você pode <strong>mesclar</strong> com os dados atuais ou <strong>substituir</strong> tudo.</p>
        <div class="row">
          <input type="file" id="imp-file" accept="application/json,.json">
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn" id="btn-import-merge">Importar e mesclar</button>
          <button class="btn btn-danger" id="btn-import-replace">Importar e substituir tudo</button>
        </div>
      </div>

      <div class="card">
        <h2>Sobre</h2>
        <p>Sistema de Gestão de Licenças — Escola Ponte do Saber. Categorias disponíveis: ${ORDEM_CATEGORIAS.map((c) => CATEGORIAS[c].icone + ' ' + CATEGORIAS[c].nome).join(', ')}.</p>
      </div>
    `;

    document.getElementById('btn-export').addEventListener('click', exportar);
    document.getElementById('btn-import-merge').addEventListener('click', () => importar(false));
    document.getElementById('btn-import-replace').addEventListener('click', () => importar(true));
  }

  async function exportar() {
    try {
      const dados = await DB.exportarTudo();
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-licencas-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Backup exportado.', 'ok');
    } catch (err) { toast('Erro ao exportar: ' + err.message, 'err'); }
  }

  async function importar(substituir) {
    const inp = document.getElementById('imp-file');
    const f = inp.files[0];
    if (!f) return toast('Selecione um arquivo de backup primeiro.', 'err');
    if (substituir && !confirm('Isso vai APAGAR todos os dados atuais e substituir pelos do arquivo. Continuar?')) return;
    try {
      const texto = await f.text();
      const dados = JSON.parse(texto);
      if (!dados || dados.app !== 'ponte-licencas') {
        if (!confirm('Este arquivo não parece ser um backup deste sistema. Tentar importar mesmo assim?')) return;
      }
      await DB.importarTudo(dados, { substituir });
      await carregar();
      toast('Backup importado com sucesso.', 'ok');
      estado.view = 'dashboard';
      render();
    } catch (err) { toast('Erro ao importar: ' + err.message, 'err'); }
  }

  // ---------------- Navegação ----------------
  document.querySelectorAll('.nav-link').forEach((b) =>
    b.addEventListener('click', () => {
      estado.view = b.dataset.view;
      if (estado.view === 'licencas') { estado.statusFiltro = 'todos'; estado.categoria = 'todas'; estado.busca = ''; }
      render();
    }));
  document.getElementById('btn-nova-licenca').addEventListener('click', () => abrirFormulario(null));

  // ---------------- Início ----------------
  (async function init() {
    try {
      await carregar();
      render();
    } catch (err) {
      main.innerHTML = `<div class="card"><h2>Erro ao iniciar</h2><p>${esc(err.message)}</p></div>`;
    }
  })();
})();
