import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { cores } from '@/lib/theme';
import { Campo } from './Campo';
import { hojeISO, formatarBR, mascararData } from '@/features/receitas/dates';
import { validarFormulario, type ErrosForm } from '@/features/receitas/validation';
import type { FormValores, ReceitaInput, UnidadeRecorrencia } from '@/features/receitas/types';

export const FORM_VAZIO: FormValores = {
  valor: '',
  data: '',
  titulo: '',
  descricao: '',
  recorrente: false,
  intervalo: '1',
  unidade: 'mes',
  termino: '',
};

interface Props {
  titulo: string;
  textoSalvar: string;
  inicial?: FormValores;
  /** Edição de ocorrência de série: exibe aviso sobre o alcance. */
  emSerie?: boolean;
  salvando: boolean;
  erroGeral?: string | null;
  onSalvar: (dados: ReceitaInput) => void;
  onCancelar: () => void;
}

const UNIDADES: { v: UnidadeRecorrencia; r: string }[] = [
  { v: 'dia', r: 'Dias' },
  { v: 'mes', r: 'Meses' },
  { v: 'ano', r: 'Anos' },
];

/** Formulário único para registrar e editar (A e C). Os dados digitados nunca são limpos em caso de erro. */
export function ReceitaForm({ titulo, textoSalvar, inicial, emSerie, salvando, erroGeral, onSalvar, onCancelar }: Props) {
  const [v, setV] = useState<FormValores>(inicial ?? FORM_VAZIO);
  const [erros, setErros] = useState<ErrosForm>({});
  const set = <K extends keyof FormValores>(k: K, valor: FormValores[K]) => setV((p) => ({ ...p, [k]: valor }));

  function salvar() {
    const { erros: e, dados } = validarFormulario(v, { permitirRecorrencia: true });
    setErros(e);
    if (dados) onSalvar(dados); // EX01: sem dados, nada é gravado e o formulário permanece
  }

  return (
    <View style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Pressable onPress={onCancelar} accessibilityLabel="Voltar" style={estilos.voltar}>
          <Text style={estilos.voltarTexto}>‹</Text>
        </Pressable>
        <Text style={estilos.titulo}>{titulo}</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Campo
          rotulo="Título"
          value={v.titulo}
          onChangeText={(t) => set('titulo', t)}
          placeholder="Ex.: Freela de design"
          erro={erros.titulo}
        />
        <Campo
          rotulo="Valor"
          prefixo="R$"
          value={v.valor}
          onChangeText={(t) => set('valor', t)}
          placeholder="0,00"
          keyboardType="decimal-pad"
          erro={erros.valor}
        />
        <Campo
          rotulo="Data"
          value={v.data}
          onChangeText={(t) => set('data', mascararData(t))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          erro={erros.data}
          acao={
            <Pressable onPress={() => set('data', formatarBR(hojeISO()))} accessibilityRole="button">
              <Text style={estilos.hoje}>Hoje</Text>
            </Pressable>
          }
        />
        <Campo
          rotulo="Descrição (opcional)"
          value={v.descricao}
          onChangeText={(t) => set('descricao', t)}
          placeholder="Ex.: Logo para a empresa júnior"
          multiline
          erro={erros.descricao}
        />

        {emSerie ? (
          <Text style={estilos.nota}>
            Esta receita faz parte de uma série. Alterações na repetição valem ao escolher “Esta e as próximas” ou “Todas”.
          </Text>
        ) : null}
          <View style={estilos.bloco}>
            <View style={estilos.linhaSwitch}>
              <Text style={estilos.rotuloSwitch}>Receita recorrente</Text>
              <Switch
                value={v.recorrente}
                onValueChange={(x) => set('recorrente', x)}
                trackColor={{ true: cores.primaria, false: '#CBD5E1' }}
              />
            </View>
            {v.recorrente ? (
              <View style={estilos.recorrencia}>
                <Campo
                  rotulo="Repetir a cada"
                  value={v.intervalo}
                  onChangeText={(t) => set('intervalo', t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  erro={erros.intervalo}
                />
                <View style={estilos.segmentos}>
                  {UNIDADES.map((u) => (
                    <Pressable
                      key={u.v}
                      onPress={() => set('unidade', u.v)}
                      style={[estilos.segmento, v.unidade === u.v && estilos.segmentoAtivo]}
                      accessibilityRole="button"
                    >
                      <Text style={[estilos.segmentoTexto, v.unidade === u.v && estilos.segmentoTextoAtivo]}>{u.r}</Text>
                    </Pressable>
                  ))}
                </View>
                <Campo
                  rotulo="Data de término (opcional)"
                  value={v.termino}
                  onChangeText={(t) => set('termino', mascararData(t))}
                  placeholder="DD/MM/AAAA"
                  keyboardType="number-pad"
                  erro={erros.termino}
                />
              </View>
            ) : null}
        </View>

        <Text style={estilos.nota}>Salvo primeiro no dispositivo: funciona sem internet.</Text>
        {erroGeral ? (
          <Text style={estilos.erroGeral} accessibilityRole="alert">
            {erroGeral}
          </Text>
        ) : null}
      </ScrollView>

      <View style={estilos.acoes}>
        <Pressable onPress={salvar} disabled={salvando} style={[estilos.salvar, salvando && { opacity: 0.6 }]} accessibilityRole="button">
          {salvando ? <ActivityIndicator color={cores.branco} /> : <Text style={estilos.salvarTexto}>{textoSalvar}</Text>}
        </Pressable>
        <Pressable onPress={onCancelar} disabled={salvando} style={estilos.cancelar} accessibilityRole="button">
          <Text style={estilos.cancelarTexto}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  voltar: { paddingHorizontal: 10 },
  voltarTexto: { fontSize: 32, color: cores.primaria, fontWeight: '700' },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.marinho },
  conteudo: { padding: 20, paddingBottom: 32 },
  hoje: { color: cores.primaria, fontWeight: '700', paddingLeft: 8 },
  bloco: { marginBottom: 8 },
  linhaSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rotuloSwitch: { fontSize: 15, fontWeight: '600', color: cores.marinho },
  recorrencia: { backgroundColor: cores.branco, borderRadius: 14, borderWidth: 1, borderColor: cores.borda, padding: 14 },
  segmentos: { flexDirection: 'row', backgroundColor: cores.claro, borderRadius: 12, padding: 3, marginBottom: 16 },
  segmento: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentoAtivo: { backgroundColor: cores.primaria },
  segmentoTexto: { color: cores.marinho, fontWeight: '600' },
  segmentoTextoAtivo: { color: cores.branco },
  nota: { fontSize: 13, color: cores.textoSuave, marginTop: 8 },
  erroGeral: { color: cores.erro, fontSize: 14, fontWeight: '600', marginTop: 12 },
  acoes: { padding: 20, paddingTop: 8 },
  salvar: { backgroundColor: cores.primaria, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  salvarTexto: { color: cores.branco, fontWeight: '700', fontSize: 16 },
  cancelar: { alignItems: 'center', paddingVertical: 12 },
  cancelarTexto: { color: cores.textoSuave, fontWeight: '600' },
});
