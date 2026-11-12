import { parseValor } from '@/features/receitas/money';
import type { CampoCategoriaForm, CategoriaInput, FormCategoriaValores } from './types';

/** Textos literais das exceções do UC06 (EX01 a EX10). */
export const MSG_CAT = {
  nomeVazio: 'Informe o nome da categoria.',
  nomeLongo: 'O nome deve ter até 30 caracteres.',
  nomeDuplicado: 'Já existe uma categoria com esse nome.',
  limiteValorVazio: 'Informe o valor do limite.',
  limiteValorInvalido: 'O limite deve ser maior que zero, com no máximo duas casas decimais.',
  limiteValorLimite: 'O valor máximo permitido é R\u00A0$ 999.999.999,99.',
  limitePercentualVazio: 'Informe o percentual do limite.',
  limitePercentualInvalido: 'O percentual deve ser maior que zero, com até duas casas decimais.',
  falhaSalvar: 'Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente.',
  indisponivel: 'Esta categoria não está mais disponível.',
  categoriaPadrao: 'Categorias padrão não podem ser renomeadas nem excluídas.',
  falhaLeitura: 'Não foi possível carregar as categorias. Tente novamente.',
  falhaExcluir: 'Não foi possível excluir. Tente novamente.',
} as const;

export type ErrosCategoriaForm = Partial<Record<CampoCategoriaForm, string>>;

/**
 * Normaliza o nome para unicidade (RN13): trim + minúsculas.
 * Fonte única usada por formulário e serviço.
 */
export function normalizarNome(nome: string): string {
  return nome.trim().toLowerCase();
}

/** Entrada rejeitada na camada de serviço (defesa em profundidade; o formulário filtra antes). */
export class EntradaCategoriaInvalida extends Error {}

/** Dados já validados e normalizados, prontos para gravar. */
export interface DadosCategoriaValidos {
  nome: string;
  nomeNormalizado: string;
  limite: CategoriaInput['limite'];
}

/**
 * Validação de domínio compartilhada entre formulário e serviço (RN13, RN14):
 * nome de 1 a 30 caracteres e limite coerente (valor em centavos ou percentual
 * em centésimos). Exige inteiros seguros (Number.isSafeInteger) e positivos.
 * NÃO impõe máximo percentual: a faixa 0,01%–100% é pendente de validação da cliente.
 */
export function validarDadosCategoria(nome: string, limite: CategoriaInput['limite']): DadosCategoriaValidos {
  const nomeTrim = nome.trim();
  if (!nomeTrim) throw new EntradaCategoriaInvalida(MSG_CAT.nomeVazio);
  if (nomeTrim.length > 30) throw new EntradaCategoriaInvalida(MSG_CAT.nomeLongo);

  if (limite === null) {
    return { nome: nomeTrim, nomeNormalizado: normalizarNome(nomeTrim), limite: null };
  }

  if (limite.tipo === 'valor') {
    const v = limite.valor;
    // Teto de 99.999.999.999 centavos já está abaixo de MAX_SAFE_INTEGER;
    // a checagem explícita de inteiro seguro é defesa contra valores corrompidos.
    if (!Number.isSafeInteger(v) || v <= 0 || v > 99999999999) {
      throw new EntradaCategoriaInvalida(MSG_CAT.limiteValorInvalido);
    }
  } else if (limite.tipo === 'percentual_renda') {
    const p = limite.valor;
    // Sem máximo aqui (decisão da cliente pendente); exige inteiro positivo e seguro.
    if (!Number.isSafeInteger(p) || p <= 0) {
      throw new EntradaCategoriaInvalida(MSG_CAT.limitePercentualInvalido);
    }
  } else {
    throw new EntradaCategoriaInvalida('Tipo de limite desconhecido.');
  }

  return { nome: nomeTrim, nomeNormalizado: normalizarNome(nomeTrim), limite };
}

/**
 * Converte texto percentual ("12,5" ou "12.5") em centésimos (1250).
 * Formato restritivo: trim nas bordas; apenas dígitos, ponto decimal opcional
 * com até duas casas. Rejeita notação científica ("1e2"), hexadecimal ("0x1f"),
 * sinais ("+5"), espaços internos, "." e "" isolados — `Number()` nunca é usado
 * sobre o texto completo e a conversão é exata (BigInt), rejeitando resultado
 * que não caiba em um Number.isSafeInteger (overflow/perda de precisão).
 * Sem máximo de negócio aqui: a faixa é exigida pelo formulário (decisão da
 * cliente pendente).
 */
export function parsePercentualParaCentesimos(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;

  const [inteiro, frac = ''] = normalizado.split('.');
  const fracDuasCasas = (frac + '00').slice(0, 2); // '5' → '50'; '05' → '05'
  const valor = BigInt(inteiro) * 100n + BigInt(fracDuasCasas);
  return valor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(valor) : null;
}

/**
 * Valida o formulário de categoria.
 * Não verifica unicidade de nome — isso é feito no service, contra a base local.
 */
export function validarFormularioCategoria(
  v: FormCategoriaValores,
): { erros: ErrosCategoriaForm; dados: CategoriaInput | null } {
  const erros: ErrosCategoriaForm = {};

  // nome (RN13)
  const nome = v.nome.trim();
  if (!nome) erros.nome = MSG_CAT.nomeVazio;
  else if (nome.length > 30) erros.nome = MSG_CAT.nomeLongo;

  // limite
  let limite: CategoriaInput['limite'] = null;
  if (v.comLimite) {
    if (v.limiteTipo === 'valor') {
      const pv = parseValor(v.limiteValor);
      if (!pv.ok) {
        erros.limiteValor =
          pv.erro === 'vazio' ? MSG_CAT.limiteValorVazio
            : pv.erro === 'limite' ? MSG_CAT.limiteValorLimite
            : MSG_CAT.limiteValorInvalido;
      } else {
        limite = { tipo: 'valor', valor: pv.centavos };
      }
    } else {
      // percentual_renda
      if (!v.limitePercentual.replace(/\s/g, '').replace(',', '.')) {
        erros.limitePercentual = MSG_CAT.limitePercentualVazio;
      } else {
        const centesimos = parsePercentualParaCentesimos(v.limitePercentual);
        // Sem máximo percentual (faixa pendente de validação da cliente);
        // exige positivo e inteiro seguro, garantidos pelo parser.
        if (centesimos === null || centesimos < 1) {
          erros.limitePercentual = MSG_CAT.limitePercentualInvalido;
        } else {
          limite = { tipo: 'percentual_renda', valor: centesimos };
        }
      }
    }
  }

  if (Object.keys(erros).length > 0) return { erros, dados: null };
  return {
    erros,
    dados: { nome, limite },
  };
}
