
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { cores, raio } from '@/lib/theme';
import { FiltroDespesas } from '@/components/despesas/FiltroDespesas';
import { DespesaItem } from '@/components/despesas/DespesaItem';
import { formatarBRL } from '@/features/receitas/money';
import { useCategoriasAtivas } from '@/features/categorias/useCategoriasAtivas';
import { nomeCategoriaPorId } from '@/features/despesas/categorias';
import { useDespesas } from '@/features/despesas/useDespesas';
import { MSG_DESPESA } from '@/features/despesas/validation';
import { contarPendentes } from '@/features/receitas/pendencias';
import {
  consumirAcessoNegado,
  FalhaLeituraCatalogoSincronizacao,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import {
  consumirFeedback,
  type Feedback,
} from '@/lib/feedback';
import type { FiltroDespesa } from '@/features/despesas/types';

function filtroMesCorrente(): FiltroDespesa {
  const hoje = new Date();

  return {
    modo: 'mes',
    ano: hoje.getFullYear(),
    mes: hoje.getMonth() + 1,
  };
}

export default function ListaDespesas() {
  const [filtro, setFiltro] = useState<FiltroDespesa>(filtroMesCorrente);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const {
    itens: categorias,
    carregando: carregandoCategorias,
    erro: erroCategorias,
    recarregar: recarregarCategorias,
  } = useCategoriasAtivas();

  // Categoria derivada: se a lista bem-sucedida mais recente não contém o ID
  // selecionado, a tela volta a "Todas" sem sincronizar estado dentro de efeito.
  // O hook preserva a última lista válida durante recarga e falha de leitura.
  const categoriaSelecionada =
    categoria && categorias.some((c) => c.id === categoria) ? categoria : null;

  const {
    itens,
    total,
    carregando,
    erroLeitura,
    recarregar,
  } = useDespesas(filtro, categoriaSelecionada);

  const [pendentes, setPendentes] = useState(0);
  const primeiraFocada = useRef(true);

  const atualizarPendentes = useCallback(async () => {
    try {
      setPendentes(await contarPendentes());
    } catch {
      // indicador é informativo
    }
  }, []);

  // Ao focar: mostra mensagem pendente, recarrega e tenta sincronizar (EX03).
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      setFeedback(consumirFeedback());
      void atualizarPendentes();

      if (primeiraFocada.current) {
        primeiraFocada.current = false;
      } else {
        void recarregar();
        void recarregarCategorias();
      }

      void sincronizarPendentes()
        .then((mudou) => {
          if (!ativo) return;

          if (mudou) void recarregar();
          // EX06: a nuvem negou o acesso; os dados locais seguem intactos.
          if (consumirAcessoNegado()) {
            setFeedback({ tipo: 'erro', texto: MSG_DESPESA.semAcesso });
          }
        })
        .catch((erro) => {
          if (erro instanceof FalhaLeituraCatalogoSincronizacao) {
            console.warn(
              'Sincronização em segundo plano: falha ao ler o catálogo local na lista de despesas.',
              erro,
            );
          } else {
            console.error(
              'Falha inesperada ao sincronizar pendências na lista de despesas.',
              erro,
            );
          }

          if (!ativo) return;

          // Consome apenas uma negação real anterior; não marca novo acesso negado.
          if (consumirAcessoNegado()) {
            setFeedback({ tipo: 'erro', texto: MSG_DESPESA.semAcesso });
          }
        })
        .finally(() => {
          if (ativo) void atualizarPendentes();
        });

      return () => {
        ativo = false;
      };
    }, [recarregar, recarregarCategorias, atualizarPendentes]),
  );

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Despesas</Text>
        {pendentes > 0 ? (
          <View style={estilos.pendentes}>
            <Text style={estilos.pendentesTexto}>
              ↻ {pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={estilos.conteudo}
        ListHeaderComponent={
          <View>
            {feedback && (
              <View
                style={[
                  estilos.feedback,
                  feedback.tipo === 'erro'
                    ? estilos.feedbackErro
                    : estilos.feedbackSucesso,
                ]}
                accessibilityRole="alert"
              >
                <Text
                  style={[
                    estilos.feedbackTexto,
                    feedback.tipo === 'erro'
                      ? estilos.feedbackTextoErro
                      : estilos.feedbackTextoSucesso,
                  ]}
                >
                  {feedback.texto}
                </Text>
              </View>
            )}

            <View style={estilos.chips}>
              <FiltroDespesas filtro={filtro} onChange={setFiltro} />
            </View>

            {carregandoCategorias ? (
              <ActivityIndicator
                color={cores.primaria}
                style={estilos.carregandoCategorias}
              />
            ) : null}

            {erroCategorias ? (
              <View style={estilos.avisoCategorias}>
                <Text style={estilos.erroCategorias} accessibilityRole="alert">
                  Não foi possível carregar as categorias.
                </Text>
                <Pressable
                  onPress={recarregarCategorias}
                  style={estilos.tentarCategorias}
                  accessibilityRole="button"
                >
                  <Text style={estilos.tentarTexto}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={estilos.categorias}
              accessibilityLabel="Filtrar por categoria"
            >
              {[{ id: null, nome: 'Todas' }, ...categorias].map((c) => {
                const ativa = categoriaSelecionada === c.id;

                return (
                  <Pressable
                    key={c.id ?? 'todas'}
                    onPress={() => setCategoria(c.id)}
                    style={[estilos.categoriaChip, ativa && estilos.categoriaChipAtivo]}
                    accessibilityRole="button"
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
            </ScrollView>

            <View style={estilos.total}>
              <Text style={estilos.totalRotulo}>Total de despesas</Text>
              <Text style={estilos.totalValor}>
                − {formatarBRL(total)}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <DespesaItem
            despesa={item}
            categoriaNome={nomeCategoriaPorId(item.categoria_id, categorias)}
            onPress={() =>
              router.push({
                pathname: '/despesas/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        ListFooterComponent={
          itens.length > 0 ? (
            <Text style={estilos.dica}>
              Toque em uma despesa para consultar, editar ou excluir.
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator
              color={cores.primaria}
              style={{ marginTop: 32 }}
            />
          ) : erroLeitura ? (
            <View style={estilos.vazio}>
              <Text style={estilos.erro}>
                Não foi possível carregar as despesas. Tente novamente.
              </Text>

              <Pressable
                onPress={() => void recarregar()}
                style={estilos.tentar}
                accessibilityRole="button"
              >
                <Text style={estilos.tentarTexto}>
                  Tentar novamente
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={estilos.vazio}>
              <Text style={estilos.vazioTitulo}>
                {categoriaSelecionada
                  ? 'Nenhum registro'
                  : 'Nenhuma despesa neste período'}
              </Text>

              <Text style={estilos.vazioTexto}>
                {categoriaSelecionada
                  ? 'Altere o filtro de categoria ou o período para ver outras despesas.'
                  : 'Toque em + para registrar uma despesa.'}
              </Text>
            </View>
          )
        }
      />

      <Pressable
        onPress={() => router.push('/despesas/nova')}
        style={estilos.fab}
        accessibilityRole="button"
        accessibilityLabel="Nova despesa"
      >
        <Text style={estilos.fabTexto}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: cores.marinho,
  },
  pendentes: {
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.botao,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendentesTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: cores.textoSuave,
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  feedback: {
    borderRadius: raio.cartao,
    padding: 12,
    marginBottom: 12,
  },
  feedbackSucesso: {
    backgroundColor: cores.primaria,
  },
  feedbackErro: {
    backgroundColor: cores.erro,
  },
  feedbackTexto: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackTextoSucesso: {
    color: cores.branco,
  },
  feedbackTextoErro: {
    color: cores.branco,
  },
  chips: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  carregandoCategorias: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  avisoCategorias: {
    marginBottom: 8,
  },
  erroCategorias: {
    color: cores.erro,
    fontSize: 12,
  },
  tentarCategorias: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  categorias: {
    marginBottom: 12,
  },
  categoriaChip: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.campo,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: cores.branco,
  },
  categoriaChipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  categoriaChipTexto: { fontSize: 12, color: cores.marinho },
  categoriaChipTextoAtivo: { color: cores.branco, fontWeight: '600' },
  total: {
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.cartao,
    padding: 14,
    marginBottom: 6,
  },
  totalRotulo: {
    fontSize: 12,
    color: cores.textoSuave,
  },
  totalValor: {
    fontSize: 18,
    fontWeight: '800',
    color: cores.erro,
    marginTop: 2,
  },
  dica: {
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 16,
  },
  vazio: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  vazioTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.marinho,
  },
  vazioTexto: {
    fontSize: 14,
    color: cores.textoSuave,
    marginTop: 6,
    textAlign: 'center',
  },
  erro: {
    color: cores.erro,
    fontSize: 14,
    textAlign: 'center',
  },
  tentar: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tentarTexto: {
    color: cores.primaria,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabTexto: {
    color: cores.branco,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '400',
  },
});
