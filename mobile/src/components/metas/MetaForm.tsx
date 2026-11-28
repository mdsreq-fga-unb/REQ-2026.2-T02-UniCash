import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconePrototipo } from '@/components/IconePrototipo';
import { cores, raio } from '@/lib/theme';
import { Campo } from '@/components/receitas/Campo';
import { Segmentado } from '@/components/receitas/Segmentado';
import { useCategoriasAtivas } from '@/features/categorias/useCategoriasAtivas';
import { centavosParaTexto } from '@/features/receitas/money';
import { formatarBR, mascararData } from '@/features/receitas/dates';
import type {
  ErrosMetaForm,
  FormMetaValores,
  MetaInput,
  MetaTipo,
} from '@/features/metas/types';
import { MSG_META, validarFormularioMeta } from '@/features/metas/validation';

function valoresIniciais(inicial?: MetaInput): FormMetaValores {
  return {
    objetivo: inicial?.objetivo ?? '',
    tipo: inicial?.tipo ?? 'gasto',
    valorAlvo: inicial ? centavosParaTexto(inicial.valorAlvoCentavos) : '',
    prazo: inicial ? formatarBR(inicial.prazo) : '',
    categoriaId: inicial?.categoriaId ?? '',
    valorAcumulado:
      inicial?.valorAcumuladoCentavos != null
        ? centavosParaTexto(inicial.valorAcumuladoCentavos)
        : '',
  };
}

export interface MetaFormProps {
  titulo: string;
  textoSalvar: string;
  inicial?: MetaInput;
  /** Em edição, o tipo é exibido mas não pode ser alterado. */
  tipoImutavel?: boolean;
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
  tipoImutavel = false,
  salvando,
  erroGeral,
  onSalvar,
  onCancelar,
}: MetaFormProps) {
  const [v, setV] = useState<FormMetaValores>(() => valoresIniciais(inicial));
  const [erros, setErros] = useState<ErrosMetaForm>({});
  const set = <K extends keyof FormMetaValores>(k: K, valor: FormMetaValores[K]) =>
    setV((p) => ({ ...p, [k]: valor }));

  const {
    itens: categorias,
    carregando: carregandoCategorias,
    erro: erroCategorias,
    recarregar: recarregarCategorias,
  } = useCategoriasAtivas();

  const categoriaInicial = inicial?.categoriaId ?? '';
  const categoriaInicialAusente =
    inicial?.tipo === 'gasto' &&
    (!categoriaInicial ||
      (!carregandoCategorias && !categorias.some((c) => c.id === categoriaInicial)));

  const enviando = useRef(false);
  useEffect(() => {
    if (!salvando) enviando.current = false;
  }, [salvando]);

  function salvar() {
    if (salvando || enviando.current) return;
    const { erros: e, dados } = validarFormularioMeta(v, {
      tipoAtual: tipoImutavel ? inicial?.tipo : undefined,
    });

    if (
      v.tipo === 'gasto' &&
      !carregandoCategorias &&
      v.categoriaId !== '' &&
      !categorias.some((c) => c.id === v.categoriaId)
    ) {
      e.categoriaId = MSG_META.categoriaIndisponivel;
    }

    setErros(e);
    if (!dados || e.categoriaId) return;

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
          <IconePrototipo nome="voltar" tamanho={14} />
        </Pressable>
        <Text style={estilos.titulo}>{titulo}</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Campo
          compacto
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
            onChange={(t) => {
              if (!tipoImutavel) set('tipo', t);
            }}
            opcoes={[
              { valor: 'gasto', rotulo: 'Gasto', inerte: tipoImutavel },
              { valor: 'investimento', rotulo: 'Investimento', inerte: tipoImutavel },
            ]}
          />
          {tipoImutavel ? (
            <Text style={estilos.dica}>O tipo não pode ser alterado após a criação.</Text>
          ) : null}
          {erros.tipo ? (
            <Text style={estilos.erro} accessibilityRole="alert">
              {erros.tipo}
            </Text>
          ) : null}
        </View>

        <Campo
          compacto
          rotulo="Valor alvo"
          prefixo={v.tipo === 'gasto' ? 'R$ / mês' : 'R$'}
          value={v.valorAlvo}
          onChangeText={(t) => set('valorAlvo', t)}
          placeholder="0,00"
          keyboardType="decimal-pad"
          erro={erros.valorAlvo}
        />

        {v.tipo === 'gasto' ? (
          <View style={estilos.bloco}>
            <Text style={estilos.rotulo}>Categoria</Text>

            {carregandoCategorias ? (
              <ActivityIndicator color={cores.primaria} style={estilos.carregandoCategorias} />
            ) : null}

            {erroCategorias ? (
              <View style={estilos.avisoCategorias}>
                <Text style={estilos.erro} accessibilityRole="alert">
                  {MSG_META.falhaCategorias}
                </Text>
                <Pressable
                  onPress={recarregarCategorias}
                  accessibilityRole="button"
                  style={estilos.tentarCategorias}
                >
                  <Text style={estilos.dica}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}

            {categoriaInicialAusente ? (
              <Text style={estilos.avisoCategoriaAtual}>
                {MSG_META.categoriaRemovida}
              </Text>
            ) : null}

            <View style={estilos.categoriaOpcoes} accessibilityRole="radiogroup">
              {categorias.map((c) => {
                const ativa = v.categoriaId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => set('categoriaId', c.id)}
                    style={[estilos.categoriaChip, ativa && estilos.categoriaChipAtivo]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativa }}
                  >
                    <Text
                      style={[
                        estilos.categoriaChipTexto,
                        ativa && estilos.categoriaChipTextoAtivo,
                      ]}
                    >
                      {c.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!carregandoCategorias && categorias.length === 0 && !erroCategorias ? (
              <Text style={estilos.avisoCategoriaAtual}>
                Nenhuma categoria ativa. Cadastre uma categoria antes de criar a meta.
              </Text>
            ) : null}
            {erros.categoriaId ? (
              <Text style={estilos.erro} accessibilityRole="alert">
                {erros.categoriaId}
              </Text>
            ) : null}
          </View>
        ) : (
          <Campo
            compacto
            rotulo="Valor acumulado (opcional)"
            prefixo="R$"
            value={v.valorAcumulado}
            onChangeText={(t) => set('valorAcumulado', t)}
            placeholder="Não informado"
            keyboardType="decimal-pad"
            erro={erros.valorAcumulado}
            abaixo={
              <Text style={estilos.dica}>
                Valor informado pelo usuário. Deixe vazio se ainda não souber.
              </Text>
            }
          />
        )}

        <Campo
          compacto
          rotulo="Prazo"
          value={v.prazo}
          onChangeText={(t) => set('prazo', mascararData(t))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          erro={erros.prazo}
          acao={<IconePrototipo nome="calendario" tamanho={14} />}
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
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 48, gap: 10 },
  voltar: { width: 28, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho },
  conteudo: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  bloco: { marginBottom: 14 },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.marinho, marginBottom: 6 },
  dica: { fontSize: 12, color: cores.primaria, marginTop: 6 },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
  erroGeral: { color: cores.erro, fontSize: 14, fontWeight: '600', marginTop: 12 },
  categoriaOpcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  carregandoCategorias: { alignSelf: 'flex-start', marginBottom: 8 },
  avisoCategorias: { marginBottom: 8 },
  tentarCategorias: { alignSelf: 'flex-start', paddingVertical: 4 },
  avisoCategoriaAtual: { fontSize: 12, color: cores.erro, marginBottom: 8, lineHeight: 17 },
  categoriaChip: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.campo,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: cores.branco,
  },
  categoriaChipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  categoriaChipTexto: { fontSize: 13, color: cores.marinho },
  categoriaChipTextoAtivo: { color: cores.branco, fontWeight: '600' },
  rodape: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: cores.borda },
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
