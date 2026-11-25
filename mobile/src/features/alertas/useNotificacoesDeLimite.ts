import { useEffect } from 'react';
import { AppState } from 'react-native';

import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { ouvirAlertasPendentes } from './evento';
import { emitirAlertasPendentes } from './notificacoes';
import { notificadorLocal } from './notificador';

export function useNotificacoesDeLimite(pronto: boolean) {
  useEffect(() => {
    if (!pronto) return;
    let emAndamento = false;
    let repetir = false;
    let desmontado = false;

    function processar() {
      if (desmontado) return;
      if (emAndamento) {
        repetir = true;
        return;
      }
      emAndamento = true;
      void emitirAlertasPendentes(notificadorLocal)
        .then((emitiu) => {
          if (emitiu) sincronizarEmSegundoPlano();
        })
        .catch((erro) => {
          console.warn('Não foi possível exibir uma notificação de limite.', erro);
        })
        .finally(() => {
          emAndamento = false;
          if (repetir) {
            repetir = false;
            processar();
          }
        });
    }

    const removerOuvinte = ouvirAlertasPendentes(processar);
    const appState = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        processar();
        sincronizarEmSegundoPlano();
      }
    });
    processar();

    return () => {
      desmontado = true;
      removerOuvinte();
      appState.remove();
    };
  }, [pronto]);
}
