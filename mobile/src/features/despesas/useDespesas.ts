
import { useCallback, useEffect, useState } from 'react';
import {
  listarDespesas,
  FalhaLeitura,
} from './service';
import type { Despesa, FiltroDespesa } from './types';

function intervaloDoFiltro(filtro: FiltroDespesa) {
  if (filtro.modo === 'data') {
    return { inicio: filtro.data, fim: filtro.data };
  }

  if (filtro.modo === 'periodo') {
    return { inicio: filtro.de, fim: filtro.ate };
  }

  const inicio = `${filtro.ano}-${String(filtro.mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(filtro.ano, filtro.mes, 0).getDate();
  const fim = `${filtro.ano}-${String(filtro.mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  return { inicio, fim };
}

export function useDespesas(filtro: FiltroDespesa) {
  const [itens, setItens] = useState<Despesa[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { inicio, fim } = intervaloDoFiltro(filtro);
      const resultado = await listarDespesas(inicio, fim);

      setItens(resultado.itens);
      setTotal(resultado.total);
      setErroLeitura(false);
    } catch (erro) {
      if (erro instanceof FalhaLeitura) {
        setErroLeitura(true);
      } else {
        setErroLeitura(true);
      }
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      void carregar();
    }, 0);

    return () => clearTimeout(temporizador);
  }, [carregar]);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErroLeitura(false);
    void carregar();
  }, [carregar]);

  return {
    itens,
    total,
    carregando,
    erroLeitura,
    recarregar,
  };
}
