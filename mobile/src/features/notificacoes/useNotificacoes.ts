import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { MSG_NOTIFICACOES } from './mensagens';
import { ESTADO_INICIAL } from './padroes';
import { notificationPermission } from './permissao';
import { notificationPreferences } from './preferencias';
import type { EstadoPermissao, NotificationPermission, NotificationPreferences, TipoAlerta } from './types';

export function useNotificacoes(
  preferencias: NotificationPreferences = notificationPreferences,
  permissao: NotificationPermission = notificationPermission,
) {
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [valores, setValores] = useState<Record<TipoAlerta, boolean>>({ ...ESTADO_INICIAL });
  const [gravando, setGravando] = useState<TipoAlerta | null>(null);
  const [erroGravacao, setErroGravacao] = useState<string | null>(null);
  const [estadoPermissao, setEstadoPermissao] = useState<EstadoPermissao | null>(null);
  const ocupado = useRef(false);
  const montado = useRef(true);
  // Dono da tela (RNF03): leitura e gravação usam sempre o mesmo. A tela é remontada quando a conta muda.
  const dono = useRef(preferencias.donoAtual());

  const recarregar = useCallback(async () => {
    setEstado('carregando');
    try {
      const lidos = await preferencias.listar(dono.current);
      if (!montado.current) return;
      setValores(lidos);
      setEstado('pronto');
    } catch {
      if (montado.current) setEstado('erro'); // EX02
    }
  }, [preferencias]);

  useEffect(() => {
    montado.current = true;
    // Atualizações só nos retornos das promessas (assinatura de sistema externo).
    preferencias
      .listar(dono.current)
      .then((lidos) => {
        if (!montado.current) return;
        setValores(lidos);
        setEstado('pronto');
      })
      .catch(() => {
        if (montado.current) setEstado('erro'); // EX02
      });
    const lerPermissao = () =>
      permissao
        .consultar()
        .then((atual) => {
          if (montado.current) setEstadoPermissao(atual);
        })
        .catch(() => {
          // Sem leitura da permissão, o aviso FA06 só não é exibido.
        });
    void lerPermissao();
    // Ao voltar das configurações do aparelho, o aviso reflete a nova permissão (research R7).
    const assinatura = AppState.addEventListener('change', (s) => {
      if (s === 'active') void lerPermissao();
    });
    return () => {
      montado.current = false;
      assinatura.remove();
    };
  }, [preferencias, permissao]);

  const alternar = useCallback(
    async (tipo: TipoAlerta) => {
      if (ocupado.current) return;
      ocupado.current = true;
      setGravando(tipo);
      const novo = !valores[tipo];
      try {
        if (novo) {
          // Passo 4: pede só na primeira vez; a negação não desfaz a escolha (FA06).
          const resultado = await permissao.solicitar().catch(() => null);
          if (resultado && montado.current) setEstadoPermissao(resultado);
          // A conta pode ter mudado com o diálogo aberto: a escolha não vai para outro dono.
          if (preferencias.donoAtual().uid !== dono.current.uid) return;
        }
        await preferencias.definir(tipo, novo, dono.current); // Passo 5: grava antes de confirmar.
        if (!montado.current) return;
        setValores((atual) => ({ ...atual, [tipo]: novo }));
        setErroGravacao(null);
      } catch {
        if (montado.current) setErroGravacao(MSG_NOTIFICACOES.EX01); // EX01: mantém a escolha anterior.
      } finally {
        ocupado.current = false;
        if (montado.current) setGravando(null);
      }
    },
    [valores, preferencias, permissao],
  );

  const algumLigado = Object.values(valores).some(Boolean);

  return {
    estado,
    valores,
    gravando,
    erroGravacao,
    alternar,
    recarregar,
    mostrarAvisoBloqueio: estadoPermissao === 'negada' && algumLigado,
    abrirConfiguracoes: () => permissao.abrirConfiguracoes(),
  };
}
