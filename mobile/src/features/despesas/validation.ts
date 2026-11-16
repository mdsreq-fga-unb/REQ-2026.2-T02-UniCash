
import { parseValor } from '../receitas/money';
import { parseBR } from '../receitas/dates';
import type {
  CampoFormDespesa,
  FormValoresDespesa,
  DespesaInput,
} from './types';

/** Mensagens previstas no UC02 (EX01 a EX09). */
export const MSG_DESPESA = {
  dataVazia: 'Informe a data da despesa.',
  dataInvalida: 'Informe uma data válida no formato DD/MM/AAAA.',
  tituloVazio: 'Informe o título da despesa.',
  tituloLongo: 'O título deve ter até 80 caracteres.',
  valorVazio: 'Informe o valor da despesa.',
  valorInvalido:
    'O valor deve ser maior que zero, com no máximo duas casas decimais.',
  valorLimite: 'O valor máximo permitido é R$ 999.999.999,99.',
  descricaoLonga: 'A descrição deve ter até 255 caracteres.',
  intervaloInvalido: 'O intervalo da recorrência deve ser maior que zero.',
  terminoAnterior:
    'A data de término deve ser igual ou posterior à data de início.',
  terminoInvalido: 'Informe a data de término no formato DD/MM/AAAA.',
  periodoInvalido:
    'A data inicial deve ser anterior ou igual à data final.',
  falhaSalvar:
    'Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente.',
  indisponivel: 'Esta despesa não está mais disponível.',
  semAcesso: 'Você não tem acesso a esta despesa.',
  falhaLeitura: 'Não foi possível carregar as despesas. Tente novamente.',
} as const;

export type ErrosFormDespesa = Partial<
  Record<CampoFormDespesa, string>
>;

export function validarFormularioDespesa(
  v: FormValoresDespesa,
  opts: { permitirRecorrencia: boolean },
): { erros: ErrosFormDespesa; dados: DespesaInput | null } {
  const erros: ErrosFormDespesa = {};

  // Data (RN08)
  let data: string | null = null;

  if (!v.data.trim()) {
    erros.data = MSG_DESPESA.dataVazia;
  } else {
    data = parseBR(v.data);

    if (!data) {
      erros.data = MSG_DESPESA.dataInvalida;
    }
  }

  // Título (RN08 e RN10)
  const titulo = v.titulo.trim();

  if (!titulo) {
    erros.titulo = MSG_DESPESA.tituloVazio;
  } else if (titulo.length > 80) {
    erros.titulo = MSG_DESPESA.tituloLongo;
  }

  // Valor (RN08 e RN09)
  let valorCentavos = 0;
  const pv = parseValor(v.valor);

  if (!pv.ok) {
    erros.valor =
      pv.erro === 'vazio'
        ? MSG_DESPESA.valorVazio
        : pv.erro === 'limite'
          ? MSG_DESPESA.valorLimite
          : MSG_DESPESA.valorInvalido;
  } else {
    valorCentavos = pv.centavos;
  }

  // Descrição (RN10)
  const descricao = v.descricao.trim();

  if (descricao.length > 255) {
    erros.descricao = MSG_DESPESA.descricaoLonga;
  }

  // Recorrência (RN19)
  let recorrencia: DespesaInput['recorrencia'] = null;

  if (opts.permitirRecorrencia && v.recorrente) {
    const intervalo = /^\d+$/.test(v.intervalo.trim())
      ? Number(v.intervalo.trim())
      : 0;

    if (intervalo <= 0) {
      erros.intervalo = MSG_DESPESA.intervaloInvalido;
    }

    let termino: string | null = null;

    if (v.termino.trim()) {
      termino = parseBR(v.termino);

      if (!termino) {
        erros.termino = MSG_DESPESA.terminoInvalido;
      } else if (data && termino < data) {
        erros.termino = MSG_DESPESA.terminoAnterior;
      }
    }

    if (!erros.intervalo && !erros.termino) {
      recorrencia = {
        intervalo,
        unidade: v.unidade,
        termino,
      };
    }
  }

  if (Object.keys(erros).length > 0 || !data) {
    return { erros, dados: null };
  }

  const essencial: 0 | 1 | null =
    v.essencial === 'essencial'
      ? 1
      : v.essencial === 'nao_essencial'
        ? 0
        : null;

  return {
    erros,
    dados: {
      data,
      titulo,
      valorCentavos,
      descricao: descricao || null,
      categoriaId: v.categoriaId.trim() || null,
      fixaOuVariavel: v.fixaOuVariavel || null,
      essencial,
      recorrencia,
    },
  };
}
