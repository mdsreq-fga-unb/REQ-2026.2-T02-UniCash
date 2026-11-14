import { parseValor } from './money';
import { parseBR } from './dates';
import type { CampoForm, FormValores, ReceitaInput } from './types';

/** Textos literais do casos_de_uso.md (EX01 a EX08). */
export const MSG = {
  dataVazia: 'Informe a data da receita.',
  dataInvalida: 'Informe uma data válida no formato DD/MM/AAAA.',
  tituloVazio: 'Informe o título da receita.',
  tituloLongo: 'O título deve ter até 80 caracteres.',
  valorVazio: 'Informe o valor da receita.',
  valorInvalido: 'O valor deve ser maior que zero, com no máximo duas casas decimais.',
  valorLimite: 'O valor máximo permitido é R$ 999.999.999,99.',
  descricaoLonga: 'A descrição deve ter até 255 caracteres.',
  intervaloInvalido: 'O intervalo da recorrência deve ser maior que zero.',
  terminoAnterior: 'A data de término deve ser igual ou posterior à data de início.',
  terminoInvalido: 'Informe a data de término no formato DD/MM/AAAA.',
  periodoInvalido: 'A data inicial deve ser anterior ou igual à data final.',
  falhaSalvar: 'Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente.',
  indisponivel: 'Esta receita não está mais disponível.',
  semAcesso: 'Você não tem acesso a esta receita.',
  acessoNegado: 'A nuvem negou o acesso à sua conta. Suas receitas continuam salvas neste aparelho; entre novamente para sincronizar.',
  falhaRestauracao: 'Não foi possível restaurar seus dados da nuvem. Nada foi alterado. Tente novamente.',
  falhaLeitura: 'Não foi possível carregar as receitas. Tente novamente.',
} as const;

export type ErrosForm = Partial<Record<CampoForm, string>>;

export function validarFormulario(
  v: FormValores,
  opts: { permitirRecorrencia: boolean },
): { erros: ErrosForm; dados: ReceitaInput | null } {
  const erros: ErrosForm = {};

  // data (RN08)
  let data: string | null = null;
  if (!v.data.trim()) erros.data = MSG.dataVazia;
  else {
    data = parseBR(v.data);
    if (!data) erros.data = MSG.dataInvalida;
  }

  // título (RN08, RN10)
  const titulo = v.titulo.trim();
  if (!titulo) erros.titulo = MSG.tituloVazio;
  else if (titulo.length > 80) erros.titulo = MSG.tituloLongo;

  // valor (RN08, RN09)
  let valorCentavos = 0;
  const pv = parseValor(v.valor);
  if (!pv.ok) {
    erros.valor =
      pv.erro === 'vazio' ? MSG.valorVazio : pv.erro === 'limite' ? MSG.valorLimite : MSG.valorInvalido;
  } else valorCentavos = pv.centavos;

  // descrição (RN10)
  const descricao = v.descricao.trim();
  if (descricao.length > 255) erros.descricao = MSG.descricaoLonga;

  // recorrência (RN19)
  let recorrencia: ReceitaInput['recorrencia'] = null;
  if (opts.permitirRecorrencia && v.recorrente) {
    const intervalo = /^\d+$/.test(v.intervalo.trim()) ? Number(v.intervalo.trim()) : 0;
    if (intervalo <= 0) erros.intervalo = MSG.intervaloInvalido;

    let termino: string | null = null;
    if (v.termino.trim()) {
      termino = parseBR(v.termino);
      if (!termino) erros.termino = MSG.terminoInvalido;
      else if (data && termino < data) erros.termino = MSG.terminoAnterior;
    }
    if (!erros.intervalo && !erros.termino) recorrencia = { intervalo, unidade: v.unidade, termino };
  }

  if (Object.keys(erros).length > 0 || !data) return { erros, dados: null };
  return {
    erros,
    dados: { data, titulo, valorCentavos, descricao: descricao || null, recorrencia },
  };
}
