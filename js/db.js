/**
 * Camada de persistência usando IndexedDB.
 * Dois "armazéns": "licencas" (registros) e "arquivos" (blobs dos documentos).
 * Tudo fica salvo apenas neste navegador/computador.
 */
const DB = (() => {
  const NOME = 'ponte_licencas';
  const VERSAO = 1;
  let _db = null;

  function abrir() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(NOME, VERSAO);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('licencas')) {
          db.createObjectStore('licencas', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('arquivos')) {
          db.createObjectStore('arquivos', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function tx(store, modo) {
    return _db.transaction(store, modo).objectStore(store);
  }

  function pedir(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ---------- Licenças ----------
  async function listarLicencas() {
    await abrir();
    return pedir(tx('licencas', 'readonly').getAll());
  }
  async function obterLicenca(id) {
    await abrir();
    return pedir(tx('licencas', 'readonly').get(id));
  }
  async function salvarLicenca(licenca) {
    await abrir();
    return pedir(tx('licencas', 'readwrite').put(licenca));
  }
  async function removerLicenca(id) {
    await abrir();
    const lic = await obterLicenca(id);
    if (lic && lic.arquivos) {
      for (const a of lic.arquivos) await removerArquivo(a.id);
    }
    return pedir(tx('licencas', 'readwrite').delete(id));
  }

  // ---------- Arquivos (blobs) ----------
  async function salvarArquivo(id, blob) {
    await abrir();
    return pedir(tx('arquivos', 'readwrite').put({ id, blob }));
  }
  async function obterArquivo(id) {
    await abrir();
    return pedir(tx('arquivos', 'readonly').get(id));
  }
  async function removerArquivo(id) {
    await abrir();
    return pedir(tx('arquivos', 'readwrite').delete(id));
  }

  // ---------- Backup ----------
  async function exportarTudo() {
    await abrir();
    const licencas = await listarLicencas();
    const arquivos = await pedir(tx('arquivos', 'readonly').getAll());
    // Converte blobs para base64 para caber no JSON
    const arquivosB64 = [];
    for (const a of arquivos) {
      const base64 = await blobParaBase64(a.blob);
      arquivosB64.push({ id: a.id, base64 });
    }
    return {
      app: 'ponte-licencas',
      versao: 1,
      exportadoEm: new Date().toISOString(),
      licencas,
      arquivos: arquivosB64,
    };
  }

  async function importarTudo(dados, { substituir }) {
    await abrir();
    if (substituir) {
      await pedir(tx('licencas', 'readwrite').clear());
      await pedir(tx('arquivos', 'readwrite').clear());
    }
    for (const lic of (dados.licencas || [])) {
      await salvarLicenca(lic);
    }
    for (const a of (dados.arquivos || [])) {
      const blob = base64ParaBlob(a.base64);
      await salvarArquivo(a.id, blob);
    }
  }

  function blobParaBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }
  function base64ParaBlob(dataUrl) {
    const [meta, b64] = dataUrl.split(',');
    const mime = (meta.match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  return {
    listarLicencas, obterLicenca, salvarLicenca, removerLicenca,
    salvarArquivo, obterArquivo, removerArquivo,
    exportarTudo, importarTudo,
  };
})();
