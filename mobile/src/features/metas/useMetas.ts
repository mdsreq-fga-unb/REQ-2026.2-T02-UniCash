import { useCallback, useEffect, useRef, useState } from 'react';
import { buscarMeta, listarMetas } from './service';
import {
  calcularProgressoDaMeta,
  calculadoraIndisponivel,
  type ProgressoMeta,
  type ValorRealizadoCalculator,
} from './progresso';
import type { Meta } from './types';

/** Lista de metas ativas. */
export function useMetas() {
  const [itens, setItens] = useState<Meta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const montado = useRef(true);
  const emAndamento = useRef<Promise<void> | null>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recarregar = useCallback(async (): Promise<void> => {
    if (emAndamento.current) return emAndamento.current;

    const tarefa = (async () => {
      setCarregando(true);
      setErroLeitura(false);
      try {
        const lista = await listarMetas();
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

  return { itens, carregando, erroLeitura, recarregar };
}

/** Detalhe e progresso de uma meta. */
export function useMeta(id: string, calculadora: ValorRealizadoCalculator = calculadoraIndisponivel) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [progresso, setProgresso] = useState<ProgressoMeta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const montado = useRef(true);
  const emAndamento = useRef<Promise<void> | null>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recarregar = useCallback(async (): Promise<void> => {
    if (emAndamento.current) return emAndamento.current;

    const tarefa = (async () => {
      setCarregando(true);
      setErroLeitura(false);
      try {
        const encontrada = await buscarMeta(id);
        if (!montado.current) return;
        setMeta(encontrada);
        const calculado = encontrada
          ? await calcularProgressoDaMeta(encontrada, calculadora)
          : null;
        if (montado.current) setProgresso(calculado);
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
  }, [id, calculadora]);

  return { meta, progresso, carregando, erroLeitura, recarregar };
}
