import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { DespesaItem } from '@/components/despesas/DespesaItem';
import { FiltroDespesas } from '@/components/despesas/FiltroDespesas';
import { ReceitaItem } from '@/components/receitas/ReceitaItem';
import { Segmentado, type OpcaoSegmento } from '@/components/receitas/Segmentado';
import { useCategoriasAtivas } from '@/features/categorias/useCategoriasAtivas';
import { nomeCategoriaPorId } from '@/features/despesas/categorias';
import { listarDespesas } from '@/features/despesas/service';
import type { Despesa } from '@/features/despesas/types';
import { lerMesDeParametros } from '@/features/receitas/dates';
import { formatarBRL, parseValor } from '@/features/receitas/money';
import { contarPendentes } from '@/features/receitas/pendencias';
import { listarReceitas } from '@/features/receitas/service';
import type { Filtro, Receita } from '@/features/receitas/types';
import { intervaloDoFiltro } from '@/features/receitas/useReceitas';
import { ouvirBaseAtualizada } from '@/lib/baseAtualizada';
import { consumirFeedback, type Feedback } from '@/lib/feedback';
import { cores, raio } from '@/lib/theme';

type Tipo = 'todas' | 'receita' | 'despesa';
type Movimento = { tipo: 'receita'; dado: Receita } | { tipo: 'despesa'; dado: Despesa };

const tipos: OpcaoSegmento<Tipo>[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'receita', rotulo: 'Receitas' },
  { valor: 'despesa', rotulo: 'Despesas' },
];

function filtroInicial(ano?: string, mes?: string): Filtro {
  const hoje = new Date();
  return { modo: 'mes', ...(lerMesDeParametros(ano, mes) ?? {
    ano: hoje.getFullYear(), mes: hoje.getMonth() + 1,
  }) };
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export default function Movimentacoes() {
  const { ano, mes } = useLocalSearchParams<{ ano?: string; mes?: string }>();
  const [filtro, setFiltro] = useState(() => filtroInicial(ano, mes));
  const [tipo, setTipo] = useState<Tipo>('todas');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [versao, setVersao] = useState(0);
  const [pendentes, setPendentes] = useState(0);
  const [resultado, setResultado] = useState<{
    filtro: Filtro; versao: number; receitas: Receita[]; despesas: Despesa[]; erro: boolean;
  } | null>(null);
  const { itens: categorias, recarregar: recarregarCategorias } = useCategoriasAtivas();
  const atualizar = useCallback(() => setVersao((valor) => valor + 1), []);

  useEffect(() => ouvirBaseAtualizada(atualizar), [atualizar]);
  useFocusEffect(useCallback(() => {
    setFeedback(consumirFeedback());
    void recarregarCategorias();
    atualizar();
  }, [atualizar, recarregarCategorias]));

  useEffect(() => {
    let ativo = true;
    const { inicio, fim } = intervaloDoFiltro(filtro);
    void Promise.all([listarReceitas(inicio, fim), listarDespesas(inicio, fim)])
      .then(([receitas, despesas]) => {
        if (ativo) setResultado({ filtro, versao, receitas: receitas.itens, despesas: despesas.itens, erro: false });
      })
      .catch(() => {
        if (ativo) setResultado({ filtro, versao, receitas: [], despesas: [], erro: true });
      });
    void contarPendentes().then((total) => {
      if (ativo) setPendentes(total);
    }).catch(() => {
      if (ativo) setPendentes(0);
    });
    return () => { ativo = false; };
  }, [filtro, versao]);

  const dados = resultado?.filtro === filtro && resultado.versao === versao ? resultado : null;
  const categoriaAtiva = categorias.some((item) => item.id === categoria) ? categoria : null;
  const buscaNormalizada = normalizar(busca);
  const valorBuscado = parseValor(busca);
  function corresponde(item: Receita | Despesa) {
    return normalizar(item.titulo).includes(buscaNormalizada)
      || normalizar(item.descricao ?? '').includes(buscaNormalizada)
      || (valorBuscado.ok && item.valor_centavos === valorBuscado.centavos);
  }

  const receitas = categoriaAtiva ? [] : (dados?.receitas ?? []).filter(corresponde);
  const despesas = (dados?.despesas ?? []).filter((item) =>
    (!categoriaAtiva || item.categoria_id === categoriaAtiva) && corresponde(item));
  const movimentos: Movimento[] = [];
  if (tipo !== 'despesa') receitas.forEach((dado) => movimentos.push({ tipo: 'receita', dado }));
  if (tipo !== 'receita') despesas.forEach((dado) => movimentos.push({ tipo: 'despesa', dado }));
  movimentos.sort((a, b) => b.dado.data.localeCompare(a.dado.data)
    || b.dado.criado_em.localeCompare(a.dado.criado_em));

  function novaDespesa() {
    router.push({ pathname: '/despesas/nova', params: { origem: 'movimentacoes' } });
  }

  function novoLancamento() {
    if (tipo === 'receita') router.push({ pathname: '/receitas/nova', params: { origem: 'movimentacoes' } });
    else novaDespesa();
  }

  return (
    <SafeAreaView edges={['top']} style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Text accessibilityRole="header" style={estilos.titulo}>Movimentações</Text>
        {pendentes > 0 && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/sincronizacao')}>
            <Text style={estilos.link}>{pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={movimentos}
        keyExtractor={({ tipo: tipoItem, dado }) => `${tipoItem}:${dado.id}`}
        contentContainerStyle={estilos.conteudo}
        renderItem={({ item }) => item.tipo === 'receita' ? (
          <ReceitaItem receita={item.dado} onPress={() => router.push({
            pathname: '/receitas/[id]', params: { id: item.dado.id, origem: 'movimentacoes' },
          })} />
        ) : (
          <DespesaItem
            despesa={item.dado}
            categoriaNome={nomeCategoriaPorId(item.dado.categoria_id, categorias)}
            onPress={() => router.push({
              pathname: '/despesas/[id]', params: { id: item.dado.id, origem: 'movimentacoes' },
            })}
          />
        )}
        ListHeaderComponent={
          <View style={estilos.filtros}>
            {feedback && (
              <Text accessibilityRole="alert" style={[
                estilos.aviso, feedback.tipo === 'erro' && estilos.erro,
              ]}>{feedback.texto}</Text>
            )}
            <TextInput
              accessibilityLabel="Buscar por descrição ou valor"
              placeholder="Buscar por descrição ou valor"
              placeholderTextColor={cores.textoSuave}
              value={busca}
              onChangeText={setBusca}
              style={estilos.busca}
            />
            <FiltroDespesas filtro={filtro} onChange={setFiltro} />
            {tipo !== 'receita' && (
              <ScrollView horizontal keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.categorias}>
                {[{ id: null, nome: 'Todas as categorias' }, ...categorias].map(({ id, nome }) => (
                  <Pressable
                    key={id ?? 'todas'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: categoriaAtiva === id }}
                    style={[estilos.chip, categoriaAtiva === id && estilos.chipAtivo]}
                    onPress={() => setCategoria(id)}
                  >
                    <Text style={estilos.link}>{nome}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Segmentado opcoes={tipos} valor={tipo} onChange={(novo) => {
              if (novo === 'receita') setCategoria(null);
              setTipo(novo);
            }} />
            {dados && !dados.erro && (
              <View style={estilos.totais}>
                <Text style={[estilos.total, estilos.receita]}>
                  Receitas{'\n'}+ {formatarBRL(receitas.reduce((total, item) => total + item.valor_centavos, 0))}
                </Text>
                <Text style={[estilos.total, estilos.erro]}>
                  Despesas{'\n'}− {formatarBRL(despesas.reduce((total, item) => total + item.valor_centavos, 0))}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={!dados ? (
          <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando movimentações" />
        ) : dados.erro ? (
          <View style={estilos.vazio}>
            <Text accessibilityRole="alert" style={estilos.erro}>Não foi possível carregar as movimentações.</Text>
            <Pressable accessibilityRole="button" onPress={atualizar}>
              <Text style={estilos.link}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <View style={estilos.vazio}>
            <Text style={estilos.titulo}>Nenhum lançamento encontrado</Text>
            <Pressable accessibilityRole="button" onPress={() => {
              setFiltro(filtroInicial(ano, mes));
              setCategoria(null);
              setTipo('todas');
              setBusca('');
            }}><Text style={estilos.link}>Limpar filtros</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={novoLancamento}>
              <Text style={estilos.link}>{tipo === 'receita' ? 'Registrar receita' : 'Registrar despesa'}</Text>
            </Pressable>
          </View>
        )}
      />
      <Pressable
        accessibilityRole="button" accessibilityLabel="Novo lançamento"
        onPress={novoLancamento} style={estilos.adicionar}
      >
        <Text style={estilos.mais}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.marinho },
  conteudo: { paddingHorizontal: 16, paddingBottom: 76 },
  filtros: { gap: 10, marginBottom: 12 },
  busca: {
    color: cores.marinho, borderWidth: 1, borderColor: cores.borda,
    borderRadius: raio.campo, minHeight: 44, paddingHorizontal: 12,
  },
  categorias: { gap: 8 },
  chip: { borderWidth: 1, borderColor: cores.borda, borderRadius: raio.pilula, padding: 8 },
  chipAtivo: { backgroundColor: cores.claro },
  totais: { flexDirection: 'row', gap: 8 },
  total: { flex: 1, backgroundColor: cores.fundoSuave, borderRadius: raio.campo, padding: 10 },
  receita: { color: cores.sucesso },
  erro: { color: cores.erro },
  link: { color: cores.primaria, fontWeight: '600' },
  aviso: { color: cores.marinho, backgroundColor: cores.claro, padding: 10, borderRadius: raio.campo },
  vazio: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  adicionar: {
    position: 'absolute', right: 16, bottom: 12, width: 52, height: 52,
    backgroundColor: cores.primaria, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
  },
  mais: { color: cores.branco, fontSize: 28 },
});
