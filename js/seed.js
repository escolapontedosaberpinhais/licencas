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

/**
 * Modelos de checklist prontos, com listas oficiais/completas de exigências.
 * Podem ser escolhidos ao cadastrar uma licença ou aplicados depois, na ficha.
 * `arquivoRef` (opcional) aponta para o documento oficial guardado no projeto.
 */
const MODELOS_CHECKLIST = [
  {
    id: 'cei_vigilancia',
    nome: 'Documentação Prévia CEI — Vigilância Sanitária (POP.0029)',
    categoria: 'sanitaria',
    arquivoRef: 'referencias/documentacao-previa-cei-vigilancia-sanitaria.pdf',
    itens: [
      'ART do nutricionista responsável pela área de alimentação e nutrição (emitida pelo Conselho de Nutrição)',
      'Registro da higienização semestral do reservatório de água + registro do teor de cloro residual mensal',
      'Procedimento de higienização da caixa de gordura',
      'Procedimento de higienização e troca dos filtros de água',
      'Cópia do Certificado de Vistoria de Estabelecimento (CVE) emitido pelo Corpo de Bombeiros',
      'Relação de funcionários por cargo/função',
      'Programa de Controle Médico de Saúde Ocupacional (PCMSO)',
      'Recibo/controle de entrega de Equipamentos de Proteção Individual (EPI) e/ou uniformes',
      'Procedimento de troca e lavagem de roupas',
      'Procedimento de higienização e troca dos filtros dos equipamentos de climatização',
      'Procedimento de manutenção semestral da caixa de areia',
      'Procedimento de desinfecção dos panos de cozinha',
      'Procedimento para higienização de garrafinhas e copos',
      'Procedimento de verificação da vacinação das crianças',
      'Procedimento de encaminhamento em caso de violência ou suspeita de violência envolvendo a criança',
      'Procedimento para administração de medicamentos',
      'Procedimento para higienização de brinquedos, trocadores, colchonetes e penicos',
      'Comprovante de treinamento em boas práticas de manipulação de alimentos (conteúdo programático, data, carga horária, nome, função e assinaturas dos manipuladores e do instrutor/RT)',
      'Manual de boas práticas (a) alimentos: aquisição, transporte, recepção, armazenamento, conservação, preparo, distribuição e consumo; (b) ambiente, equipamentos e utensílios; (c) manipuladores: hábitos higiênicos, saúde, treinamentos e paramentação',
      'Critérios para avaliação e seleção dos fornecedores de alimentos (laudos, licenças sanitárias etc.)',
      'Registro das temperaturas máxima, mínima e de momento dos equipamentos de conservação de alimentos',
      'Procedimento de limpeza e desinfecção de hortifrúti',
      'Procedimento de coleta e conservação das amostras de controle de alimentos',
      'Cardápio elaborado pelo nutricionista RT',
      'Procedimento sobre afastamento ou uso de EPI para manipuladores em caso de lesões cutâneas, afecções respiratórias e intestinais',
      'Atestados de Saúde Ocupacional (ASO) dos manipuladores, com exames laboratoriais (coprocultura, VDRL, hemograma completo e parcial de urina)',
      'Rotinas escritas do lactário (a) reprocessamento de mamadeiras, utensílios e equipamentos; (b) preparo das fórmulas lácteas com horário de preparo e consumo; (c) conservação e fluxo de distribuição',
      'Na ausência de lactário: rotina escrita de preparo das mamadeiras em horários diferenciados do preparo dos alimentos',
      'Procedimento de administração, conservação, descongelamento, validade, transporte e aquecimento de leite humano',
    ],
  },
];
