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
  limitePercentualInvalido: 'O percentual deve ser entre 0,01% e 100%, com até duas casas decimais.',
  falhaSalvar: 'Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente.',
  indisponivel: 'Esta categoria não está mais disponível.',
  categoriaPadrao: 'Categorias padrão não podem ser renomeadas nem excluídas.',
  falhaLeitura: 'Não foi possível carregar as categorias. Tente novamente.',
  falhaExcluir: 'Não foi possível excluir. Tente novamente.',
} as const;

export type ErrosCategoriaForm = Partial<Record<CampoCategoriaForm, string>>;

const MAX_PERCENTUAL_CENTESIMOS = 10_000; // 100,00%

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
      const texto = v.limitePercentual.replace(/\s/g, '').replace(',', '.');
      if (!texto) {
        erros.limitePercentual = MSG_CAT.limitePercentualVazio;
      } else {
        const n = Number(texto);
        if (isNaN(n) || n <= 0 || n > 100) {
          erros.limitePercentual = MSG_CAT.limitePercentualInvalido;
        } else {
          // Verificar até duas casas decimais
          const [, frac = ''] = texto.split('.');
          if (frac.length > 2) {
            erros.limitePercentual = MSG_CAT.limitePercentualInvalido;
          } else {
            const centesimos = Math.round(n * 100);
            if (centesimos < 1 || centesimos > MAX_PERCENTUAL_CENTESIMOS) {
              erros.limitePercentual = MSG_CAT.limitePercentualInvalido;
            } else {
              limite = { tipo: 'percentual_renda', valor: centesimos };
            }
          }
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
