import { useCallback, useEffect, useRef, useState } from 'react';
import { listarCategorias, semearCategoriasPadrao } from './service';
import type { Categoria } from './types';

/**
 * Carrega as categorias ativas (fluxo A do UC06), semeando os padrões antes da
 * primeira listagem (RN13). Espelha `useReceitas`: `carregando` inicia em true
 * e a tela dispara `recarregar` no foco (useFocusEffect), sem criar loops.
 */
export function useCategorias() {
  const [itens, setItens] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  /**
   * Erro semântico da semeadura (ex.: NomeReservadoCategoriasPadrao), preservado
   * como instância original — não vira falha genérica. A listagem continua,
   * pois as categorias existentes permanecem visíveis.
   */
  const [erroSemeadura, setErroSemeadura] = useState<Error | null>(null);

  // Sem atualizações de estado após a desmontagem.
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  // Semeadura bem-sucedida acontece uma vez por instância; falha permite nova tentativa.
  const semeou = useRef(false);
  // Carga em andamento: chamadas concorrentes de recarregar reaproveitam a mesma promessa.
  const emAndamento = useRef<Promise<void> | null>(null);

  const carregar = useCallback(async (): Promise<void> => {
    if (emAndamento.current) return emAndamento.current;

    const tarefa = (async () => {
      setCarregando(true);
      setErroLeitura(false);
      setErroSemeadura(null);

      if (!semeou.current) {
        try {
          await semearCategoriasPadrao(); // antes da primeira listagem (RN13)
          semeou.current = true;
        } catch (e) {
          // Semântico preservado; nova tentativa permitida no próximo foco.
          if (montado.current) setErroSemeadura(e as Error);
        }
      }

      try {
        const lista = await listarCategorias();
        if (montado.current) setItens(lista);
      } catch {
        if (montado.current) setErroLeitura(true);
      } finally {
        if (montado.current) setCarregando(false);
      }
    })();

    emAndamento.current = tarefa.finally(() => {
      emAndamento.current = null;
    });
    return emAndamento.current;
  }, []);

  return { itens, carregando, erroLeitura, erroSemeadura, recarregar: carregar };
}
