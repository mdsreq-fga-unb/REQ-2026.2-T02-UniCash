
import { useCallback, useEffect, useState } from 'react';
import { listarDespesas } from './service';
import type { Despesa, FiltroDespesa } from './types';

/**
 * Acrescenta dias a uma data no formato AAAA-MM-DD.
 * O uso de UTC evita problemas com mudanças de horário de verão.
 */
function adicionarDias(data: string, quantidade: number): string {
  const resultado = new Date(`${data}T00:00:00.000Z`);
  resultado.setUTCDate(resultado.getUTCDate() + quantidade);
  return resultado.toISOString().slice(0, 10);
}

/**
 * Calcula o intervalo de datas usado na consulta.
 * O fim é exclusivo, por isso acrescentamos um dia à data final.
 */
export function intervaloDoFiltro(filtro: FiltroDespesa) {
  if (filtro.modo === 'data') {
    return {
      inicio: filtro.data,
      fim: adicionarDias(filtro.data, 1),
    };
  }

  if (filtro.modo === 'periodo') {
    return {
      inicio: filtro.de,
      fim: adicionarDias(filtro.ate, 1),
    };
  }

  const inicio = `${filtro.ano}-${String(filtro.mes).padStart(2, '0')}-01`;

  const proximoMes = new Date(Date.UTC(filtro.ano, filtro.mes, 1));
  const fim = proximoMes.toISOString().slice(0, 10);

  return { inicio, fim };
}

export function useDespesas(filtro: FiltroDespesa) {
  const [itens, setItens] = useState<Despesa[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let cancelado = false;

    const { inicio, fim } = intervaloDoFiltro(filtro);

    listarDespesas(inicio, fim)
      .then((resultado) => {
        if (cancelado) return;

        setItens(resultado.itens);
        setTotal(resultado.total);
        setErroLeitura(false);
      })
      .catch(() => {
        if (cancelado) return;

        setItens([]);
        setTotal(0);
        setErroLeitura(true);
      })
      .finally(() => {
        if (!cancelado) {
          setCarregando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [filtro, versao]);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErroLeitura(false);
    setVersao((atual) => atual + 1);
  }, []);

  return {
    itens,
    total,
    carregando,
    erroLeitura,
    recarregar,
  };
}
