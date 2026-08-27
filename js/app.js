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
    manutencoes: [],
    fornecedores: [],
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

  function urlAbs(u) {
    u = (u || '').trim();
    if (!u) return '';
    return /^https?:\/\//i.test(u) ? u : 'https://' + u;
  }
  function linkHtml(u) {
    return `<a href="${esc(urlAbs(u))}" target="_blank" rel="noopener">${esc(u)}</a>`;
  }

  // Bloco de detalhe com dados de acesso ao portal, custo e links de referência.
  function seccaoAcessoCusto(l) {
    const temAcesso = l.portal || l.login || l.senha || l.email || l.valor;
    const links = (l.linksUteis || '').split('\n').map((s) => s.trim()).filter(Boolean);
    if (!temAcesso && !links.length) return '';
    let itens = '';
    if (l.portal) itens += `<div class="detail-item"><div class="k">Site / Portal</div><div class="v">${linkHtml(l.portal)}</div></div>`;
    if (l.valor) itens += `<div class="detail-item"><div class="k">Valor pago</div><div class="v">${esc(l.valor)}</div></div>`;
    if (l.login) itens += `<div class="detail-item"><div class="k">Login / Usuário</div><div class="v">${esc(l.login)}</div></div>`;
    if (l.email) itens += `<div class="detail-item"><div class="k">E-mail usado</div><div class="v">${esc(l.email)}</div></div>`;
    if (l.senha) itens += `<div class="detail-item"><div class="k">Senha</div><div class="v"><span id="senha-detalhe" data-real="${esc(l.senha)}">••••••••</span> <button class="btn btn-sm" id="ver-senha-detalhe" type="button">mostrar</button></div></div>`;
    const secLinks = links.length
      ? `<div style="margin-top:12px"><div class="k">Links úteis / referências</div><ul style="margin:6px 0 0 18px">${links.map((x) => `<li>${linkHtml(x)}</li>`).join('')}</ul></div>`
      : '';
    return `<div class="detail-section"><h3>Acesso ao portal, custo e referências</h3><div class="detail-grid">${itens}</div>${secLinks}</div>`;
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
    [estado.licencas, estado.manutencoes, estado.fornecedores] = await Promise.all([
      DB.listarLicencas(),
      DB.listarManutencoes(),
      DB.listarFornecedores(),
    ]);
  }

  // ---------------- Render principal ----------------
  function render() {
    document.querySelectorAll('.nav-link').forEach((b) =>
      b.classList.toggle('active', b.dataset.view === estado.view));
    document.getElementById('btn-nova-licenca').hidden = estado.view === 'manutencoes' || estado.view === 'fornecedores';
    if (estado.view === 'dashboard') renderDashboard();
    else if (estado.view === 'licencas') renderLista();
    else if (estado.view === 'manutencoes') renderManutencoes();
    else if (estado.view === 'fornecedores') renderFornecedores();
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

    const manutAlerts = estado.manutencoes
      .filter((m) => ['vencida', 'breve'].includes(statusManutencao(m)))
      .sort((a, b) => (a.dataProxima || '').localeCompare(b.dataProxima || ''));

    const fornAlerts = estado.fornecedores
      .filter((f) => ['vencida', 'breve'].includes(statusFornecedor(f)));

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

      ${manutAlerts.length ? `
      <div class="detail-section">
        <h3>🔧 Manutenções que requerem ação</h3>
        <div class="lic-list">${manutAlerts.map(cardManutencao).join('')}</div>
      </div>` : ''}

      ${fornAlerts.length ? `
      <div class="detail-section">
        <h3>🤝 Fornecedores com documentos a vencer</h3>
        <div class="lic-list">${fornAlerts.map(cardFornecedor).join('')}</div>
      </div>` : ''}
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
    ligarCardsManutencao();
    ligarCardsFornecedor();
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
        <button class="btn btn-sm" data-edit="${l.id}" style="margin-top:6px;align-self:flex-end">✏️ Editar</button>
      </div>
    </div>`;
  }

  function ligarCardsLicenca() {
    main.querySelectorAll('.lic-card[data-id]').forEach((c) =>
      c.addEventListener('click', () => abrirDetalhe(c.dataset.id)));
    main.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const l = await DB.obterLicenca(b.dataset.edit);
        if (l) abrirFormulario(l);
      }));
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
          ${!editando ? `<div class="field full">
            <label>Modelo de checklist (opcional)</label>
            <select name="modeloChecklist">
              <option value="">Usar checklist padrão da categoria</option>
              ${MODELOS_CHECKLIST.map((m) => `<option value="${m.id}">${esc(m.nome)} — ${m.itens.length} itens</option>`).join('')}
            </select>
            <span class="hint">Listas prontas de exigências. Você poderá editar os itens depois.</span>
          </div>` : ''}

          <div class="field full"><div class="sub-label">Acesso ao portal, custo e referências</div></div>
          <div class="field">
            <label>Site / Portal da solicitação</label>
            <input name="portal" value="${esc(l.portal || '')}" placeholder="Ex.: portal.prefeitura.gov.br">
          </div>
          <div class="field">
            <label>Valor pago</label>
            <input name="valor" value="${esc(l.valor || '')}" placeholder="Ex.: R$ 150,00 ou Isento">
          </div>
          <div class="field">
            <label>Login / Usuário de acesso</label>
            <input name="login" value="${esc(l.login || '')}" placeholder="Usuário do portal" autocomplete="off">
          </div>
          <div class="field">
            <label>Senha de acesso</label>
            <div class="senha-wrap">
              <input name="senha" id="inp-senha" type="password" value="${esc(l.senha || '')}" placeholder="Senha do portal" autocomplete="new-password">
              <button type="button" class="btn btn-sm" id="toggle-senha">mostrar</button>
            </div>
            <span class="hint">Fica salva só neste navegador. Não digite senhas bancárias.</span>
          </div>
          <div class="field full">
            <label>E-mail usado na solicitação</label>
            <input name="email" type="email" value="${esc(l.email || '')}" placeholder="email@escola.com" autocomplete="off">
          </div>
          <div class="field full">
            <label>Links úteis / referências</label>
            <textarea name="linksUteis" placeholder="Um link por linha: manual de boas práticas, páginas específicas do portal...">${esc(l.linksUteis || '')}</textarea>
            <span class="hint">Cole um link por linha. Eles ficarão clicáveis na ficha da licença.</span>
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

    // Mostrar/ocultar senha
    const tglSenha = document.getElementById('toggle-senha');
    if (tglSenha) tglSenha.addEventListener('click', () => {
      const i = document.getElementById('inp-senha');
      const visivel = i.type === 'text';
      i.type = visivel ? 'password' : 'text';
      tglSenha.textContent = visivel ? 'mostrar' : 'ocultar';
    });

    document.getElementById('cancelar').addEventListener('click', fecharModal);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const dados = Object.fromEntries(fd.entries());
      const modeloId = dados.modeloChecklist;
      delete dados.modeloChecklist; // campo auxiliar, não faz parte do registro
      const agora = new Date().toISOString();

      if (editando) {
        Object.assign(l, dados, { atualizadoEm: agora });
        await DB.salvarLicenca(l);
        toast('Licença atualizada.', 'ok');
      } else {
        const modelo = MODELOS_CHECKLIST.find((m) => m.id === modeloId);
        const baseExig = modelo ? modelo.itens : (CATEGORIAS[dados.categoria].exigencias || []);
        const nova = {
          id: uid(),
          ...dados,
          exigencias: baseExig.map((t) => ({ texto: t, concluido: false })),
          arquivos: [],
          historico: [{ data: agora, acao: 'Licença cadastrada' }],
          criadoEm: agora,
          atualizadoEm: agora,
        };
        await DB.salvarLicenca(nova);
        toast(modelo
          ? `Licença cadastrada com o modelo "${modelo.nome}" (${modelo.itens.length} itens).`
          : 'Licença cadastrada com a checklist padrão da categoria.', 'ok');
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

      ${seccaoAcessoCusto(l)}

      <div class="detail-section">
        <h3>Exigências / Checklist ${exig.length ? `(${ok}/${exig.length})` : ''}</h3>
        ${exig.length ? `<div class="progress"><div style="width:${pct}%"></div></div>` : ''}
        <ul class="check-list" id="check-list"></ul>
        <div class="check-add">
          <input type="text" id="nova-exig" class="" placeholder="Adicionar item à checklist..." style="padding:9px 11px;border:1px solid var(--borda);border-radius:8px;font-size:14px">
          <button class="btn btn-sm" id="add-exig">+ Adicionar</button>
        </div>
        <div class="check-add" style="margin-top:6px">
          <select id="sel-modelo" style="flex:1;padding:9px 11px;border:1px solid var(--borda);border-radius:8px;font-size:14px;background:#fff">
            <option value="">Aplicar modelo de checklist pronto...</option>
            ${MODELOS_CHECKLIST.map((m) => `<option value="${m.id}">${esc(m.nome)} — ${m.itens.length} itens</option>`).join('')}
          </select>
          <button class="btn btn-sm" id="aplicar-modelo" type="button">Aplicar</button>
        </div>
        <div id="modelo-doc" class="hint" style="margin-top:6px"></div>
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

    // Mostrar/ocultar senha na ficha
    const verSenha = document.getElementById('ver-senha-detalhe');
    if (verSenha) verSenha.addEventListener('click', () => {
      const s = document.getElementById('senha-detalhe');
      const mostrando = s.dataset.shown === '1';
      s.textContent = mostrando ? '••••••••' : s.dataset.real;
      s.dataset.shown = mostrando ? '' : '1';
      verSenha.textContent = mostrando ? 'mostrar' : 'ocultar';
    });

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

    // Aplicar modelo de checklist + link do documento oficial
    const selModelo = document.getElementById('sel-modelo');
    const modeloDoc = document.getElementById('modelo-doc');
    if (selModelo) selModelo.addEventListener('change', () => {
      const m = MODELOS_CHECKLIST.find((x) => x.id === selModelo.value);
      modeloDoc.innerHTML = (m && m.arquivoRef)
        ? `📄 Documento oficial: <a href="${esc(m.arquivoRef)}" target="_blank" rel="noopener">abrir PDF</a>`
        : '';
    });
    const aplicarBtn = document.getElementById('aplicar-modelo');
    if (aplicarBtn) aplicarBtn.addEventListener('click', async () => {
      const m = MODELOS_CHECKLIST.find((x) => x.id === selModelo.value);
      if (!m) return toast('Escolha um modelo na lista.', 'err');
      l.exigencias = l.exigencias || [];
      const existentes = new Set(l.exigencias.map((r) => r.texto));
      let add = 0;
      m.itens.forEach((t) => { if (!existentes.has(t)) { l.exigencias.push({ texto: t, concluido: false }); add++; } });
      await DB.salvarLicenca(l);
      selModelo.value = '';
      modeloDoc.innerHTML = '';
      renderChecklist(l);
      atualizarProgresso(l);
      toast(add ? `${add} item(ns) adicionado(s) do modelo.` : 'Todos os itens do modelo já estavam na checklist.', add ? 'ok' : '');
    });

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
    let ok = 0;
    for (const f of arquivos) {
      if (f.size > 50 * 1048576) { toast(`"${f.name}" é maior que 50 MB e foi ignorado.`, 'err'); continue; }
      try {
        const aid = uid();
        const storagePath = await DB.salvarArquivo(aid, l.id, f);
        l.arquivos.push({ id: aid, nome: f.name, tipo: f.type, tamanho: f.size, storagePath, adicionadoEm: new Date().toISOString() });
        ok++;
      } catch (err) { toast(`Erro ao enviar "${f.name}": ${err.message}`, 'err'); }
    }
    await DB.salvarLicenca(l);
    renderArquivos(l);
    if (ok) toast(`${ok} arquivo(s) enviado(s).`, 'ok');
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
        <button class="icon-btn btn-sm" data-vis="${a.id}" title="Visualizar" style="font-size:15px">👁️</button>
        <button class="icon-btn btn-sm" data-ver="${a.id}" title="Baixar" style="font-size:15px">⬇️</button>
        <button class="icon-btn btn-sm" data-rem="${a.id}" title="Remover" style="font-size:15px">🗑️</button>
      </div>`).join('') || '<p class="muted" style="font-size:14px">Nenhum arquivo anexado.</p>';

    wrap.querySelectorAll('[data-vis]').forEach((b) =>
      b.addEventListener('click', async () => {
        const meta = (l.arquivos || []).find((x) => x.id === b.dataset.vis);
        if (!meta?.storagePath) return toast('Arquivo não encontrado no servidor.', 'err');
        try {
          const url = await DB.obterArquivoUrl(meta.storagePath);
          window.open(url, '_blank', 'noopener');
        } catch (err) { toast('Erro ao abrir arquivo: ' + err.message, 'err'); }
      }));
    wrap.querySelectorAll('[data-ver]').forEach((b) =>
      b.addEventListener('click', async () => {
        const meta = (l.arquivos || []).find((x) => x.id === b.dataset.ver);
        if (!meta?.storagePath) return toast('Arquivo não encontrado no servidor.', 'err');
        try {
          const url = await DB.obterArquivoUrl(meta.storagePath);
          const a = document.createElement('a');
          a.href = url; a.download = meta.nome; a.target = '_blank';
          document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { toast('Erro ao abrir arquivo: ' + err.message, 'err'); }
      }));
    wrap.querySelectorAll('[data-rem]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Remover este arquivo?')) return;
        const meta = (l.arquivos || []).find((x) => x.id === b.dataset.rem);
        if (meta?.storagePath) await DB.removerArquivo(meta.storagePath);
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
      <div class="page-head"><div><h1>Backup e dados</h1><p>Exporte e restaure os dados do sistema.</p></div></div>

      <div class="card">
        <h2>☁️ Armazenamento na nuvem</h2>
        <p>Licenças, manutenções e arquivos ficam salvos no <strong>Supabase</strong> (nuvem). Os dados são acessíveis de qualquer dispositivo após login e não se perdem se o navegador for limpo.</p>
        <p style="margin-top:8px">Os arquivos anexados ficam no <strong>Supabase Storage</strong> e <em>não</em> são incluídos no backup JSON — apenas os metadados. Re-faça o upload dos documentos se restaurar de um backup antigo.</p>
      </div>

      <div class="card">
        <h2>Exportar backup</h2>
        <p>Gera um arquivo <code>.json</code> com todas as licenças e manutenções. Recomenda-se exportar ao menos uma vez por semana como cópia de segurança extra.</p>
        <div class="row"><button class="btn btn-primary" id="btn-export">⬇️ Exportar backup</button></div>
      </div>

      <div class="card">
        <h2>Importar backup</h2>
        <p>Restaura licenças e manutenções a partir de um arquivo de backup. Você pode <strong>mesclar</strong> com os dados atuais ou <strong>substituir</strong> tudo.</p>
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
        <p>Sistema de Gestão de Licenças — Escola Ponte do Saber. Categorias: ${ORDEM_CATEGORIAS.map((c) => CATEGORIAS[c].icone + ' ' + CATEGORIAS[c].nome).join(', ')}.</p>
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
      toast('Backup importado. Arquivos anexados precisam ser reenviados manualmente.', 'ok');
      estado.view = 'dashboard';
      render();
    } catch (err) { toast('Erro ao importar: ' + err.message, 'err'); }
  }

  // ---------------- Manutenções ----------------

  function statusManutencao(m) {
    const dias = diasAteVencimento(m.dataProxima);
    if (dias === null) return 'semvenc';
    if (dias < 0) return 'vencida';
    if (dias <= DIAS_BREVE) return 'breve';
    if (dias <= DIAS_ATENCAO) return 'atencao';
    return 'emdia';
  }

  function textoPrazoManut(m) {
    const dias = diasAteVencimento(m.dataProxima);
    if (dias === null) return 'Sem próxima data';
    if (dias < 0) return `Atrasada há ${Math.abs(dias)} dia(s)`;
    if (dias === 0) return 'Vence hoje';
    return `Em ${dias} dia(s)`;
  }

  function cardManutencao(m) {
    const st = statusManutencao(m);
    const tipo = TIPOS_MANUTENCAO[m.tipo] || TIPOS_MANUTENCAO.outros;
    return `<div class="lic-card ${st}" data-mid="${m.id}">
      <div class="lic-icon">${tipo.icone}</div>
      <div class="lic-main">
        <div class="lic-title">${esc(m.nome)}</div>
        <div class="lic-meta">
          <span class="cat-tag" style="background:var(--cinza-bg);color:var(--cinza)">${tipo.nome}</span>
          ${m.responsavel ? `<span>👤 ${esc(m.responsavel)}</span>` : ''}
        </div>
        <div class="mini-icons" style="margin-top:6px">
          ${m.dataUltimaRealizacao ? `<span>✅ Última: ${fmtData(m.dataUltimaRealizacao)}</span>` : '<span>Sem registro anterior</span>'}
          <span>📅 Próxima: ${fmtData(m.dataProxima)}</span>
        </div>
      </div>
      <div class="lic-right">
        <span class="badge ${st}">${STATUS_LABEL[st]}</span>
        <span class="lic-prazo muted">${textoPrazoManut(m)}</span>
      </div>
    </div>`;
  }

  function ligarCardsManutencao() {
    main.querySelectorAll('[data-mid]').forEach((c) =>
      c.addEventListener('click', () => abrirDetalheManutencao(c.dataset.mid)));
  }

  function renderManutencoes() {
    const manuts = estado.manutencoes.slice().sort((a, b) =>
      (a.dataProxima || '9999-12-31').localeCompare(b.dataProxima || '9999-12-31'));
    main.innerHTML = `
      <div class="page-head">
        <div><h1>Manutenções Periódicas</h1><p>${manuts.length} controle(s) cadastrado(s).</p></div>
        <button class="btn btn-primary" id="btn-nova-manut-page">+ Nova manutenção</button>
      </div>
      ${manuts.length ? `<div class="lic-list">${manuts.map(cardManutencao).join('')}</div>` : `
        <div class="empty">
          <div class="em-icon">🔧</div>
          <h3>Nenhuma manutenção cadastrada</h3>
          <p>Cadastre o controle de extintores, caixas d'água, dedetização e outros serviços periódicos.</p>
        </div>`}
    `;
    document.getElementById('btn-nova-manut-page').addEventListener('click', () => abrirFormManutencao(null));
    ligarCardsManutencao();
  }

  function abrirFormManutencao(manutencao) {
    const editando = !!manutencao;
    const m = manutencao || { tipo: 'extintor' };
    const opTipos = ORDEM_TIPOS_MANUTENCAO.map((k) => {
      const v = TIPOS_MANUTENCAO[k];
      return `<option value="${k}" ${m.tipo === k ? 'selected' : ''}>${v.icone} ${v.nome}</option>`;
    }).join('');
    const opLics = `<option value="">Nenhuma</option>` +
      estado.licencas.map((l) => {
        const cat = CATEGORIAS[l.categoria] || CATEGORIAS.outros;
        return `<option value="${l.id}" ${m.licencaVinculada === l.id ? 'selected' : ''}>${cat.icone} ${esc(l.nome)}</option>`;
      }).join('');

    abrirModal(editando ? 'Editar manutenção' : 'Nova manutenção', `
      <form id="form-manut">
        <div class="form-grid">
          <div class="field full">
            <label>Nome / Descrição *</label>
            <input name="nome" required value="${esc(m.nome || '')}" placeholder="Ex.: Extintores – Bloco A">
          </div>
          <div class="field">
            <label>Tipo *</label>
            <select name="tipo">${opTipos}</select>
          </div>
          <div class="field">
            <label>Responsável</label>
            <input name="responsavel" value="${esc(m.responsavel || '')}" placeholder="Empresa ou pessoa responsável">
          </div>
          <div class="field">
            <label>Data da última realização</label>
            <input type="date" name="dataUltimaRealizacao" value="${esc(m.dataUltimaRealizacao || '')}">
          </div>
          <div class="field">
            <label>Próxima realização</label>
            <input type="date" name="dataProxima" value="${esc(m.dataProxima || '')}">
          </div>
          <div class="field full">
            <label>Licença vinculada (opcional)</label>
            <select name="licencaVinculada">${opLics}</select>
            <span class="hint">Associe esta manutenção a uma licença que a exige.</span>
          </div>
          <div class="field full">
            <label>Observações</label>
            <textarea name="observacoes" placeholder="Empresa, contato, número da nota, observações...">${esc(m.observacoes || '')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" id="cancel-manut">Cancelar</button>
          <button type="submit" class="btn btn-primary">${editando ? 'Salvar alterações' : 'Cadastrar manutenção'}</button>
        </div>
      </form>
    `);

    document.getElementById('cancel-manut').addEventListener('click', fecharModal);
    document.getElementById('form-manut').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      const agora = new Date().toISOString();
      if (editando) {
        Object.assign(m, fd, { atualizadoEm: agora });
        await DB.salvarManutencao(m);
        toast('Manutenção atualizada.', 'ok');
      } else {
        const nova = {
          id: uid(),
          ...fd,
          historico: [{ data: agora, acao: 'Controle cadastrado' }],
          criadoEm: agora,
          atualizadoEm: agora,
        };
        await DB.salvarManutencao(nova);
        toast('Manutenção cadastrada.', 'ok');
      }
      await carregar();
      fecharModal();
      if (editando) abrirDetalheManutencao(m.id); else renderManutencoes();
    });
  }

  async function abrirDetalheManutencao(id) {
    const m = await DB.obterManutencao(id);
    if (!m) return;
    const st = statusManutencao(m);
    const tipo = TIPOS_MANUTENCAO[m.tipo] || TIPOS_MANUTENCAO.outros;
    let licNome = '—';
    if (m.licencaVinculada) {
      const lic = estado.licencas.find((l) => l.id === m.licencaVinculada);
      if (lic) { const cat = CATEGORIAS[lic.categoria] || CATEGORIAS.outros; licNome = cat.icone + ' ' + lic.nome; }
    }

    abrirModal(`${tipo.icone} ${m.nome}`, `
      <div class="tags-line" style="margin-bottom:14px">
        <span class="cat-tag" style="background:var(--cinza-bg);color:var(--cinza)">${tipo.nome}</span>
        <span class="badge ${st}">${STATUS_LABEL[st]}</span>
        <span class="muted">${textoPrazoManut(m)}</span>
      </div>

      <div class="detail-grid">
        <div class="detail-item"><div class="k">Última realização</div><div class="v">${fmtData(m.dataUltimaRealizacao)}</div></div>
        <div class="detail-item"><div class="k">Próxima realização</div><div class="v">${fmtData(m.dataProxima)}</div></div>
        <div class="detail-item"><div class="k">Responsável</div><div class="v">${esc(m.responsavel) || '—'}</div></div>
        <div class="detail-item"><div class="k">Licença vinculada</div><div class="v">${licNome}</div></div>
      </div>
      ${m.observacoes ? `<div class="detail-item" style="margin-top:12px"><div class="k">Observações</div><div class="v" style="font-weight:400;white-space:pre-wrap">${esc(m.observacoes)}</div></div>` : ''}

      <div class="detail-section">
        <h3>Histórico de realizações</h3>
        <ul class="hist-list" id="hist-list-manut"></ul>
      </div>

      <div class="detail-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <h3 style="margin:0">Laudos e Documentos</h3>
        </div>
        <div id="file-list-manut"></div>
        <div class="dropzone" id="dropzone-manut" style="margin-top:10px">
          <span>📎 Clique ou arraste arquivos aqui para anexar laudos</span>
          <input type="file" id="file-input-manut" multiple hidden>
        </div>
      </div>

      <div class="divider"></div>
      <div class="form-actions" style="justify-content:space-between">
        <button class="btn btn-danger" id="del-manut">🗑️ Excluir</button>
        <div style="display:flex;gap:10px">
          <button class="btn" id="registrar-manut">✅ Registrar realização</button>
          <button class="btn btn-primary" id="edit-manut">✏️ Editar</button>
        </div>
      </div>
    `);

    const h = (m.historico || []).slice().reverse();
    document.getElementById('hist-list-manut').innerHTML = h.map((it) => `
      <li class="hist-item">
        <div>${esc(it.acao)}</div>
        <div class="ht">${new Date(it.data).toLocaleString('pt-BR')}</div>
      </li>`).join('') || '<li class="muted" style="font-size:14px">Sem registros.</li>';

    renderArquivosManutencao(m);
    const dz = document.getElementById('dropzone-manut');
    const fi = document.getElementById('file-input-manut');
    if (dz && fi) {
      dz.addEventListener('click', () => fi.click());
      fi.addEventListener('change', () => receberArquivosManutencao(m, fi.files));
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
      dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('drag'); receberArquivosManutencao(m, e.dataTransfer.files); });
    }

    document.getElementById('edit-manut').addEventListener('click', () => abrirFormManutencao(m));
    document.getElementById('del-manut').addEventListener('click', async () => {
      if (!confirm(`Excluir "${m.nome}"? Esta ação não pode ser desfeita.`)) return;
      await DB.removerManutencao(m.id);
      await carregar();
      fecharModal();
      renderManutencoes();
      toast('Manutenção excluída.', '');
    });
    document.getElementById('registrar-manut').addEventListener('click', () => abrirRegistroManutencao(m));
  }

  function renderArquivosManutencao(m) {
    const wrap = document.getElementById('file-list-manut');
    if (!wrap) return;
    const arqs = m.arquivos || [];
    wrap.innerHTML = arqs.map((a) => `
      <div class="file-row">
        <span class="fi">${iconeArquivo(a.tipo, a.nome)}</span>
        <span class="fn" title="${esc(a.nome)}">${esc(a.nome)}</span>
        <span class="fs">${fmtTamanho(a.tamanho || 0)}</span>
        <button class="icon-btn btn-sm" data-vis="${a.id}" title="Visualizar" style="font-size:15px">👁️</button>
        <button class="icon-btn btn-sm" data-ver="${a.id}" title="Baixar" style="font-size:15px">⬇️</button>
        <button class="icon-btn btn-sm" data-rem="${a.id}" title="Remover" style="font-size:15px">🗑️</button>
      </div>`).join('') || '<p class="muted" style="font-size:14px">Nenhum arquivo anexado.</p>';

    wrap.querySelectorAll('[data-vis]').forEach((b) =>
      b.addEventListener('click', async () => {
        const meta = (m.arquivos || []).find((x) => x.id === b.dataset.vis);
        if (!meta?.storagePath) return toast('Arquivo não encontrado no servidor.', 'err');
        try { window.open(await DB.obterArquivoUrl(meta.storagePath), '_blank', 'noopener'); }
        catch (err) { toast('Erro ao abrir arquivo: ' + err.message, 'err'); }
      }));
    wrap.querySelectorAll('[data-ver]').forEach((b) =>
      b.addEventListener('click', async () => {
        const meta = (m.arquivos || []).find((x) => x.id === b.dataset.ver);
        if (!meta?.storagePath) return toast('Arquivo não encontrado no servidor.', 'err');
        try {
          const url = await DB.obterArquivoUrl(meta.storagePath);
          const a = document.createElement('a');
          a.href = url; a.download = meta.nome; a.target = '_blank';
          document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { toast('Erro ao baixar arquivo: ' + err.message, 'err'); }
      }));
    wrap.querySelectorAll('[data-rem]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Remover este arquivo?')) return;
        const meta = (m.arquivos || []).find((x) => x.id === b.dataset.rem);
        if (meta?.storagePath) await DB.removerArquivo(meta.storagePath);
        m.arquivos = (m.arquivos || []).filter((x) => x.id !== b.dataset.rem);
        m.atualizadoEm = new Date().toISOString();
        await DB.salvarManutencao(m);
        await carregar();
        renderArquivosManutencao(m);
      }));
  }

  async function receberArquivosManutencao(m, fileList) {
    const arquivos = Array.from(fileList);
    if (!arquivos.length) return;
    m.arquivos = m.arquivos || [];
    let ok = 0;
    for (const file of arquivos) {
      if (file.size > 50 * 1048576) { toast(`"${file.name}" é maior que 50 MB e foi ignorado.`, 'err'); continue; }
      try {
        const aid = uid();
        const storagePath = await DB.salvarArquivo(aid, `manutencoes/${m.id}`, file);
        m.arquivos.push({ id: aid, nome: file.name, tipo: file.type, tamanho: file.size, storagePath, adicionadoEm: new Date().toISOString() });
        ok++;
      } catch (err) { toast(`Erro ao enviar "${file.name}": ${err.message}`, 'err'); }
    }
    m.atualizadoEm = new Date().toISOString();
    await DB.salvarManutencao(m);
    await carregar();
    renderArquivosManutencao(m);
    if (ok) toast(`${ok} arquivo(s) enviado(s).`, 'ok');
  }

  function abrirRegistroManutencao(m) {
    const tipo = TIPOS_MANUTENCAO[m.tipo] || TIPOS_MANUTENCAO.outros;
    let suggestNext = '';
    if (tipo.periodicidade) {
      const next = new Date();
      next.setMonth(next.getMonth() + tipo.periodicidade);
      suggestNext = next.toISOString().slice(0, 10);
    }

    abrirModal('✅ Registrar realização', `
      <p class="muted" style="margin-bottom:14px">Registre a realização de <strong>${esc(m.nome)}</strong>. A data será gravada no histórico.</p>
      <form id="form-reg-manut">
        <div class="form-grid">
          <div class="field">
            <label>Data de realização *</label>
            <input type="date" name="dataRealizada" required value="${new Date().toISOString().slice(0, 10)}">
          </div>
          <div class="field">
            <label>Próxima realização</label>
            <input type="date" name="dataProxima" value="${suggestNext}">
            ${tipo.periodicidade ? `<span class="hint">Periodicidade sugerida: a cada ${tipo.periodicidade} meses.</span>` : ''}
          </div>
          <div class="field full">
            <label>Observações (opcional)</label>
            <textarea name="obs" placeholder="Empresa responsável, número da nota, observações..."></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" id="cancel-reg-manut">Cancelar</button>
          <button type="submit" class="btn btn-primary">Confirmar realização</button>
        </div>
      </form>
    `);

    document.getElementById('cancel-reg-manut').addEventListener('click', () => abrirDetalheManutencao(m.id));
    document.getElementById('form-reg-manut').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      const agora = new Date().toISOString();
      m.historico = m.historico || [];
      m.historico.push({
        data: agora,
        acao: `Realizado em ${fmtData(fd.dataRealizada)}${fd.dataProxima ? ` · próxima: ${fmtData(fd.dataProxima)}` : ''}${fd.obs ? ` · ${fd.obs}` : ''}`,
      });
      m.dataUltimaRealizacao = fd.dataRealizada;
      if (fd.dataProxima) m.dataProxima = fd.dataProxima;
      m.atualizadoEm = agora;
      await DB.salvarManutencao(m);
      await carregar();
      toast('Realização registrada.', 'ok');
      abrirDetalheManutencao(m.id);
    });
  }

  // ---------------- Fornecedores ----------------

  function statusDocFornecedor(doc) {
    const dias = diasAteVencimento(doc.dataVencimento);
    if (dias === null) return 'semvenc';
    if (dias < 0) return 'vencida';
    if (dias <= DIAS_BREVE) return 'breve';
    if (dias <= DIAS_ATENCAO) return 'atencao';
    return 'emdia';
  }

  function statusFornecedor(f) {
    const itens = [...(f.documentos || []), ...(f.laudos || [])];
    if (!itens.length) return 'semvenc';
    const ordem = ['vencida', 'breve', 'atencao', 'emdia', 'semvenc'];
    const statuses = itens.map((d) => statusDocFornecedor(d));
    for (const s of ordem) { if (statuses.includes(s)) return s; }
    return 'semvenc';
  }

  function textoPrazoFornecedor(f) {
    const itens = [...(f.documentos || []), ...(f.laudos || [])].filter((d) => d.dataVencimento);
    if (!itens.length) return 'Sem itens com vencimento';
    const prox = itens.slice().sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))[0];
    const dias = diasAteVencimento(prox.dataVencimento);
    if (dias < 0) return `Item vencido há ${Math.abs(dias)} dia(s)`;
    if (dias === 0) return 'Item vence hoje';
    return `Próx. venc.: ${fmtData(prox.dataVencimento)}`;
  }

  function cardFornecedor(f) {
    const st = statusFornecedor(f);
    const tipo = TIPOS_FORNECEDOR[f.tipoServico] || TIPOS_FORNECEDOR.outros;
    const nDocs = (f.documentos || []).length;
    const nLaudos = (f.laudos || []).length;
    return `<div class="lic-card ${st}" data-fid="${f.id}">
      <div class="lic-icon">${tipo.icone}</div>
      <div class="lic-main">
        <div class="lic-title">${esc(f.nome)}</div>
        <div class="lic-meta">
          <span class="cat-tag" style="background:var(--cinza-bg);color:var(--cinza)">${tipo.nome}</span>
          ${f.cnpj ? `<span>CNPJ: ${esc(f.cnpj)}</span>` : ''}
          ${f.responsavel ? `<span>👤 ${esc(f.responsavel)}</span>` : ''}
        </div>
        <div class="mini-icons" style="margin-top:6px">
          ${nDocs ? `<span>📋 ${nDocs} licença(s)</span>` : ''}
          ${nLaudos ? `<span>🔬 ${nLaudos} laudo(s)</span>` : ''}
          ${f.telefone ? `<span>📞 ${esc(f.telefone)}</span>` : ''}
        </div>
      </div>
      <div class="lic-right">
        <span class="badge ${st}">${STATUS_LABEL[st]}</span>
        <span class="lic-prazo muted">${textoPrazoFornecedor(f)}</span>
      </div>
    </div>`;
  }

  function ligarCardsFornecedor() {
    main.querySelectorAll('[data-fid]').forEach((c) =>
      c.addEventListener('click', () => abrirDetalheFornecedor(c.dataset.fid)));
  }

  function renderFornecedores() {
    const forns = estado.fornecedores.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    main.innerHTML = `
      <div class="page-head">
        <div><h1>Fornecedores / Prestadores</h1><p>${forns.length} fornecedor(es) cadastrado(s).</p></div>
        <button class="btn btn-primary" id="btn-novo-forn-page">+ Novo fornecedor</button>
      </div>
      ${forns.length ? `<div class="lic-list">${forns.map(cardFornecedor).join('')}</div>` : `
        <div class="empty">
          <div class="em-icon">🤝</div>
          <h3>Nenhum fornecedor cadastrado</h3>
          <p>Cadastre empresas e prestadores de serviços da escola.</p>
        </div>`}
    `;
    document.getElementById('btn-novo-forn-page').addEventListener('click', () => abrirFormFornecedor(null));
    ligarCardsFornecedor();
  }

  function abrirFormFornecedor(fornecedor) {
    const editando = !!fornecedor;
    const f = fornecedor || { tipoServico: 'outros', documentos: [] };
    const opTipos = ORDEM_TIPOS_FORNECEDOR.map((k) => {
      const v = TIPOS_FORNECEDOR[k];
      return `<option value="${k}" ${f.tipoServico === k ? 'selected' : ''}>${v.icone} ${v.nome}</option>`;
    }).join('');

    abrirModal(editando ? 'Editar fornecedor' : 'Novo fornecedor', `
      <form id="form-forn">
        <div class="form-grid">
          <div class="field full">
            <label>Nome da empresa / prestador *</label>
            <input name="nome" required value="${esc(f.nome || '')}" placeholder="Ex.: Dedetizadora São Paulo Ltda">
          </div>
          <div class="field">
            <label>Tipo de serviço *</label>
            <select name="tipoServico">${opTipos}</select>
          </div>
          <div class="field">
            <label>CNPJ / CPF</label>
            <input name="cnpj" value="${esc(f.cnpj || '')}" placeholder="00.000.000/0001-00">
          </div>
          <div class="field">
            <label>Responsável / Contato</label>
            <input name="responsavel" value="${esc(f.responsavel || '')}" placeholder="Nome do responsável">
          </div>
          <div class="field">
            <label>Telefone</label>
            <input name="telefone" value="${esc(f.telefone || '')}" placeholder="(41) 99999-9999">
          </div>
          <div class="field">
            <label>E-mail</label>
            <input name="email" type="email" value="${esc(f.email || '')}" placeholder="contato@empresa.com">
          </div>
          <div class="field full">
            <label>Observações</label>
            <textarea name="observacoes" placeholder="Anotações, condições de contrato, histórico...">${esc(f.observacoes || '')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" id="cancel-forn">Cancelar</button>
          <button type="submit" class="btn btn-primary">${editando ? 'Salvar alterações' : 'Cadastrar fornecedor'}</button>
        </div>
      </form>
    `);

    document.getElementById('cancel-forn').addEventListener('click', fecharModal);
    document.getElementById('form-forn').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      const agora = new Date().toISOString();
      if (editando) {
        Object.assign(f, fd, { atualizadoEm: agora });
        await DB.salvarFornecedor(f);
        toast('Fornecedor atualizado.', 'ok');
      } else {
        const novo = { id: uid(), ...fd, documentos: [], criadoEm: agora, atualizadoEm: agora };
        await DB.salvarFornecedor(novo);
        toast('Fornecedor cadastrado.', 'ok');
      }
      await carregar();
      fecharModal();
      if (editando) abrirDetalheFornecedor(f.id); else renderFornecedores();
    });
  }

  async function abrirDetalheFornecedor(id) {
    const f = await DB.obterFornecedor(id);
    if (!f) return;
    const st = statusFornecedor(f);
    const tipo = TIPOS_FORNECEDOR[f.tipoServico] || TIPOS_FORNECEDOR.outros;

    abrirModal(`${tipo.icone} ${f.nome}`, `
      <div class="tags-line" style="margin-bottom:14px">
        <span class="cat-tag" style="background:var(--cinza-bg);color:var(--cinza)">${tipo.nome}</span>
        <span class="badge ${st}">${STATUS_LABEL[st]}</span>
      </div>

      <div class="detail-grid">
        ${f.cnpj ? `<div class="detail-item"><div class="k">CNPJ / CPF</div><div class="v">${esc(f.cnpj)}</div></div>` : ''}
        ${f.responsavel ? `<div class="detail-item"><div class="k">Responsável</div><div class="v">${esc(f.responsavel)}</div></div>` : ''}
        ${f.telefone ? `<div class="detail-item"><div class="k">Telefone</div><div class="v">${esc(f.telefone)}</div></div>` : ''}
        ${f.email ? `<div class="detail-item"><div class="k">E-mail</div><div class="v">${esc(f.email)}</div></div>` : ''}
      </div>
      ${f.observacoes ? `<div class="detail-item" style="margin-top:12px"><div class="k">Observações</div><div class="v" style="font-weight:400;white-space:pre-wrap">${esc(f.observacoes)}</div></div>` : ''}

      <div class="detail-section">
        <h3>📋 Licenças do fornecedor</h3>
        <div id="docs-forn-list"></div>
        <button class="btn btn-sm" id="btn-add-doc-forn" style="margin-top:10px">+ Adicionar licença</button>
      </div>

      <div class="detail-section">
        <h3>🔬 Laudos e Relatórios Técnicos</h3>
        <div id="laudos-forn-list"></div>
        <button class="btn btn-sm" id="btn-add-laudo-forn" style="margin-top:10px">+ Adicionar laudo</button>
      </div>

      <div class="divider"></div>
      <div class="form-actions" style="justify-content:space-between">
        <button class="btn btn-danger" id="del-forn">🗑️ Excluir</button>
        <button class="btn btn-primary" id="edit-forn">✏️ Editar</button>
      </div>
    `);

    renderDocsFornecedor(f);
    renderLaudosFornecedor(f);

    document.getElementById('btn-add-doc-forn').addEventListener('click', () => abrirFormDocFornecedor(f, -1));
    document.getElementById('btn-add-laudo-forn').addEventListener('click', () => abrirFormLaudoFornecedor(f, -1));
    document.getElementById('edit-forn').addEventListener('click', () => abrirFormFornecedor(f));
    document.getElementById('del-forn').addEventListener('click', async () => {
      if (!confirm(`Excluir "${f.nome}"? Esta ação não pode ser desfeita.`)) return;
      for (const doc of [...(f.documentos || []), ...(f.laudos || [])]) {
        for (const arq of (doc.arquivos || [])) {
          if (arq.storagePath) await DB.removerArquivo(arq.storagePath);
        }
      }
      await DB.removerFornecedor(f.id);
      await carregar();
      fecharModal();
      renderFornecedores();
      toast('Fornecedor excluído.', '');
    });
  }

  function renderDocsFornecedor(f) {
    const wrap = document.getElementById('docs-forn-list');
    if (!wrap) return;
    const docs = f.documentos || [];
    if (!docs.length) {
      wrap.innerHTML = '<p class="muted" style="font-size:14px">Nenhuma licença cadastrada.</p>';
      return;
    }
    wrap.innerHTML = docs.map((doc, idx) => {
      const st = statusDocFornecedor(doc);
      const cat = doc.tipoLicenca ? (CATEGORIAS[doc.tipoLicenca] || CATEGORIAS.outros) : null;
      return `<div class="lic-card ${st}" style="cursor:pointer" data-doc-idx="${idx}">
        <div class="lic-icon">${cat ? cat.icone : '📋'}</div>
        <div class="lic-main">
          <div class="lic-title">${esc(doc.nome)}</div>
          <div class="lic-meta">
            ${cat ? `<span class="cat-tag" style="background:${cat.corBg};color:${cat.cor}">${cat.nome}</span>` : ''}
            ${doc.orgaoEmissor ? `<span>🏢 ${esc(doc.orgaoEmissor)}</span>` : ''}
            ${doc.numero ? `<span># ${esc(doc.numero)}</span>` : ''}
            ${(doc.arquivos || []).length ? `<span>📎 ${doc.arquivos.length} arquivo(s)</span>` : ''}
          </div>
          <div class="mini-icons" style="margin-top:6px">
            ${doc.dataEmissao ? `<span>📅 Emissão: ${fmtData(doc.dataEmissao)}</span>` : ''}
            <span>🗓️ Vence: ${fmtData(doc.dataVencimento)}</span>
          </div>
        </div>
        <div class="lic-right">
          <span class="badge ${st}">${STATUS_LABEL[st]}</span>
          <span class="lic-prazo muted">${doc.dataVencimento ? textoPrazo({ dataVencimento: doc.dataVencimento }) : 'Sem vencimento'}</span>
        </div>
      </div>`;
    }).join('');
    wrap.querySelectorAll('[data-doc-idx]').forEach((c) =>
      c.addEventListener('click', () => abrirFormDocFornecedor(f, parseInt(c.dataset.docIdx, 10))));
  }

  function abrirFormDocFornecedor(f, docIdx) {
    const editando = docIdx >= 0;
    const docBase = editando ? (f.documentos[docIdx] || {}) : {};
    const doc = { ...docBase, arquivos: [...(docBase.arquivos || [])] };
    if (!editando) doc.id = uid();

    const opTipoLic = `<option value="">Nenhuma categoria</option>` +
      ORDEM_CATEGORIAS.map((c) => {
        const cat = CATEGORIAS[c];
        return `<option value="${c}" ${doc.tipoLicenca === c ? 'selected' : ''}>${cat.icone} ${cat.nome}</option>`;
      }).join('');

    abrirModal(editando ? 'Editar licença' : 'Nova licença', `
      <form id="form-doc-forn">
        <div class="form-grid">
          <div class="field full">
            <label>Nome / Descrição da licença *</label>
            <input name="nome" required value="${esc(doc.nome || '')}" placeholder="Ex.: Licença Sanitária 2026">
          </div>
          <div class="field">
            <label>Tipo de licença</label>
            <select name="tipoLicenca">${opTipoLic}</select>
          </div>
          <div class="field">
            <label>Número / Protocolo</label>
            <input name="numero" value="${esc(doc.numero || '')}" placeholder="Nº do documento">
          </div>
          <div class="field">
            <label>Órgão emissor</label>
            <input name="orgaoEmissor" value="${esc(doc.orgaoEmissor || '')}" placeholder="Ex.: Vigilância Sanitária">
          </div>
          <div class="field">
            <label>Data de emissão</label>
            <input type="date" name="dataEmissao" value="${esc(doc.dataEmissao || '')}">
          </div>
          <div class="field">
            <label>Data de vencimento</label>
            <input type="date" name="dataVencimento" value="${esc(doc.dataVencimento || '')}">
          </div>
          <div class="field full">
            <label>Observações</label>
            <textarea name="observacoes" placeholder="Anotações sobre esta licença...">${esc(doc.observacoes || '')}</textarea>
          </div>
        </div>

        ${editando ? `
        <div class="detail-section">
          <h3>Arquivo da licença</h3>
          <div class="file-list" id="file-list-doc"></div>
          <div class="dropzone" id="dropzone-doc" style="margin-top:10px">
            📤 Clique aqui ou arraste o arquivo da licença (PDF, imagem, etc.)
            <input type="file" id="file-input-doc" multiple hidden>
          </div>
        </div>` : ''}

        <div class="form-actions">
          <button type="button" class="btn" id="cancel-doc-forn">${editando ? 'Voltar' : 'Cancelar'}</button>
          ${editando ? `<button type="button" class="btn btn-danger" id="del-doc-forn">🗑️ Excluir</button>` : ''}
          <button type="submit" class="btn btn-primary">${editando ? 'Salvar alterações' : 'Adicionar licença'}</button>
        </div>
      </form>
    `);

    if (editando) {
      renderArquivosDoc(f, doc, docIdx);
      const dz = document.getElementById('dropzone-doc');
      const fi = document.getElementById('file-input-doc');
      if (dz && fi) {
        dz.addEventListener('click', () => fi.click());
        fi.addEventListener('change', () => receberArquivosDoc(f, doc, docIdx, fi.files));
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
        dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('drag'); receberArquivosDoc(f, doc, docIdx, e.dataTransfer.files); });
      }
      document.getElementById('del-doc-forn').addEventListener('click', async () => {
        if (!confirm('Excluir esta licença e seus arquivos?')) return;
        for (const arq of (doc.arquivos || [])) {
          if (arq.storagePath) await DB.removerArquivo(arq.storagePath);
        }
        f.documentos.splice(docIdx, 1);
        f.atualizadoEm = new Date().toISOString();
        await DB.salvarFornecedor(f);
        await carregar();
        toast('Licença excluída.', '');
        abrirDetalheFornecedor(f.id);
      });
    }

    document.getElementById('cancel-doc-forn').addEventListener('click', () => abrirDetalheFornecedor(f.id));
    document.getElementById('form-doc-forn').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      f.documentos = f.documentos || [];
      if (editando) {
        Object.assign(doc, fd);
        f.documentos[docIdx] = doc;
      } else {
        f.documentos.push({ ...doc, ...fd, criadoEm: new Date().toISOString() });
      }
      f.atualizadoEm = new Date().toISOString();
      await DB.salvarFornecedor(f);
      await carregar();
      toast(editando ? 'Licença atualizada.' : 'Licença adicionada.', 'ok');
      abrirDetalheFornecedor(f.id);
    });
  }

  function renderArquivosDoc(f, doc, docIdx) {
    const wrap = document.getElementById('file-list-doc');
    if (!wrap) return;
    const arqs = doc.arquivos || [];
    wrap.innerHTML = arqs.map((a) => `
      <div class="file-row">
        <span class="fi">${iconeArquivo(a.tipo, a.nome)}</span>
        <span class="fn" title="${esc(a.nome)}">${esc(a.nome)}</span>
        <span class="fs">${fmtTamanho(a.tamanho || 0)}</span>
        <button class="icon-btn btn-sm" data-vis="${a.id}" title="Visualizar" style="font-size:15px">👁️</button>
        <button class="icon-btn btn-sm" data-ver="${a.id}" title="Baixar" style="font-size:15px">⬇️</button>
        <button class="icon-btn btn-sm" data-rem="${a.id}" title="Remover" style="font-size:15px">🗑️</button>
      </div>`).join('') || '<p class="muted" style="font-size:14px">Nenhum arquivo anexado.</p>';

    wrap.querySelectorAll('[data-vis]').forEach((b) =>
      b.addEventListener('click', async () => {
        const meta = (doc.arquivos || []).find((x) => x.id === b.dataset.vis);
        if (!meta?.storagePath) return toast('Arquivo não encontrado no servidor.', 'err');
        try {
          const url = await DB.obterArquivoUrl(meta.storagePath);
          window.open(url, '_blank', 'noopener');
        } catch (err) { toast('Erro ao abrir arquivo: ' + err.message, 'err'); }
      }));
    wrap.querySelectorAll('[data-ver]').forEach((b) =>
      b.addEventListener('click', async () => {
        const meta = (doc.arquivos || []).find((x) => x.id === b.dataset.ver);
        if (!meta?.storagePath) return toast('Arquivo não encontrado no servidor.', 'err');
        try {
          const url = await DB.obterArquivoUrl(meta.storagePath);
          const a = document.createElement('a');
          a.href = url; a.download = meta.nome; a.target = '_blank';
          document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { toast('Erro ao abrir arquivo: ' + err.message, 'err'); }
      }));
    wrap.querySelectorAll('[data-rem]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Remover este arquivo?')) return;
        const meta = (doc.arquivos || []).find((x) => x.id === b.dataset.rem);
        if (meta?.storagePath) await DB.removerArquivo(meta.storagePath);
        doc.arquivos = (doc.arquivos || []).filter((x) => x.id !== b.dataset.rem);
        if (docIdx >= 0) f.documentos[docIdx] = doc;
        f.atualizadoEm = new Date().toISOString();
        await DB.salvarFornecedor(f);
        await carregar();
        renderArquivosDoc(f, doc, docIdx);
      }));
  }

  async function receberArquivosDoc(f, doc, docIdx, fileList) {
    const arquivos = Array.from(fileList);
    if (!arquivos.length) return;
    doc.arquivos = doc.arquivos || [];
    let ok = 0;
    for (const file of arquivos) {
      if (file.size > 50 * 1048576) { toast(`"${file.name}" é maior que 50 MB e foi ignorado.`, 'err'); continue; }
      try {
        const aid = uid();
        const storagePath = await DB.salvarArquivo(aid, `fornecedores/${f.id}`, file);
        doc.arquivos.push({ id: aid, nome: file.name, tipo: file.type, tamanho: file.size, storagePath, adicionadoEm: new Date().toISOString() });
        ok++;
      } catch (err) { toast(`Erro ao enviar "${file.name}": ${err.message}`, 'err'); }
    }
    if (docIdx >= 0) f.documentos[docIdx] = doc;
    f.atualizadoEm = new Date().toISOString();
    await DB.salvarFornecedor(f);
    await carregar();
    renderArquivosDoc(f, doc, docIdx);
    if (ok) toast(`${ok} arquivo(s) enviado(s).`, 'ok');
  }

  // ---------------- Laudos do Fornecedor ----------------

  function renderLaudosFornecedor(f) {
    const wrap = document.getElementById('laudos-forn-list');
    if (!wrap) return;
    const laudos = f.laudos || [];
    if (!laudos.length) {
      wrap.innerHTML = '<p class="muted" style="font-size:14px">Nenhum laudo cadastrado.</p>';
      return;
    }
    wrap.innerHTML = laudos.map((laudo, idx) => {
      const st = statusDocFornecedor(laudo);
      const tipoL = TIPOS_LAUDO[laudo.tipoLaudo] || TIPOS_LAUDO.outros;
      return `<div class="lic-card ${st}" style="cursor:pointer" data-laudo-idx="${idx}">
        <div class="lic-icon">${tipoL.icone}</div>
        <div class="lic-main">
          <div class="lic-title">${esc(laudo.nome)}</div>
          <div class="lic-meta">
            <span class="cat-tag" style="background:var(--cinza-bg);color:var(--cinza)">${tipoL.nome}</span>
            ${laudo.laboratorio ? `<span>🏢 ${esc(laudo.laboratorio)}</span>` : ''}
            ${laudo.numero ? `<span># ${esc(laudo.numero)}</span>` : ''}
            ${(laudo.arquivos || []).length ? `<span>📎 ${laudo.arquivos.length} arquivo(s)</span>` : ''}
          </div>
          <div class="mini-icons" style="margin-top:6px">
            ${laudo.dataEmissao ? `<span>📅 Emissão: ${fmtData(laudo.dataEmissao)}</span>` : ''}
            <span>🗓️ Validade: ${fmtData(laudo.dataVencimento)}</span>
          </div>
        </div>
        <div class="lic-right">
          <span class="badge ${st}">${STATUS_LABEL[st]}</span>
          <span class="lic-prazo muted">${laudo.dataVencimento ? textoPrazo({ dataVencimento: laudo.dataVencimento }) : 'Sem validade'}</span>
        </div>
      </div>`;
    }).join('');
    wrap.querySelectorAll('[data-laudo-idx]').forEach((c) =>
      c.addEventListener('click', () => abrirFormLaudoFornecedor(f, parseInt(c.dataset.laudoIdx, 10))));
  }

  function abrirFormLaudoFornecedor(f, laudoIdx) {
    const editando = laudoIdx >= 0;
    const base = editando ? (f.laudos[laudoIdx] || {}) : {};
    const laudo = { ...base, arquivos: [...(base.arquivos || [])] };
    if (!editando) laudo.id = uid();

    const opTipos = ORDEM_TIPOS_LAUDO.map((k) => {
      const v = TIPOS_LAUDO[k];
      return `<option value="${k}" ${laudo.tipoLaudo === k ? 'selected' : ''}>${v.icone} ${v.nome}</option>`;
    }).join('');

    abrirModal(editando ? 'Editar laudo' : 'Novo laudo', `
      <form id="form-laudo-forn">
        <div class="form-grid">
          <div class="field full">
            <label>Nome / Descrição do laudo *</label>
            <input name="nome" required value="${esc(laudo.nome || '')}" placeholder="Ex.: Análise de Água — 1º Semestre 2026">
          </div>
          <div class="field">
            <label>Tipo de laudo</label>
            <select name="tipoLaudo"><option value="">Sem categoria</option>${opTipos}</select>
          </div>
          <div class="field">
            <label>Número / Protocolo</label>
            <input name="numero" value="${esc(laudo.numero || '')}" placeholder="Nº do laudo">
          </div>
          <div class="field">
            <label>Laboratório / Empresa emissora</label>
            <input name="laboratorio" value="${esc(laudo.laboratorio || '')}" placeholder="Ex.: Laboratório XYZ">
          </div>
          <div class="field">
            <label>Data de emissão</label>
            <input type="date" name="dataEmissao" value="${esc(laudo.dataEmissao || '')}">
          </div>
          <div class="field">
            <label>Data de validade</label>
            <input type="date" name="dataVencimento" value="${esc(laudo.dataVencimento || '')}">
            <span class="hint">Deixe em branco se o laudo não tem validade definida.</span>
          </div>
          <div class="field full">
            <label>Observações</label>
            <textarea name="observacoes" placeholder="Resultados, conclusões, pendências...">${esc(laudo.observacoes || '')}</textarea>
          </div>
        </div>

        ${editando ? `
        <div class="detail-section">
          <h3>Arquivo do laudo</h3>
          <div class="file-list" id="file-list-laudo"></div>
          <div class="dropzone" id="dropzone-laudo" style="margin-top:10px">
            📤 Clique aqui ou arraste o laudo em PDF ou imagem
            <input type="file" id="file-input-laudo" multiple hidden>
          </div>
        </div>` : ''}

        <div class="form-actions">
          <button type="button" class="btn" id="cancel-laudo-forn">${editando ? 'Voltar' : 'Cancelar'}</button>
          ${editando ? `<button type="button" class="btn btn-danger" id="del-laudo-forn">🗑️ Excluir</button>` : ''}
          <button type="submit" class="btn btn-primary">${editando ? 'Salvar alterações' : 'Adicionar laudo'}</button>
        </div>
      </form>
    `);

    if (editando) {
      renderArquivosLaudo(f, laudo, laudoIdx);
      const dz = document.getElementById('dropzone-laudo');
      const fi = document.getElementById('file-input-laudo');
      if (dz && fi) {
        dz.addEventListener('click', () => fi.click());
        fi.addEventListener('change', () => receberArquivosLaudo(f, laudo, laudoIdx, fi.files));
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
        dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('drag'); receberArquivosLaudo(f, laudo, laudoIdx, e.dataTransfer.files); });
      }
      document.getElementById('del-laudo-forn').addEventListener('click', async () => {
        if (!confirm('Excluir este laudo e seus arquivos?')) return;
        for (const arq of (laudo.arquivos || [])) {
          if (arq.storagePath) await DB.removerArquivo(arq.storagePath);
        }
        f.laudos.splice(laudoIdx, 1);
        f.atualizadoEm = new Date().toISOString();
        await DB.salvarFornecedor(f);
        await carregar();
        toast('Laudo excluído.', '');
        abrirDetalheFornecedor(f.id);
      });
    }

    document.getElementById('cancel-laudo-forn').addEventListener('click', () => abrirDetalheFornecedor(f.id));
    document.getElementById('form-laudo-forn').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      f.laudos = f.laudos || [];
      if (editando) {
        Object.assign(laudo, fd);
        f.laudos[laudoIdx] = laudo;
      } else {
        f.laudos.push({ ...laudo, ...fd, criadoEm: new Date().toISOString() });
      }
      f.atualizadoEm = new Date().toISOString();
      await DB.salvarFornecedor(f);
      await carregar();
      toast(editando ? 'Laudo atualizado.' : 'Laudo adicionado.', 'ok');
      abrirDetalheFornecedor(f.id);
    });
  }

  function renderArquivosLaudo(f, laudo, laudoIdx) {
    const wrap = document.getElementById('file-list-laudo');
    if (!wrap) return;
    const arqs = laudo.arquivos || [];
    wrap.innerHTML = arqs.map((a) => `
      <div class="file-row">
        <span class="fi">${iconeArquivo(a.tipo, a.nome)}</span>
        <span class="fn" title="${esc(a.nome)}">${esc(a.nome)}</span>
        <span class="fs">${fmtTamanho(a.tamanho || 0)}</span>
        <button class="icon-btn btn-sm" data-vis="${a.id}" title="Visualizar" style="font-size:15px">👁️</button>
        <button class="icon-btn btn-sm" data-ver="${a.id}" title="Baixar" style="font-size:15px">⬇️</button>
        <button class="icon-btn btn-sm" data-rem="${a.id}" title="Remover" style="font-size:15px">🗑️</button>
      </div>`).join('') || '<p class="muted" style="font-size:14px">Nenhum arquivo anexado.</p>';

    wrap.querySelectorAll('[data-vis]').forEach((b) =>
      b.addEventListener('click', async () => {
        const meta = (laudo.arquivos || []).find((x) => x.id === b.dataset.vis);
        if (!meta?.storagePath) return toast('Arquivo não encontrado no servidor.', 'err');
        try { window.open(await DB.obterArquivoUrl(meta.storagePath), '_blank', 'noopener'); }
        catch (err) { toast('Erro ao abrir arquivo: ' + err.message, 'err'); }
      }));
    wrap.querySelectorAll('[data-ver]').forEach((b) =>
      b.addEventListener('click', async () => {
        const meta = (laudo.arquivos || []).find((x) => x.id === b.dataset.ver);
        if (!meta?.storagePath) return toast('Arquivo não encontrado no servidor.', 'err');
        try {
          const url = await DB.obterArquivoUrl(meta.storagePath);
          const a = document.createElement('a');
          a.href = url; a.download = meta.nome; a.target = '_blank';
          document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { toast('Erro ao baixar arquivo: ' + err.message, 'err'); }
      }));
    wrap.querySelectorAll('[data-rem]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Remover este arquivo?')) return;
        const meta = (laudo.arquivos || []).find((x) => x.id === b.dataset.rem);
        if (meta?.storagePath) await DB.removerArquivo(meta.storagePath);
        laudo.arquivos = (laudo.arquivos || []).filter((x) => x.id !== b.dataset.rem);
        if (laudoIdx >= 0) f.laudos[laudoIdx] = laudo;
        f.atualizadoEm = new Date().toISOString();
        await DB.salvarFornecedor(f);
        await carregar();
        renderArquivosLaudo(f, laudo, laudoIdx);
      }));
  }

  async function receberArquivosLaudo(f, laudo, laudoIdx, fileList) {
    const arquivos = Array.from(fileList);
    if (!arquivos.length) return;
    laudo.arquivos = laudo.arquivos || [];
    let ok = 0;
    for (const file of arquivos) {
      if (file.size > 50 * 1048576) { toast(`"${file.name}" é maior que 50 MB e foi ignorado.`, 'err'); continue; }
      try {
        const aid = uid();
        const storagePath = await DB.salvarArquivo(aid, `fornecedores/${f.id}`, file);
        laudo.arquivos.push({ id: aid, nome: file.name, tipo: file.type, tamanho: file.size, storagePath, adicionadoEm: new Date().toISOString() });
        ok++;
      } catch (err) { toast(`Erro ao enviar "${file.name}": ${err.message}`, 'err'); }
    }
    if (laudoIdx >= 0) f.laudos[laudoIdx] = laudo;
    f.atualizadoEm = new Date().toISOString();
    await DB.salvarFornecedor(f);
    await carregar();
    renderArquivosLaudo(f, laudo, laudoIdx);
    if (ok) toast(`${ok} arquivo(s) enviado(s).`, 'ok');
  }

  // ---------------- Navegação ----------------
  document.querySelectorAll('.nav-link').forEach((b) =>
    b.addEventListener('click', () => {
      estado.view = b.dataset.view;
      if (estado.view === 'licencas') { estado.statusFiltro = 'todos'; estado.categoria = 'todas'; estado.busca = ''; }
      render();
    }));
  document.getElementById('btn-nova-licenca').addEventListener('click', () => abrirFormulario(null));

  // ---------------- Auth ----------------
  const loginOverlay = document.getElementById('login-overlay');
  const loginErro    = document.getElementById('login-erro');

  function mostrarApp(user) {
    loginOverlay.hidden = true;
    const el = document.getElementById('user-email');
    if (el) el.textContent = user?.email || '';
  }
  function mostrarLogin() {
    loginOverlay.hidden = false;
    main.innerHTML = '';
    estado.licencas = [];
    estado.manutencoes = [];
    estado.fornecedores = [];
  }

  // Toggle senha no login
  const tglLoginSenha = document.getElementById('toggle-login-senha');
  if (tglLoginSenha) tglLoginSenha.addEventListener('click', () => {
    const i = document.getElementById('login-senha');
    const v = i.type === 'text';
    i.type = v ? 'password' : 'text';
    tglLoginSenha.textContent = v ? 'mostrar' : 'ocultar';
  });

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const btn = document.getElementById('btn-entrar');
    btn.disabled = true; btn.textContent = 'Entrando…';
    loginErro.textContent = '';
    try {
      await DB.signIn(fd.get('email'), fd.get('senha'));
      const user = await DB.getUser();
      mostrarApp(user);
      await carregar();
      render();
    } catch {
      loginErro.textContent = 'E-mail ou senha incorretos. Verifique e tente novamente.';
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    if (!confirm('Sair do sistema?')) return;
    await DB.signOut();
    mostrarLogin();
  });

  // Detecta expiração de sessão automaticamente
  DB.onAuthChange((user) => { if (!user) mostrarLogin(); });

  // ---------------- Início ----------------
  (async function init() {
    try {
      const user = await DB.getUser();
      if (user) {
        mostrarApp(user);
        await carregar();
        render();
      } else {
        mostrarLogin();
      }
    } catch (err) {
      main.innerHTML = `<div class="card"><h2>Erro ao iniciar</h2><p>${esc(err.message)}</p></div>`;
    }
  })();
})();
