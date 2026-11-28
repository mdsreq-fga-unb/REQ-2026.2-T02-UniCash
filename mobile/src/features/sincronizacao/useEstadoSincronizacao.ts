import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { EstadoSincronizacao } from './contrato';
import { syncService } from './service';

export function useEstadoSincronizacao(habilitado = true) {
  const [estado, setEstado] = useState<EstadoSincronizacao | null>(null);
  const [falhou, setFalhou] = useState(false);
  const recarregar = useRef<(() => void) | null>(null);

  useFocusEffect(useCallback(() => {
    if (!habilitado) return;
    let ativo = true;
    let ultimoPedido = 0;

    function consultar() {
      const pedido = ++ultimoPedido;
      void syncService.consultar().then(
        ({ estado: atual }) => {
          if (!ativo || pedido !== ultimoPedido) return;
          setEstado(atual);
          setFalhou(false);
        },
        () => {
          if (!ativo || pedido !== ultimoPedido) return;
          setEstado(null);
          setFalhou(true);
        },
      );
    }

    recarregar.current = consultar;
    const cancelar = syncService.assinar(consultar);
    consultar();
    return () => {
      ativo = false;
      recarregar.current = null;
      cancelar();
    };
  }, [habilitado]));

  return { estado, falhou, recarregar: () => recarregar.current?.() };
}
