
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IconePrototipo } from '@/components/IconePrototipo';
import { cores, raio } from '@/lib/theme';
import { Campo } from '../receitas/Campo';
import { Segmentado } from '../receitas/Segmentado';
import {
  hojeISO,
  formatarBR,
  mascararData,
  parseBR,
} from '@/features/receitas/dates';
import { formatarBRL, mascararValor, parseValor } from '@/features/receitas/money';
import {
  validarFormularioDespesa,
  type ErrosFormDespesa,
} from '@/features/despesas/validation';
import type {
  DespesaInput,
  FormValoresDespesa,
  UnidadeRecorrencia,
} from '@/features/despesas/types';

import { useCategoriasAtivas } from '@/features/categorias/useCategoriasAtivas';
import { ROTULO_SEM_CATEGORIA } from '@/features/despesas/categorias';

const FORM_DESPESA_VAZIO: FormValoresDespesa = {
  valor: '',
  data: '',
  titulo: '',
  descricao: '',
  categoriaId: '',
  fixaOuVariavel: '',
  essencial: '',
  recorrente: false,
  intervalo: '1',
  unidade: 'mes',
  termino: '',
};

interface Props {
  titulo: string;
  textoSalvar: string;
  inicial?: FormValoresDespesa;
  emSerie?: boolean;
  salvando: boolean;
  erroGeral?: string | null;
  onSalvar: (dados: DespesaInput) => void;
  onCancelar: () => void;
  textoCancelar?: string;
  onExcluir?: () => void;
  /** Se informado (cadastro novo), tocar em "Receita" abre o formulário de receita. Na edição fica inerte. */
  onTrocarTipo?: () => void;
}

const UNIDADES: {
  valor: UnidadeRecorrencia;
  rotulo: string;
  varios: string;
}[] = [
  { valor: 'dia', rotulo: 'Dias', varios: 'dias' },
  { valor: 'mes', rotulo: 'Meses', varios: 'meses' },
  { valor: 'ano', rotulo: 'Anos', varios: 'anos' },
];

function resumoRepeticao(v: FormValoresDespesa): string {
  if (!v.recorrente) return 'Não se repete';

  const n = Number(v.intervalo);
  if (n === 1) {
    return v.unidade === 'mes' ? 'Mensal' : v.unidade === 'ano' ? 'Anual' : 'Diária';
  }

  const unidade = UNIDADES.find((item) => item.valor === v.unidade)!;
  return `A cada ${v.intervalo || '?'} ${unidade.varios}`;
}

export function DespesaForm({
  titulo,
  textoSalvar,
  inicial,
  emSerie,
  salvando,
  erroGeral,
  onSalvar,
  onCancelar,
  textoCancelar = 'Cancelar',
  onExcluir,
  onTrocarTipo,
}: Props) {
  const [v, setV] = useState<FormValoresDespesa>(
    () => inicial ?? { ...FORM_DESPESA_VAZIO, data: formatarBR(hojeISO()) },
  );
  const [erros, setErros] = useState<ErrosFormDespesa>({});
  const [seletor, setSeletor] = useState<'repeticao' | 'personalizar' | 'termino' | 'categoria' | null>(null);

  const {
    itens: categorias,
    carregando: carregandoCategorias,
    erro: erroCategorias,
    recarregar: recarregarCategorias,
  } = useCategoriasAtivas();

  const categoriaInicial = inicial?.categoriaId ?? '';
  const categoriaInicialForaDaLista =
    !!categoriaInicial &&
    !categorias.some((c) => c.id === categoriaInicial) &&
    (!carregandoCategorias || categorias.length > 0);
  const categoriaAtualPreservada =
    categoriaInicialForaDaLista && v.categoriaId === categoriaInicial;

  const opcoesCategoria = [
    { id: '', nome: ROTULO_SEM_CATEGORIA },
    ...(categoriaAtualPreservada
      ? [{ id: categoriaInicial, nome: 'Categoria atual (indisponível)' }]
      : []),
    ...categorias.map(({ id, nome }) => ({ id, nome })),
  ];

  function set<K extends keyof FormValoresDespesa>(
    campo: K,
    valor: FormValoresDespesa[K],
  ) {
    setV((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function salvar() {
    const resultado = validarFormularioDespesa(v, {
      permitirRecorrencia: true,
    });

    setErros(resultado.erros);

    if (resultado.dados) {
      onSalvar(resultado.dados);
    }
  }

  const categoriaSelecionada = opcoesCategoria.find(({ id }) => id === v.categoriaId)?.nome;
  const repeticao = resumoRepeticao(v);
  const dia = parseBR(v.data) ? Number(v.data.slice(0, 2)) : 0;
  const repeticaoMensal = v.unidade === 'mes' && Number(v.intervalo) === 1 && dia > 0;
  const regra = repeticaoMensal ? `todo mês, no dia ${dia}` : repeticao.toLowerCase();
  const valor = parseValor(v.valor);

  function escolherRepeticao(unidade: UnidadeRecorrencia | null) {
    setV((anterior) => ({
      ...anterior,
      recorrente: unidade !== null,
      unidade: unidade ?? 'mes',
      intervalo: '1',
      termino: unidade ? anterior.termino : '',
    }));
    setErros((anteriores) => ({ ...anteriores, intervalo: undefined, termino: undefined }));
    setSeletor(null);
  }

  return (
    <View style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Pressable
          onPress={onCancelar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={estilos.voltar}
        >
          <IconePrototipo nome="voltar" tamanho={16} />
        </Pressable>

        <Text accessibilityRole="header" style={estilos.titulo}>{titulo}</Text>
      </View>

      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.bloco}>
          <Segmentado
            variante="compacto"
            valor="despesa"
            opcoes={[
              { valor: 'despesa', rotulo: 'Despesa' },
              { valor: 'receita', rotulo: 'Receita', inerte: !onTrocarTipo },
            ]}
            onChange={(tipo) => {
              if (tipo === 'receita') onTrocarTipo?.();
            }}
          />
        </View>

        <Campo
          compacto
          rotulo="Título"
          value={v.titulo}
          onChangeText={(texto) => set('titulo', texto)}
          placeholder="Ex.: Conta de energia"
          erro={erros.titulo}
        />

        <Campo
          compacto
          rotulo="Valor"
          prefixo="R$"
          value={v.valor}
          onChangeText={(texto) => set('valor', mascararValor(texto))}
          placeholder="0,00"
          keyboardType="decimal-pad"
          erro={erros.valor}
        />

        <Campo
          compacto
          rotulo={v.recorrente ? "Data inicial" : "Data"}
          value={v.data}
          onChangeText={(texto) => set('data', mascararData(texto))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          erro={erros.data}
          acao={<IconePrototipo nome="calendario" tamanho={16} />}
          abaixo={v.recorrente ? (
            <Text style={estilos.dica}>Data da primeira ocorrência.</Text>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => set('data', formatarBR(hojeISO()))}
              style={estilos.hoje}>
              <Text style={estilos.dica}>Hoje</Text>
            </Pressable>
          )}
        />

        <Campo
          compacto
          rotulo={v.recorrente ? "Descrição" : "Descrição (opcional)"}
          value={v.descricao}
          onChangeText={(texto) => set('descricao', texto)}
          placeholder="Detalhes da despesa"
          multiline
          erro={erros.descricao}
        />

        <SeletorDespesa
          rotulo="Repetição (opcional)"
          acessibilidade="Repetição"
          valor={repeticao}
          erro={erros.intervalo}
          dica={v.recorrente
            ? repeticaoMensal ? `Repete todo mês no dia ${dia}.` : undefined
            : 'Opcional · Dias, meses ou anos'}
          onPress={() => setSeletor('repeticao')}
        />

        {v.recorrente ? (
          <>
            <SeletorDespesa
              rotulo="Término (opcional)"
              valor={v.termino || 'Sem término'}
              erro={erros.termino}
              dica="Você pode definir uma data para a última repetição."
              onPress={() => setSeletor('termino')}
            />
            {dia > 0 && valor.ok && Number(v.intervalo) > 0 ? (
              <View style={estilos.resumo}>
                <Text accessibilityRole="header" style={estilos.resumoTitulo}>Resumo da repetição</Text>
                <Text style={estilos.resumoTexto}>
                  {formatarBRL(valor.centavos)} {regra}, a partir de {v.data},
                  {v.termino ? ` até ${v.termino}.` : ' sem data de término.'}
                </Text>
                <Text style={estilos.dica}>
                  Repete o lançamento no UniCash. Não faz débito bancário automático.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {emSerie ? (
          <Text style={estilos.avisoSerie}>
            Despesa de uma série: mudanças na repetição podem valer para esta,
            as próximas ou todas as ocorrências.
          </Text>
        ) : null}

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Categoria</Text>
          <View style={estilos.classificacoes}>
            <Segmentado
              variante="pilulas"
              valor={v.fixaOuVariavel}
              onChange={(valor) => set('fixaOuVariavel', valor)}
              opcoes={[
                { valor: 'fixa', rotulo: 'Fixa' },
                { valor: 'variavel', rotulo: 'Variável' },
              ]}
            />
            <Segmentado
              variante="pilulas"
              valor={v.essencial}
              onChange={(valor) => set('essencial', valor)}
              opcoes={[
                { valor: 'essencial', rotulo: 'Essencial' },
                { valor: 'nao_essencial', rotulo: 'Não essencial' },
              ]}
            />
          </View>
        </View>

        <SeletorDespesa
          rotulo="Subcategoria (opcional)"
          valor={v.categoriaId && categoriaSelecionada ? categoriaSelecionada : 'Selecionar subcategoria'}
          onPress={() => setSeletor('categoria')}
        />

        <Text style={estilos.dica}>
          Salvo primeiro no dispositivo: funciona sem internet.
        </Text>

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
          style={[
            estilos.salvar,
            salvando && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
        >
          {salvando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={estilos.salvarTexto}>{textoSalvar}</Text>
          )}
        </Pressable>

        {onExcluir ? (
          <Pressable
            onPress={onExcluir}
            disabled={salvando}
            style={estilos.secundario}
            accessibilityRole="button"
          >
            <Text style={estilos.secundarioTexto}>
              🗑 Excluir despesa
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onCancelar}
            disabled={salvando}
            style={estilos.secundario}
            accessibilityRole="button"
          >
            <Text style={estilos.secundarioTexto}>{textoCancelar}</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={seletor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSeletor(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.modalFundo}
        >
          <View style={estilos.modalCartao}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {seletor === 'repeticao' ? (
                <>
                  <Text accessibilityRole="header" style={estilos.modalTitulo}>Repetição</Text>
                  <Opcao rotulo="Não se repete" onPress={() => escolherRepeticao(null)} />
                  <Opcao rotulo="Diária" onPress={() => escolherRepeticao('dia')} />
                  <Opcao rotulo="Mensal" onPress={() => escolherRepeticao('mes')} />
                  <Opcao rotulo="Anual" onPress={() => escolherRepeticao('ano')} />
                  <Opcao rotulo="Personalizar" onPress={() => {
                    set('recorrente', true);
                    setSeletor('personalizar');
                  }} />
                </>
              ) : null}

              {seletor === 'personalizar' ? (
                <>
                  <Text accessibilityRole="header" style={estilos.modalTitulo}>Personalizar repetição</Text>
                  <Campo
                    compacto
                    rotulo="Repetir a cada"
                    value={v.intervalo}
                    onChangeText={(texto) => set('intervalo', texto.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    erro={erros.intervalo}
                  />
                  <Segmentado
                    valor={v.unidade}
                    onChange={(unidade) => set('unidade', unidade)}
                    opcoes={UNIDADES.map(({ valor, rotulo }) => ({ valor, rotulo }))}
                  />
                </>
              ) : null}

              {seletor === 'termino' ? (
                <>
                  <Text accessibilityRole="header" style={estilos.modalTitulo}>Término da repetição</Text>
                  <Campo
                    compacto
                    rotulo="Data de término (opcional)"
                    value={v.termino}
                    onChangeText={(texto) => set('termino', mascararData(texto))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                    erro={erros.termino}
                  />
                  <Opcao rotulo="Sem término" onPress={() => {
                    set('termino', '');
                    setSeletor(null);
                  }} />
                </>
              ) : null}

              {seletor === 'categoria' ? (
                <>
                  <Text accessibilityRole="header" style={estilos.modalTitulo}>Subcategoria</Text>
                  {carregandoCategorias ? <ActivityIndicator color={cores.primaria} /> : null}
                  {erroCategorias ? (
                    <>
                      <Text style={estilos.erro} accessibilityRole="alert">
                        Não foi possível carregar as categorias.
                      </Text>
                      <Opcao rotulo="Tentar novamente" onPress={recarregarCategorias} />
                    </>
                  ) : null}
                  {opcoesCategoria.map(({ id, nome }) => (
                    <Opcao key={id} rotulo={nome} selecionada={v.categoriaId === id} onPress={() => {
                      set('categoriaId', id);
                      setSeletor(null);
                    }} />
                  ))}
                </>
              ) : null}
            </ScrollView>
            <Opcao rotulo={seletor === 'termino' || seletor === 'personalizar' ? 'Concluir' : 'Fechar'}
              onPress={() => setSeletor(null)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SeletorDespesa({ rotulo, acessibilidade = rotulo, valor, erro, dica, onPress }: {
  rotulo: string;
  acessibilidade?: string;
  valor: string;
  erro?: string;
  dica?: string;
  onPress: () => void;
}) {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={acessibilidade} accessibilityHint={valor}
        onPress={onPress} style={[estilos.seletor, erro && estilos.seletorErro]}>
        <Text style={estilos.seletorTexto}>{valor}</Text>
        <IconePrototipo nome="expandir" tamanho={14} />
      </Pressable>
      {erro ? <Text style={estilos.erro} accessibilityRole="alert">{erro}</Text> : null}
      {dica ? <Text style={estilos.dica}>{dica}</Text> : null}
    </View>
  );
}

function Opcao({ rotulo, onPress, selecionada }: { rotulo: string; onPress: () => void; selecionada?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: selecionada }}
      onPress={onPress} style={[estilos.opcao, selecionada && estilos.opcaoSelecionada]}>
      <Text style={estilos.seletorTexto}>{rotulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 4 },
  voltar: { minWidth: 36, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 18, fontWeight: '600', color: cores.marinho, flexShrink: 1 },
  conteudo: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  bloco: { marginBottom: 12 },
  rotulo: { fontSize: 12, fontWeight: '500', color: cores.primaria, marginBottom: 4 },
  classificacoes: { gap: 8 },
  resumo: { padding: 14, borderRadius: raio.cartao, borderWidth: 1, borderColor: cores.borda, marginBottom: 12 },
  resumoTitulo: { fontSize: 14, fontWeight: '700', color: cores.marinho },
  resumoTexto: { fontSize: 13, color: cores.marinho, marginTop: 4 },
  hoje: { alignSelf: 'flex-start', paddingBottom: 4 },
  avisoSerie: { fontSize: 12, color: cores.primaria, marginBottom: 12 },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.campo,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 44,
    gap: 8,
    backgroundColor: cores.branco,
  },
  seletorErro: { borderColor: cores.erro },
  seletorTexto: { fontSize: 15, color: cores.marinho, flexShrink: 1 },
  dica: { fontSize: 12, color: cores.primaria, marginTop: 6 },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
  erroGeral: {
    color: cores.erro,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  rodape: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  salvar: {
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  salvarTexto: {
    color: cores.branco,
    fontWeight: '700',
    fontSize: 15,
  },
  secundario: { alignItems: 'center', paddingVertical: 14 },
  secundarioTexto: {
    color: cores.primaria,
    fontWeight: '600',
    fontSize: 14,
  },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(8,47,73,0.55)',
    justifyContent: 'flex-end',
  },
  opcao: { minHeight: 44, justifyContent: 'center', padding: 10, borderRadius: raio.campo },
  opcaoSelecionada: { backgroundColor: cores.fundoSuave },
  modalCartao: {
    maxHeight: '85%',
    backgroundColor: cores.branco,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.marinho,
    marginBottom: 14,
  },
});
