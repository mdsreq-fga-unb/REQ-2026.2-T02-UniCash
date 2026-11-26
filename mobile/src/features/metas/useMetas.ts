import { useCallback, useEffect, useRef, useState } from 'react';
import { calcularProgressoDaMeta, calculadoraIndisponivel, type ProgressoMeta, type ValorRealizadoCalculator } from './progresso';
import { calculadoraReal } from './calculadoras';
import { periodoDoMes } from './periodo';
import { buscarMeta, listarMetas } from './service';
import type { Meta } from './types';

export interface ReferenciaMes {
  ano: number;
  mes: number;
}

/** Lista de metas ativas, com progresso calculado para o mês corrente. */
export function useMetas(calculadora: ValorRealizadoCalculator = calculadoraReal) {
  const [itens, setItens] = useState<Meta[]>([]);
  const [progressos, setProgressos] = useState<Record<string, ProgressoMeta>>({});
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
        const calculados = await Promise.all(
          lista.map(async (meta) => {
            try {
              return [meta.id, await calcularProgressoDaMeta(meta, calculadora)] as const;
            } catch {
              return [
                meta.id,
                await calcularProgressoDaMeta(meta, calculadoraIndisponivel),
              ] as const;
            }
          }),
        );
        if (montado.current) {
          setItens(lista);
          setProgressos(Object.fromEntries(calculados));
        }
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
  }, [calculadora]);

  return { itens, progressos, carregando, erroLeitura, recarregar };
}

/** Detalhe e progresso de uma meta, opcionalmente em um mês específico. */
export function useMeta(
  id: string,
  calculadora: ValorRealizadoCalculator = calculadoraReal,
  mes: ReferenciaMes | null = null,
) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [progresso, setProgresso] = useState<ProgressoMeta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const montado = useRef(true);
  const ultimaRequisicao = useRef(0);
  const ano = mes?.ano;
  const numeroMes = mes?.mes;

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recarregar = useCallback(async (): Promise<void> => {
    const requisicao = ++ultimaRequisicao.current;
    setCarregando(true);
    setErroLeitura(false);
    try {
      const encontrada = await buscarMeta(id);
      if (!montado.current || requisicao !== ultimaRequisicao.current) return;
      setMeta(encontrada);

      if (!encontrada) {
        setProgresso(null);
        return;
      }

      const periodo =
        ano !== undefined && numeroMes !== undefined
          ? periodoDoMes(encontrada, ano, numeroMes)
          : null;
      const calculado = await calcularProgressoDaMeta(
        encontrada,
        calculadora,
        undefined,
        periodo,
      );
      if (montado.current && requisicao === ultimaRequisicao.current) {
        setProgresso(calculado);
      }
    } catch {
      if (montado.current && requisicao === ultimaRequisicao.current) {
        setErroLeitura(true);
        setProgresso(null);
      }
    } finally {
      if (montado.current && requisicao === ultimaRequisicao.current) {
        setCarregando(false);
      }
    }
  }, [id, calculadora, ano, numeroMes]);

  return { meta, progresso, carregando, erroLeitura, recarregar };
}
