/**
 * Camada de persistência usando Supabase (Postgres + Storage).
 * Substitui o IndexedDB anterior — dados ficam na nuvem.
 * Requer: js/config.js carregado antes (SUPABASE_URL e SUPABASE_ANON_KEY).
 */
const DB = (() => {
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ---------- Auth ----------
  async function getUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
  }
  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function signOut() {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  }
  function onAuthChange(cb) {
    sb.auth.onAuthStateChange((_evt, session) => cb(session?.user ?? null));
  }

  // ---------- Licenças ----------
  async function listarLicencas() {
    const { data, error } = await sb.from('licencas').select('data');
    if (error) throw error;
    return (data || []).map(r => r.data);
  }
  async function obterLicenca(id) {
    const { data, error } = await sb.from('licencas').select('data').eq('id', id).maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  async function salvarLicenca(licenca) {
    const { error } = await sb.from('licencas').upsert({ id: licenca.id, data: licenca }, { onConflict: 'id' });
    if (error) throw error;
  }
  async function removerLicenca(id) {
    const lic = await obterLicenca(id);
    if (lic?.arquivos?.length) {
      const paths = lic.arquivos.map(a => a.storagePath).filter(Boolean);
      if (paths.length) await sb.storage.from('documentos').remove(paths);
    }
    const { error } = await sb.from('licencas').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- Arquivos (Supabase Storage) ----------
  async function salvarArquivo(arquivoId, licencaId, blob) {
    const path = `${licencaId}/${arquivoId}`;
    const { error } = await sb.storage.from('documentos').upload(path, blob, { upsert: true });
    if (error) throw error;
    return path;
  }
  async function obterArquivoUrl(storagePath) {
    const { data, error } = await sb.storage.from('documentos').createSignedUrl(storagePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  async function removerArquivo(storagePath) {
    if (!storagePath) return;
    await sb.storage.from('documentos').remove([storagePath]);
  }

  // ---------- Manutenções ----------
  async function listarManutencoes() {
    const { data, error } = await sb.from('manutencoes').select('data');
    if (error) throw error;
    return (data || []).map(r => r.data);
  }
  async function obterManutencao(id) {
    const { data, error } = await sb.from('manutencoes').select('data').eq('id', id).maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  async function salvarManutencao(m) {
    const { error } = await sb.from('manutencoes').upsert({ id: m.id, data: m }, { onConflict: 'id' });
    if (error) throw error;
  }
  async function removerManutencao(id) {
    const { error } = await sb.from('manutencoes').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- Backup ----------
  async function exportarTudo() {
    const [licencas, manutencoes] = await Promise.all([listarLicencas(), listarManutencoes()]);
    return {
      app: 'ponte-licencas',
      versao: 3,
      exportadoEm: new Date().toISOString(),
      licencas,
      manutencoes,
    };
  }
  async function importarTudo(dados, { substituir }) {
    if (substituir) {
      await sb.from('licencas').delete().gte('id', '');
      await sb.from('manutencoes').delete().gte('id', '');
    }
    for (const lic of (dados.licencas || [])) await salvarLicenca(lic);
    for (const m of (dados.manutencoes || [])) await salvarManutencao(m);
  }

  return {
    getUser, signIn, signOut, onAuthChange,
    listarLicencas, obterLicenca, salvarLicenca, removerLicenca,
    salvarArquivo, obterArquivoUrl, removerArquivo,
    listarManutencoes, obterManutencao, salvarManutencao, removerManutencao,
    exportarTudo, importarTudo,
  };
})();
