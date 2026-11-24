import { useCallback, useEffect, useRef, useState } from 'react';
import { ouvirBaseAtualizada } from '@/lib/baseAtualizada';
import { calcularResumo, type ResumoMensal } from './service';

/** Calcula o resumo do mês informado; `recarregar` refaz o cálculo (passo 6, FA05, EX01). */
export function useResumo(ano: number, mes: number) {
  const [resumo, setResumo] = useState<ResumoMensal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  // Ao trocar de mês rápido, só o último cálculo pedido é aplicado.
  const pedido = useRef(0);

  const recarregar = useCallback(async () => {
    const meu = ++pedido.current;
    setCarregando(true);
    setFalhou(false);
    try {
      const r = await calcularResumo(ano, mes);
      if (meu === pedido.current) setResumo(r);
    } catch {
      if (meu === pedido.current) {
        setResumo(null);
        setFalhou(true);
      }
    } finally {
      if (meu === pedido.current) setCarregando(false);
    }
  }, [ano, mes]);

  // Recalcula quando a preparação do app termina ou a base muda por fora da tela
  // (ex.: restauração da nuvem), sem depender de sair da tela e voltar.
  useEffect(() => ouvirBaseAtualizada(() => void recarregar()), [recarregar]);

  return { resumo, carregando, falhou, recarregar };
}
