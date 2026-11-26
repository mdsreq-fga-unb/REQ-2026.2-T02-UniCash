import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';
import { avisarAlertasPendentes } from '@/features/alertas/evento';
import { definirPreferenciaAlerta, lerPreferenciasAlertas, type TipoAlerta } from '@/features/alertas/service';
import { cores } from '@/lib/theme';

const ROTULOS = {
  aproximacao: 'Alertas de aproximação',
  ultrapassagem: 'Alertas de ultrapassagem',
} satisfies Record<TipoAlerta, string>;

export default function PreferenciasAlertas() {
  const [preferencias, setPreferencias] = useState<Record<TipoAlerta, boolean> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  function carregar() {
    void getDb().then(lerPreferenciasAlertas).then((preferencia) => {
      setPreferencias(preferencia);
      setErro('');
    }).catch(() => {
      setErro('Não foi possível consultar a preferência de alertas.');
    });
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alterar(tipo: TipoAlerta, valor: boolean) {
    setSalvando(true);
    setErro('');
    try {
      await definirPreferenciaAlerta(tipo, valor);
      setPreferencias((atual) => atual && { ...atual, [tipo]: valor });
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
      {preferencias ? (Object.keys(ROTULOS) as TipoAlerta[]).map((tipo) => (
        <View style={estilos.linha} key={tipo}>
          <Text style={estilos.rotulo}>{ROTULOS[tipo]}</Text>
          <Switch
            accessibilityLabel={ROTULOS[tipo]}
            value={preferencias[tipo]}
            disabled={salvando}
            onValueChange={(valor) => void alterar(tipo, valor)}
          />
        </View>
      )) : !erro ? <Text style={estilos.rotulo}>Carregando preferência…</Text> : null}
      {erro ? <Text style={estilos.erro} accessibilityRole="alert">{erro}</Text> : null}
      {preferencias === null && erro ? (
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
