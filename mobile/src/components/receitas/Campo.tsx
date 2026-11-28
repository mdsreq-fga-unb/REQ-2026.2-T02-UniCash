import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { cores, raio } from '@/lib/theme';

interface Props extends TextInputProps {
  rotulo: string;
  compacto?: boolean;
  erro?: string;
  prefixo?: string;
  /** Elemento à direita, dentro do campo (ex.: ícone de calendário). */
  acao?: React.ReactNode;
  /** Elemento logo abaixo do campo (ex.: atalho "Hoje"). */
  abaixo?: React.ReactNode;
}

export function Campo({ rotulo, erro, prefixo, acao, abaixo, compacto, style, ...rest }: Props) {
  return (
    <View style={[estilos.bloco, compacto && estilos.blocoCompacto]}>
      <Text style={[estilos.rotulo, compacto && estilos.rotuloCompacto]}>{rotulo}</Text>
      <View style={[estilos.entrada, compacto && estilos.entradaCompacta, erro ? estilos.entradaErro : null]}>
        {prefixo ? <Text style={[estilos.prefixo, compacto && estilos.prefixoCompacto]}>{prefixo}</Text> : null}
        <TextInput
          style={[estilos.input, compacto && estilos.inputCompacto, style]}
          placeholderTextColor={compacto ? cores.primaria : "#94A3B8"}
          accessibilityLabel={rotulo}
          {...rest}
        />
        {acao}
      </View>
      {abaixo}
      {erro ? (
        <Text style={estilos.erro} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { marginBottom: 14 },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.marinho, marginBottom: 6 },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.campo,
    backgroundColor: cores.branco,
    paddingHorizontal: 14,
  },
  entradaErro: { borderColor: cores.erro },
  prefixo: { fontSize: 15, color: cores.textoSuave, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: cores.marinho, paddingVertical: 12 },
  blocoCompacto: { marginBottom: 12 },
  rotuloCompacto: { fontSize: 12, fontWeight: '500', color: cores.primaria, marginBottom: 4 },
  entradaCompacta: { paddingHorizontal: 12, minHeight: 44 },
  prefixoCompacto: { color: cores.primaria },
  inputCompacto: { paddingVertical: 10 },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
});
