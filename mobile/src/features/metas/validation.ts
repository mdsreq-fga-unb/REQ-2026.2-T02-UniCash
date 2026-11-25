import { parseValor, VALOR_MAXIMO_CENTAVOS } from '@/features/receitas/money';
import { parseBR } from '@/features/receitas/dates';
import type {
  ErrosMetaForm,
  FormMetaValores,
  MetaInput,
  MetaTipo,
} from './types';

/** Textos literais das exceções da UC12 (EX01). */
export const MSG_META = {
  objetivoVazio: 'Informe o objetivo da meta.',
  objetivoLongo: 'O objetivo deve ter até 80 caracteres.',
  valorVazio: 'Informe o valor alvo da meta.',
  valorInvalido: 'O valor deve ser maior que zero, com no máximo duas casas decimais.',
  valorLimite: 'O valor máximo permitido é R$ 999.999.999,99.',
  prazoVazio: 'Informe o prazo da meta.',
  prazoInvalido: 'Informe um prazo válido.',
  tipoInvalido: 'Selecione o tipo da meta.',
  dadosInvalidos: 'Não foi possível validar os dados da meta. Tente novamente.',
  indisponivel: 'Esta meta não está mais disponível.',
  falhaSalvar: 'Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente.',
  falhaLeitura: 'Não foi possível carregar as metas. Tente novamente.',
  falhaExcluir: 'Não foi possível excluir. Tente novamente.',
  exclusaoMantemLancamentos:
    'A meta será excluída. Os lançamentos associados serão mantidos. Esta ação não pode ser desfeita.',
} as const;

/** Entrada rejeitada na camada de serviço (defesa em profundidade). */
export class EntradaMetaInvalida extends Error {}

export interface DadosMetaValidos {
  objetivo: string;
  tipo: MetaTipo;
  valorAlvoCentavos: number;
  prazo: string;
}

/** Conta caracteres por code point, mesma semântica de length() do SQLite. */
export function contarCaracteres(texto: string): number {
  return Array.from(texto).length;
}

export function tipoMetaValido(valor: unknown): valor is MetaTipo {
  return valor === 'gasto' || valor === 'investimento';
}

/** Valida uma data ISO AAAA-MM-DD, incluindo existência no calendário. */
export function dataISOValida(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (ano < 1900 || ano > 2200) return false;
  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    dt.getUTCFullYear() === ano &&
    dt.getUTCMonth() === mes - 1 &&
    dt.getUTCDate() === dia
  );
}

/**
 * Validação de domínio compartilhada entre formulário e serviço.
 * O objetivo é trimado; o valor é inteiro em centavos e o prazo é ISO.
 */
export function validarDadosMeta(input: MetaInput): DadosMetaValidos {
  const objetivo = String(input.objetivo ?? '').trim();
  if (!objetivo) throw new EntradaMetaInvalida(MSG_META.objetivoVazio);
  if (contarCaracteres(objetivo) > 80) throw new EntradaMetaInvalida(MSG_META.objetivoLongo);

  if (!tipoMetaValido(input.tipo)) throw new EntradaMetaInvalida(MSG_META.tipoInvalido);

  const valor = input.valorAlvoCentavos;
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new EntradaMetaInvalida(MSG_META.valorInvalido);
  }
  if (valor > VALOR_MAXIMO_CENTAVOS) throw new EntradaMetaInvalida(MSG_META.valorLimite);

  const prazo = String(input.prazo ?? '').trim();
  if (!prazo) throw new EntradaMetaInvalida(MSG_META.prazoVazio);
  if (!dataISOValida(prazo)) throw new EntradaMetaInvalida(MSG_META.prazoInvalido);

  return { objetivo, tipo: input.tipo, valorAlvoCentavos: valor, prazo };
}

/** Valida o formulário da UC12; não grava nada. */
export function validarFormularioMeta(v: FormMetaValores): {
  erros: ErrosMetaForm;
  dados: MetaInput | null;
} {
  const erros: ErrosMetaForm = {};

  const objetivo = v.objetivo.trim();
  if (!objetivo) erros.objetivo = MSG_META.objetivoVazio;
  else if (contarCaracteres(objetivo) > 80) erros.objetivo = MSG_META.objetivoLongo;

  if (!tipoMetaValido(v.tipo)) erros.tipo = MSG_META.tipoInvalido;

  let valorAlvoCentavos: number | null = null;
  if (!v.valorAlvo.trim()) {
    erros.valorAlvo = MSG_META.valorVazio;
  } else {
    const valor = parseValor(v.valorAlvo);
    if (!valor.ok) {
      erros.valorAlvo =
        valor.erro === 'vazio' ? MSG_META.valorVazio
          : valor.erro === 'limite' ? MSG_META.valorLimite
          : MSG_META.valorInvalido;
    } else {
      valorAlvoCentavos = valor.centavos;
    }
  }

  let prazoISO: string | null = null;
  if (!v.prazo.trim()) {
    erros.prazo = MSG_META.prazoVazio;
  } else {
    prazoISO = parseBR(v.prazo);
    if (!prazoISO) erros.prazo = MSG_META.prazoInvalido;
  }

  if (Object.keys(erros).length > 0) return { erros, dados: null };
  return {
    erros,
    dados: {
      objetivo,
      tipo: v.tipo,
      valorAlvoCentavos: valorAlvoCentavos!,
      prazo: prazoISO!,
    },
  };
}
