import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';
import { avisarAlertasPendentes } from '@/features/alertas/evento';
import { alertasAtivos, definirAlertasAtivos } from '@/features/alertas/service';
import { cores } from '@/lib/theme';

export default function PreferenciasAlertas() {
  const [ativo, setAtivo] = useState<boolean | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  function carregar() {
    void getDb().then(alertasAtivos).then((preferencia) => {
      setAtivo(preferencia);
      setErro('');
    }).catch(() => {
      setErro('Não foi possível consultar a preferência de alertas.');
    });
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alterar(valor: boolean) {
    setSalvando(true);
    setErro('');
    try {
      await definirAlertasAtivos(valor);
      setAtivo(valor);
      if (valor) avisarAlertasPendentes();
    } catch {
      setErro('Não foi possível salvar a preferência de alertas.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={estilos.acao}>
        <Text style={estilos.link}>Voltar</Text>
      </Pressable>
      <Text style={estilos.titulo} accessibilityRole="header">Preferências de alertas</Text>
      {ativo !== null ? (
        <View style={estilos.linha}>
          <Text style={estilos.rotulo}>Alertas de limites de gastos</Text>
          <Switch
            accessibilityLabel="Alertas de limites de gastos"
            value={ativo}
            disabled={salvando}
            onValueChange={(valor) => void alterar(valor)}
          />
        </View>
      ) : !erro ? <Text style={estilos.rotulo}>Carregando preferência…</Text> : null}
      {erro ? <Text style={estilos.erro} accessibilityRole="alert">{erro}</Text> : null}
      {ativo === null && erro ? (
        <Pressable onPress={carregar} accessibilityRole="button" style={estilos.acao}>
          <Text style={estilos.link}>Tentar novamente</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: 24, gap: 16 },
  acao: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  link: { color: cores.primaria, fontWeight: '700' },
  titulo: { fontSize: 24, fontWeight: '700', color: cores.marinho },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rotulo: { flexShrink: 1, color: cores.marinho, fontSize: 16 },
  erro: { color: cores.erro },
});
