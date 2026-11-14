import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { useDespesas } from '@/features/despesas/useDespesas';
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

  const {
    itens,
    total,
    carregando,
    erroLeitura,
    recarregar,
  } = useDespesas(filtro);

  useFocusEffect(
    useCallback(() => {
      void recarregar();
    }, [recarregar]),
  );

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Despesas</Text>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={estilos.conteudo}
        ListHeaderComponent={
          <View>
            <View style={estilos.chips}>
              <FiltroDespesas filtro={filtro} onChange={setFiltro} />
            </View>

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
                Nenhuma despesa neste período
              </Text>

              <Text style={estilos.vazioTexto}>
                Toque em + para registrar uma despesa.
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
  conteudo: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  chips: {
    flexDirection: 'row',
    marginBottom: 12,
  },
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