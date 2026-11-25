import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';
import { Campo } from '@/components/receitas/Campo';
import { Segmentado } from '@/components/receitas/Segmentado';
import { centavosParaTexto } from '@/features/receitas/money';
import { formatarBR, mascararData } from '@/features/receitas/dates';
import type {
  ErrosMetaForm,
  FormMetaValores,
  MetaInput,
  MetaTipo,
} from '@/features/metas/types';
import { validarFormularioMeta } from '@/features/metas/validation';

function valoresIniciais(inicial?: MetaInput): FormMetaValores {
  return {
    objetivo: inicial?.objetivo ?? '',
    tipo: inicial?.tipo ?? 'gasto',
    valorAlvo: inicial ? centavosParaTexto(inicial.valorAlvoCentavos) : '',
    prazo: inicial ? formatarBR(inicial.prazo) : '',
  };
}

export interface MetaFormProps {
  titulo: string;
  textoSalvar: string;
  inicial?: MetaInput;
  salvando: boolean;
  erroGeral?: string | null;
  onSalvar: (dados: MetaInput) => void | Promise<void>;
  onCancelar: () => void;
}

/** Formulário único de criação/edição da UC12. */
export function MetaForm({
  titulo,
  textoSalvar,
  inicial,
  salvando,
  erroGeral,
  onSalvar,
  onCancelar,
}: MetaFormProps) {
  const [v, setV] = useState<FormMetaValores>(() => valoresIniciais(inicial));
  const [erros, setErros] = useState<ErrosMetaForm>({});
  const set = <K extends keyof FormMetaValores>(k: K, valor: FormMetaValores[K]) =>
    setV((p) => ({ ...p, [k]: valor }));

  const enviando = useRef(false);
  useEffect(() => {
    if (!salvando) enviando.current = false;
  }, [salvando]);

  function salvar() {
    if (salvando || enviando.current) return;
    const { erros: e, dados } = validarFormularioMeta(v);
    setErros(e);
    if (!dados) return;

    enviando.current = true;
    const resultado = onSalvar(dados);
    if (resultado instanceof Promise) {
      resultado
        .finally(() => {
          enviando.current = false;
        })
        .catch(() => undefined);
    }
  }

  return (
    <View style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Pressable
          onPress={onCancelar}
          disabled={salvando}
          accessibilityLabel="Voltar"
          style={[estilos.voltar, salvando && { opacity: 0.6 }]}
        >
          <Text style={estilos.voltarTexto}>‹</Text>
        </Pressable>
        <Text style={estilos.titulo}>{titulo}</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Campo
          rotulo="Objetivo"
          value={v.objetivo}
          onChangeText={(t) => set('objetivo', t)}
          placeholder="Ex.: Viagem de férias"
          erro={erros.objetivo}
        />

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Tipo</Text>
          <Segmentado<MetaTipo>
            valor={v.tipo}
            onChange={(t) => set('tipo', t)}
            opcoes={[
              { valor: 'gasto', rotulo: 'Gasto' },
              { valor: 'investimento', rotulo: 'Investimento' },
            ]}
          />
          {erros.tipo ? (
            <Text style={estilos.erro} accessibilityRole="alert">
              {erros.tipo}
            </Text>
          ) : null}
        </View>

        <Campo
          rotulo="Valor alvo"
          prefixo="R$"
          value={v.valorAlvo}
          onChangeText={(t) => set('valorAlvo', t)}
          placeholder="0,00"
          keyboardType="decimal-pad"
          erro={erros.valorAlvo}
        />

        <Campo
          rotulo="Prazo"
          value={v.prazo}
          onChangeText={(t) => set('prazo', mascararData(t))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          erro={erros.prazo}
          acao={<Text style={estilos.icone}>🗓</Text>}
        />

        <Text style={estilos.dica}>Salvo primeiro no dispositivo: funciona sem internet.</Text>
        {erroGeral ? (
          <Text style={estilos.erroGeral} accessibilityRole="alert">
            {erroGeral}
          </Text>
        ) : null}
      </ScrollView>

      <View style={estilos.rodape}>
        <Pressable
          onPress={salvar}
          disabled={salvando}
          style={[estilos.salvar, salvando && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={textoSalvar}
        >
          {salvando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={estilos.salvarTexto}>{textoSalvar}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={onCancelar}
          disabled={salvando}
          style={estilos.secundario}
          accessibilityRole="button"
        >
          <Text style={estilos.secundarioTexto}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  voltar: { paddingHorizontal: 10 },
  voltarTexto: { fontSize: 30, color: cores.primaria, fontWeight: '700', lineHeight: 32 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho },
  conteudo: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  bloco: { marginBottom: 14 },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.marinho, marginBottom: 6 },
  icone: { fontSize: 16, color: cores.textoSuave, marginLeft: 8 },
  dica: { fontSize: 12, color: cores.primaria, marginTop: 6 },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
  erroGeral: { color: cores.erro, fontSize: 14, fontWeight: '600', marginTop: 12 },
  rodape: { padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.borda },
  salvar: {
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  salvarTexto: { color: cores.branco, fontWeight: '700', fontSize: 15 },
  secundario: { alignItems: 'center', paddingVertical: 14 },
  secundarioTexto: { color: cores.primaria, fontWeight: '600', fontSize: 14 },
});
