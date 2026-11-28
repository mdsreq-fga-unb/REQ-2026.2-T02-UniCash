import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MSG_NOTIFICACOES, ROTULOS_ALERTA } from '@/features/notificacoes/mensagens';
import { TIPOS_ALERTA, type NotificationPermission, type NotificationPreferences } from '@/features/notificacoes/types';
import { useNotificacoes } from '@/features/notificacoes/useNotificacoes';
import { cores, raio } from '@/lib/theme';
import { ItemInterruptor } from './ItemInterruptor';

interface Props {
  preferencias?: NotificationPreferences;
  permissao?: NotificationPermission;
}

/** UC14: seção "Notificações" da tela de Perfil (D25). */
export function SecaoNotificacoes({ preferencias, permissao }: Props) {
  const n = useNotificacoes(preferencias, permissao);

  return (
    <View style={estilos.secao}>
      <Text style={estilos.titulo} accessibilityRole="header">{MSG_NOTIFICACOES.titulo}</Text>

      {n.estado === 'carregando' && <ActivityIndicator color={cores.primaria} />}

      {n.estado === 'erro' && (
        <View>
          <Text style={estilos.erro}>{MSG_NOTIFICACOES.EX02}</Text>
          <Pressable onPress={() => void n.recarregar()} accessibilityRole="button" style={estilos.botao}>
            <Text style={estilos.textoBotao}>{MSG_NOTIFICACOES.tentarNovamente}</Text>
          </Pressable>
        </View>
      )}

      {n.estado === 'pronto' && (
        <>
          {TIPOS_ALERTA.map((tipo) => (
            <ItemInterruptor
              key={tipo}
              testID={`interruptor-${tipo}`}
              rotulo={ROTULOS_ALERTA[tipo]}
              valor={n.valores[tipo]}
              desabilitado={n.gravando !== null}
              onAlternar={() => void n.alternar(tipo)}
            />
          ))}
          {n.erroGravacao && <Text style={estilos.erro} accessibilityRole="alert">{n.erroGravacao}</Text>}
          {n.mostrarAvisoBloqueio && (
            <View style={estilos.aviso}>
              <Text style={estilos.textoAviso}>{MSG_NOTIFICACOES.FA06}</Text>
              <Pressable onPress={() => void n.abrirConfiguracoes()} accessibilityRole="button" style={estilos.botao}>
                <Text style={estilos.textoBotao}>{MSG_NOTIFICACOES.abrirConfiguracoes}</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: { gap: 2 },
  titulo: { fontSize: 16, fontWeight: '600', color: cores.marinho },
  erro: { color: cores.erro, fontSize: 14, marginTop: 8 },
  aviso: { backgroundColor: cores.fundoSuave, borderColor: cores.borda, borderWidth: 1, borderRadius: raio.cartao, padding: 12, marginTop: 8, gap: 8 },
  textoAviso: { color: cores.marinho, fontSize: 14 },
  botao: { borderColor: cores.primaria, borderWidth: 1, borderRadius: raio.botao, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  textoBotao: { color: cores.primaria, fontWeight: '600' },
});
