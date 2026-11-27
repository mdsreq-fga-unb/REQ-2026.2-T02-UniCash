import { useNotificacoesDeLimite } from '@/features/alertas/useNotificacoesDeLimite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { BancoPronto } from '@/db/Preparacao';
import { getDb } from '@/db/database';
import { iniciarConta } from '@/features/conta';
import { retomarLimpezasDeConta } from '@/features/conta/remocao';
import { resetarContinuidadeSemConta } from '@/features/conta/onboarding';
import { semearCategoriasPadrao } from '@/features/categorias/service';
import { completarRecorrencias } from '@/features/receitas/service';
import { completarRecorrenciasDespesas } from '@/features/despesas/service';
import { restaurarDaNuvem, sincronizarEmSegundoPlano, sincronizarPendentes } from '@/features/receitas/sync';
import { observarConexaoSaldoInicial } from '@/features/saldoInicial/sync';
import { avisarBaseAtualizada, ouvirBaseAtualizada } from '@/lib/baseAtualizada';
import { avaliarEEmitir } from '@/features/conquistas/emissao';
import { aoMudarLancamentos, aoVirarMes } from '@/features/conquistas/gatilhos';
import { iniciarSincronizacaoAutomatica } from '@/features/sincronizacao/service';
import { cores, raio } from '@/lib/theme';

iniciarConta();
resetarContinuidadeSemConta();

// RF46/RF58: sem handler, notificações locais não aparecem com o app aberto (doc v58).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** UC13: tocar na notificação de selo abre a rota indicada nela (Conquistas). */
let ultimaRespostaTratada: string | null = null;
function abrirRotaDaNotificacao(resposta: Notifications.NotificationResponse | null) {
  if (!resposta) return;
  // A resposta pode chegar pelo ouvinte e por getLastNotificationResponse: tratar uma vez só.
  const id = resposta.notification.request.identifier;
  if (id === ultimaRespostaTratada) return;
  ultimaRespostaTratada = id;
  if (resposta.notification.request.content.data?.rota === '/conquistas') router.push('/conquistas');
}

type EstadoPreparacao = 'preparando' | 'pronto' | 'erro';

/**
 * Rotas que leem ou gravam no SQLite. Só podem montar depois que a migração e a
 * semeadura/mapeamento de categorias terminarem.
 */
const TELAS_COM_BANCO = [
  'preferencias-alertas',
  'configuracoes-financeiras',
  'saldo-inicial',
  'categorias/index',
  'categorias/nova',
  'categorias/[id]/editar',
  'despesas/index',
  'despesas/nova',
  'despesas/[id]/index',
  'despesas/[id]/editar',
  'sincronizacao',
  'metas/index',
  'metas/nova',
  'metas/[id]/index',
  'metas/[id]/editar',
  'receitas/index',
  'receitas/nova',
  'receitas/[id]/index',
  'receitas/[id]/editar',
  'conquistas/index',
  'conquistas/[chave]',
] as const;

// O Stack é montado desde a primeira renderização; a âncora continua sendo a Home.
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  const [estado, setEstado] = useState<EstadoPreparacao>('preparando');
  useNotificacoesDeLimite(estado === 'pronto');
  const emAndamento = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const preparar = useCallback(() => {
    if (emAndamento.current) return;

    emAndamento.current = true;
    if (montado.current) setEstado('preparando');

    void (async () => {
      try {
        await retomarLimpezasDeConta();
        await getDb();
        await semearCategoriasPadrao();

        if (montado.current) {
          setEstado('pronto');
          // A Home fica montada atrás da camada durante a preparação; ao liberar o guard e
          // depois das rotinas (recorrências, restauração, sincronização), ela recalcula.
          avisarBaseAtualizada();
          void rotinasPosInicializacao().then(avisarBaseAtualizada);
        }
      } catch (erro) {
        console.warn('Falha na preparação inicial do banco local.', erro);
        if (montado.current) setEstado('erro');
      } finally {
        emAndamento.current = false;
      }
    })();
  }, []);

  useEffect(() => {
    preparar();
  }, [preparar]);

  useEffect(() => {
    if (estado !== 'pronto') return;
    const pararSincronizacao = iniciarSincronizacaoAutomatica();
    const pararObservacaoSaldo = observarConexaoSaldoInicial(() => sincronizarEmSegundoPlano(true));
    return () => {
      pararObservacaoSaldo();
      pararSincronizacao();
    };
  }, [estado]);

  // UC13 (research R5): avalia conquistas ao liberar a base, ao voltar ao app, após mudanças em
  // lançamentos ou metas, na virada do mês e após as rotinas de inicialização, para notificar selos
  // novos na mesma sessão.
  useEffect(() => {
    if (estado !== 'pronto') return;
    const avaliar = () => void avaliarEEmitir();
    avaliar();
    const avaliarESincronizar = () => void avaliarEEmitir().then(() => sincronizarEmSegundoPlano(true));
    const pararLancamentos = aoMudarLancamentos(avaliarESincronizar);
    const pararBase = ouvirBaseAtualizada(avaliar);
    const pararVirada = aoVirarMes(avaliarESincronizar);
    const aplicativo = AppState.addEventListener('change', (e) => {
      if (e === 'active') avaliar();
    });
    abrirRotaDaNotificacao(Notifications.getLastNotificationResponse());
    const toque = Notifications.addNotificationResponseReceivedListener(abrirRotaDaNotificacao);
    return () => {
      pararLancamentos();
      pararBase();
      pararVirada();
      aplicativo.remove();
      toque.remove();
    };
  }, [estado]);

  return (
    <View style={estilos.raiz}>
      {/* O Stack nunca é desmontado; Stack.Protected é o gate das rotas com SQLite. */}
      <BancoPronto.Provider value={estado === 'pronto'}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Protected guard={estado === 'pronto'} redirectTo="/">
            <Stack.Screen name="tutorial" options={{ gestureEnabled: false }} />
            {TELAS_COM_BANCO.map((nome) => (
              <Stack.Screen key={nome} name={nome} />
            ))}
          </Stack.Protected>
        </Stack>
      </BancoPronto.Provider>

      {estado !== 'pronto' ? (
        <View style={estilos.gate} accessibilityViewIsModal>
          {estado === 'preparando' ? (
            <>
              <ActivityIndicator color={cores.primaria} />
              <Text style={estilos.texto}>Preparando seus dados locais…</Text>
            </>
          ) : (
            <>
              <Text style={estilos.erro}>Não foi possível preparar os dados locais.</Text>
              <Pressable
                onPress={preparar}
                style={estilos.tentar}
                accessibilityRole="button"
                accessibilityLabel="Tentar novamente"
              >
                <Text style={estilos.tentarTexto}>Tentar novamente</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

/** Rotinas posteriores à preparação: não bloqueiam a navegação nem derrubam o app. */
async function rotinasPosInicializacao() {
  try {
    await completarRecorrencias();
  } catch (erro) {
    console.warn('Falha ao completar as recorrências de receitas.', erro);
  }

  try {
    await completarRecorrenciasDespesas();
  } catch (erro) {
    console.warn('Falha ao completar as recorrências de despesas.', erro);
  }

  try {
    await restaurarDaNuvem();
  } catch (erro) {
    // Sem conta, sem rede ou restauração adiada: o app segue offline-first.
    console.warn('Falha ao restaurar os dados da nuvem.', erro);
  }

  try {
    await sincronizarPendentes();
  } catch (erro) {
    console.warn('Falha ao sincronizar as pendências.', erro);
  }
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  gate: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    elevation: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
    padding: 24,
    gap: 16,
  },
  texto: { color: cores.textoSuave, fontSize: 15, textAlign: 'center' },
  erro: { color: cores.erro, fontSize: 15, textAlign: 'center' },
  tentar: {
    borderWidth: 1.5,
    borderColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tentarTexto: { color: cores.primaria, fontWeight: '700' },
});
