import { useCallback, useState } from 'react';
import { adicionarDias, primeiroDiaDoMes, proximoMes } from './dates';
import { FalhaLeitura, listarReceitas } from './service';
import type { Filtro, Receita } from './types';

export function intervaloDoFiltro(f: Filtro): { inicio: string; fim: string } {
  if (f.modo === 'mes') {
    const p = proximoMes(f.ano, f.mes);
    return { inicio: primeiroDiaDoMes(f.ano, f.mes), fim: primeiroDiaDoMes(p.ano, p.mes) };
  }
  if (f.modo === 'data') return { inicio: f.data, fim: adicionarDias(f.data, 1) };
  return { inicio: f.de, fim: adicionarDias(f.ate, 1) };
}

export function useReceitas(filtro: Filtro) {
  const [itens, setItens] = useState<Receita[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLeitura(false);
    try {
      const { inicio, fim } = intervaloDoFiltro(filtro);
      const r = await listarReceitas(inicio, fim);
      setItens(r.itens);
      setTotal(r.total);
    } catch (e) {
      if (e instanceof FalhaLeitura) setErroLeitura(true);
      else setErroLeitura(true);
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  return { itens, total, carregando, erroLeitura, recarregar: carregar };
}
