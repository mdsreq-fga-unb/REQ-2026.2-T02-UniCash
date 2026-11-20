import { useCallback, useEffect, useRef, useState } from 'react';

import { listarCategorias } from './service';
import type { Categoria } from './types';

/**
 * Leitura das categorias ativas do UC06 para consumo por outras telas.
 *
 * Não semeia, não cria e não altera categorias: o RootLayout já garante a
 * preparação inicial. A ordenação devolvida por `listarCategorias()` é preservada.
 *
 * Em caso de falha, a última lista carregada é mantida; apenas `erro` é
 * sinalizado. O consumidor decide quando chamar `recarregar` (por exemplo, ao
 * voltar de uma tela de criação ou edição de categorias).
 */
export function useCategoriasAtivas() {
  const [itens, setItens] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const montado = useRef(true);
  const ultimaRequisicao = useRef(0);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    if (!montado.current) return;

    const requisicao = ++ultimaRequisicao.current;

    try {
      const lista = await listarCategorias();

      // Ignora respostas de uma requisição obsoleta ou de componente desmontado.
      if (!montado.current || requisicao !== ultimaRequisicao.current) return;

      setItens(lista);
      setErro(false);
    } catch {
      if (!montado.current || requisicao !== ultimaRequisicao.current) return;

      // Mantém a última lista válida; apenas sinaliza a falha de leitura.
      setErro(true);
    } finally {
      if (montado.current && requisicao === ultimaRequisicao.current) {
        setCarregando(false);
      }
    }
  }, []);

  useEffect(() => {
    // A primeira leitura é agendada para o próximo microtask: a atualização de
    // estado não ocorre no corpo síncrono do efeito. O estado inicial já é
    // carregando = true e erro = false.
    void Promise.resolve().then(carregar);
  }, [carregar]);

  const recarregar = useCallback(() => {
    if (!montado.current) return;

    setCarregando(true);
    setErro(false);
    void carregar();
  }, [carregar]);

  return { itens, carregando, erro, recarregar };
}
