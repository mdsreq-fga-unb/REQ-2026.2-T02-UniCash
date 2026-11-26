import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { consultarConquistas } from './consulta';
import type { ResumoConquistas } from './types';

export type EstadoConquistas =
  | { status: 'carregando' }
  | { status: 'pronto'; resumo: ResumoConquistas }
  | { status: 'erro' };

/** Fluxo B do UC13: lê ao ganhar foco, para refletir lançamentos alterados em outras telas (FA08). */
export function useConquistas() {
  const [estado, setEstado] = useState<EstadoConquistas>({ status: 'carregando' });

  const recarregar = useCallback(async () => {
    try {
      setEstado({ status: 'pronto', resumo: await consultarConquistas() });
    } catch {
      setEstado({ status: 'erro' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recarregar();
    }, [recarregar]),
  );

  return { estado, recarregar };
}
