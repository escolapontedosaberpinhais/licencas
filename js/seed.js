/**
 * Categorias de licenças e modelos de exigências (checklists).
 * Os modelos servem como ponto de partida ao criar uma nova licença
 * de cada tipo — podem ser editados livremente depois.
 */
const CATEGORIAS = {
  sanitaria: {
    nome: 'Vigilância Sanitária',
    icone: '🩺',
    cor: '#0ea5e9',
    corBg: '#e0f2fe',
    orgaoPadrao: 'Vigilância Sanitária Municipal',
    exigencias: [
      'Alvará sanitário vigente',
      'Laudo de análise da água potável',
      'Controle de pragas (dedetização) atualizado',
      'Plano de gerenciamento de resíduos',
      'Carteira de saúde dos manipuladores de alimentos',
      'Cardápio nutricional assinado por nutricionista',
    ],
  },
  bombeiro: {
    nome: 'Corpo de Bombeiros',
    icone: '🧯',
    cor: '#dc2626',
    corBg: '#fee2e2',
    orgaoPadrao: 'Corpo de Bombeiros Militar',
    exigencias: [
      'AVCB / CLCB (Auto de Vistoria do Corpo de Bombeiros)',
      'Projeto técnico (PPCI) aprovado',
      'Extintores dentro da validade',
      'Sinalização de emergência e saídas',
      'Iluminação de emergência funcionando',
      'Treinamento de brigada de incêndio',
    ],
  },
  meio_ambiente: {
    nome: 'Meio Ambiente',
    icone: '🌱',
    cor: '#16a34a',
    corBg: '#dcfce7',
    orgaoPadrao: 'Secretaria Municipal de Meio Ambiente',
    exigencias: [
      'Licença ambiental de operação',
      'Comprovante de destinação de resíduos',
      'Outorga / comprovante de uso da água (se aplicável)',
      'Plano de gerenciamento de resíduos sólidos',
    ],
  },
  educacao: {
    nome: 'Educação',
    icone: '🎓',
    cor: '#7c3aed',
    corBg: '#ede9fe',
    orgaoPadrao: 'Secretaria / Conselho de Educação',
    exigencias: [
      'Autorização de funcionamento',
      'Credenciamento da instituição',
      'Reconhecimento dos cursos / etapas',
      'Projeto Político-Pedagógico (PPP) atualizado',
      'Regimento escolar aprovado',
      'Corpo docente habilitado',
    ],
  },
  alvara: {
    nome: 'Alvará / Prefeitura',
    icone: '🏛️',
    cor: '#ca8a04',
    corBg: '#fef9c3',
    orgaoPadrao: 'Prefeitura Municipal',
    exigencias: [
      'Alvará de funcionamento / localização',
      'Habite-se do imóvel',
      'Certidão negativa de débitos municipais',
      'Comprovante de IPTU',
    ],
  },
  acessibilidade: {
    nome: 'Acessibilidade',
    icone: '♿',
    cor: '#0891b2',
    corBg: '#cffafe',
    orgaoPadrao: 'CREA / Prefeitura',
    exigencias: [
      'Laudo de acessibilidade (NBR 9050)',
      'Rampas e sinalização adequadas',
      'Sanitários acessíveis',
    ],
  },
  outros: {
    nome: 'Outros',
    icone: '📄',
    cor: '#6b7280',
    corBg: '#f3f4f6',
    orgaoPadrao: '',
    exigencias: [],
  },
};

const ORDEM_CATEGORIAS = ['sanitaria', 'bombeiro', 'meio_ambiente', 'educacao', 'alvara', 'acessibilidade', 'outros'];
