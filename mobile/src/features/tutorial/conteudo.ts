export const glossario = {
  receita: 'Dinheiro que entra, como bolsa, salário ou ajuda da família.',
  despesa: 'Dinheiro que sai, como o que você gasta com lanche ou transporte.',
  meta: 'Objetivo para o qual você quer guardar dinheiro.',
  saldo: 'Diferença entre o total de receitas e o total de despesas.',
};

export const MSG_ABERTURA_TUTORIAL = 'Não foi possível abrir o tutorial. Tente novamente.';

export const etapas = [
  {
    id: 'informacao',
    titulo: 'Conheça o UniCash',
    texto: 'O UniCash organiza e mostra as informações sobre o seu dinheiro. Ele não aumenta sua renda nem garante a redução de dívidas.',
    termos: [],
  },
  {
    id: 'receita',
    titulo: 'Registre uma receita',
    texto: 'Para registrar o dinheiro que entrou, informe um título, o valor e a data. Confira os dados antes de salvar.',
    termos: ['receita'],
    destino: 'registrar-receita',
    acao: 'Registrar receita',
  },
  {
    id: 'despesa',
    titulo: 'Registre uma despesa',
    texto: 'Para registrar um gasto, informe o título, o valor e a data. A categoria ajuda a entender para onde seu dinheiro foi.',
    termos: ['despesa'],
    destino: 'registrar-despesa',
    acao: 'Registrar despesa',
  },
  {
    id: 'meta',
    titulo: 'Crie uma meta financeira',
    texto: 'Escolha um objetivo, quanto você quer guardar e até quando. Assim você pode acompanhar quanto falta.',
    termos: ['meta'],
    destino: 'criar-meta',
    acao: 'Ver exemplo de meta',
  },
  {
    id: 'resumo',
    titulo: 'Entenda o resumo',
    texto: 'O resumo mostra quanto entrou, quanto saiu e o saldo do período. Antes do primeiro lançamento, os três valores aparecem como R$ 0,00.',
    termos: ['receita', 'despesa', 'saldo'],
    destino: 'resumo',
    acao: 'Ver meu resumo',
  },
] as const;

export const destinos = {
  'registrar-receita': { pathname: '/receitas/nova', params: { tutorial: '1' } },
  'registrar-despesa': { pathname: '/despesas/nova', params: { tutorial: '1' } },
  'criar-meta': '/tutorial/criar-meta',
  resumo: '/tutorial/resumo',
} as const;
