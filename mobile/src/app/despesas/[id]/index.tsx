
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { buscarDespesa } from '@/features/despesas/service';
import { formatarBR, formatarDataHora } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { MSG_DESPESA } from '@/features/despesas/validation';
import type { Despesa } from '@/features/despesas/types';
import { useExclusaoDespesas } from '@/components/despesas/useExclusaoDespesas';
import { cores, raio } from '@/lib/theme';

const UNIDADE: Record<string, [string, string]> = {
  dia: ['dia', 'dias'],
  mes: ['mês', 'meses'],
  ano: ['ano', 'anos'],
};

export default function DetalheDespesa() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [dados, setDados] = useState<{
    despesa: Despesa;
    recorrencia: {
      intervalo: number;
      unidade: 'dia' | 'mes' | 'ano';
      termino: string | null;
    } | null;
  } | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLeitura(false);

    try {
      const resultado = await buscarDespesa(id);

      if (!resultado) {
        router.replace('/despesas');
        return;
      }

      setDados(resultado);
    } catch {
      setErroLeitura(true);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const alvoExclusao = dados
    ? {
        id: dados.despesa.id,
        titulo: dados.despesa.titulo,
        valorCentavos: dados.despesa.valor_centavos,
        data: dados.despesa.data,
        emSerie: Boolean(dados.despesa.recorrencia_id),
      }
    : null;

  const { iniciar, dialogos } = useExclusaoDespesas(alvoExclusao);

  if (carregando && !dados) {
    return (
      <View style={estilos.carregando}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  if (erroLeitura || !dados) {
    return (
      <SafeAreaView style={estilos.erroTela}>
        <Text style={estilos.erroTexto}>
          {MSG_DESPESA.falhaLeitura}
        </Text>

        <Pressable
          onPress={() => void carregar()}
          style={estilos.tentar}
          accessibilityRole="button"
        >
          <Text style={estilos.primarioTexto}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { despesa, recorrencia } = dados;
  const [un1, unN] = recorrencia
    ? UNIDADE[recorrencia.unidade]
    : ['', ''];

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <View style={estilos.cabecalho}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          style={{ paddingHorizontal: 10 }}
        >
          <Text style={estilos.voltar}>‹</Text>
        </Pressable>

        <Text style={estilos.titulo}>Detalhe da despesa</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.topo}>
          <View style={estilos.avatar}>
            <Text style={estilos.avatarTexto}>
              {despesa.titulo.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={estilos.nome}>{despesa.titulo}</Text>

          <Text style={estilos.valor}>
            − {formatarBRL(despesa.valor_centavos)}
          </Text>

          <View style={estilos.tag}>
            <Text style={estilos.tagTexto}>Despesa</Text>
          </View>
        </View>

        <View style={estilos.cartao}>
          <Linha rotulo="Data" valor={formatarBR(despesa.data)} />
          <Linha rotulo="Descrição" valor={despesa.descricao ?? '—'} />
          <Linha rotulo="Categoria" valor={despesa.categoria_id ?? 'Sem categoria'} />

          <Linha
            rotulo="Classificação"
            valor={
              despesa.fixa_ou_variavel === 'fixa'
                ? 'Fixa'
                : despesa.fixa_ou_variavel === 'variavel'
                  ? 'Variável'
                  : 'Não informada'
            }
          />

          <Linha
            rotulo="Importância"
            valor={
              despesa.essencial === 1
                ? 'Essencial'
                : despesa.essencial === 0
                  ? 'Não essencial'
                  : 'Não informada'
            }
          />

          <Linha
            rotulo="Repetição"
            valor={
              recorrencia
                ? `A cada ${recorrencia.intervalo} ${
                    recorrencia.intervalo === 1 ? un1 : unN
                  }` +
                  (recorrencia.termino
                    ? ` · até ${formatarBR(recorrencia.termino)}`
                    : ' · sem término')
                : 'Não se repete'
            }
          />

          <Linha
            rotulo="Registrada em"
            valor={formatarDataHora(despesa.criado_em)}
          />

          <Linha
            rotulo="Última alteração"
            valor={formatarDataHora(despesa.atualizado_em)}
          />

          <Linha
            rotulo="Sincronização"
            valor={
              despesa.sync_status === 'pendente'
                ? 'Pendente'
                : 'Sincronizado'
            }
          />
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/despesas/[id]/editar',
              params: { id },
            })
          }
          style={estilos.primario}
          accessibilityRole="button"
        >
          <Text style={estilos.primarioTexto}>✎  Editar despesa</Text>
        </Pressable>

        <Pressable
          onPress={iniciar}
          style={estilos.destrutivo}
          accessibilityRole="button"
        >
          <Text style={estilos.destrutivoTexto}>Excluir despesa</Text>
        </Pressable>
      </ScrollView>

      {dialogos}
    </SafeAreaView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.linhaValor}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  carregando: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
  erroTela: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: cores.fundo,
    padding: 24,
  },
  erroTexto: { color: cores.erro, textAlign: 'center' },
  tentar: {
    marginTop: 12,
    padding: 12,
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  voltar: {
    fontSize: 30,
    color: cores.primaria,
    fontWeight: '700',
    lineHeight: 32,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho },
  conteudo: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  topo: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: cores.claro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarTexto: { color: cores.marinho, fontWeight: '700', fontSize: 20 },
  nome: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.marinho,
    textAlign: 'center',
  },
  valor: {
    fontSize: 26,
    fontWeight: '800',
    color: cores.erro,
    marginTop: 4,
  },
  tag: {
    borderWidth: 1,
    borderColor: cores.claro,
    borderRadius: raio.pilula,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 8,
    backgroundColor: cores.branco,
  },
  tagTexto: { fontSize: 11, color: cores.marinho },
  cartao: {
    borderWidth: 1,
    borderColor: cores.claro,
    borderRadius: raio.cartao,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  rotulo: { fontSize: 12, color: cores.primaria, marginRight: 16 },
  linhaValor: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: cores.marinho,
    textAlign: 'right',
  },
  primario: {
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primarioTexto: {
    color: cores.branco,
    fontWeight: '700',
    fontSize: 14,
  },
  destrutivo: {
    borderWidth: 1,
    borderColor: cores.erro,
    borderRadius: raio.botao,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  destrutivoTexto: {
    color: cores.erro,
    fontWeight: '700',
    fontSize: 14,
  },
});
