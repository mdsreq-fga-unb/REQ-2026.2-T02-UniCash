import { useCallback, useEffect, useRef, useState } from 'react';
import { listarCategorias, semearCategoriasPadrao } from './service';
import { consumirSolicitacaoSemeadura } from './semeaduraPendente';
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
   * Falha de persistência da semeadura. Conflitos de nome não são erro: são
   * devolvidos pela semeadura e expostos em `conflitosSemeadura`.
   */
  const [erroSemeadura, setErroSemeadura] = useState(false);
  const [conflitosSemeadura, setConflitosSemeadura] = useState<string[]>([]);

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
      setErroSemeadura(false);

      // Exclusão de uma categoria própria com nome reservado sinaliza uma única
      // reavaliação; não há semeadura indiscriminada a cada foco.
      if (consumirSolicitacaoSemeadura()) {
        semeou.current = false;
        // O conflito anterior pode ter sido resolvido pela exclusão; o resultado
        // da nova tentativa substitui a lista de conflitos.
        setConflitosSemeadura([]);
      }

      if (!semeou.current) {
        try {
          const resultado = await semearCategoriasPadrao(); // antes da primeira listagem (RN13)
          semeou.current = true;
          if (montado.current) setConflitosSemeadura(resultado.conflitos);
        } catch {
          // Falha de persistência: permite nova tentativa no próximo foco.
          if (montado.current) setErroSemeadura(true);
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

  return { itens, carregando, erroLeitura, erroSemeadura, conflitosSemeadura, recarregar: carregar };
}
