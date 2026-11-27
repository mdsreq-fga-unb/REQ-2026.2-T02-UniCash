import { useCallback, useEffect, useRef, useState } from 'react';
import { ouvirBaseAtualizada } from '@/lib/baseAtualizada';
import { calcularEvolucao, type EvolucaoMensal } from './service';

/**
 * Calcula a série do gráfico da janela que termina em (fimAno, fimMes). `recarregar` refaz o
 * cálculo (passos 3 e 6, FA06, EX01); respostas atrasadas de outra janela são descartadas.
 */
export function useEvolucao(fimAno: number, fimMes: number) {
  const [evolucao, setEvolucao] = useState<EvolucaoMensal | null>(null);
  const [falhou, setFalhou] = useState(false);
  const pedido = useRef(0);

  const recarregar = useCallback(async () => {
    const meu = ++pedido.current;
    setFalhou(false);
    try {
      const r = await calcularEvolucao(fimAno, fimMes);
      if (meu === pedido.current) setEvolucao(r);
    } catch {
      if (meu === pedido.current) {
        setEvolucao(null);
        setFalhou(true);
      }
    }
  }, [fimAno, fimMes]);

  // Mesmo sinal do resumo: recalcula quando a preparação do app ou a restauração terminam.
  useEffect(() => ouvirBaseAtualizada(() => void recarregar()), [recarregar]);

  return { evolucao, falhou, recarregar };
}
