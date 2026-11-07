import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useExclusao } from '@/components/receitas/useExclusao';
import { buscarReceita } from '@/features/receitas/service';
import { formatarBR, formatarDataHora } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { setFeedback } from '@/features/receitas/feedback';
import { MSG } from '@/features/receitas/validation';
import type { Receita, Recorrencia } from '@/features/receitas/types';
import { cores, raio } from '@/lib/theme';

const UNIDADE: Record<string, [string, string]> = { dia: ['dia', 'dias'], mes: ['mês', 'meses'], ano: ['ano', 'anos'] };

export default function DetalheReceita() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dados, setDados] = useState<{ receita: Receita; recorrencia: Recorrencia | null } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);

  const exclusao = useExclusao(
    dados
      ? {
          id,
          titulo: dados.receita.titulo,
          valorCentavos: dados.receita.valor_centavos,
          data: dados.receita.data,
          emSerie: !!dados.receita.recorrencia_id,
        }
      : null,
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLeitura(false);
    try {
      const r = await buscarReceita(id);
      if (!r) {
        // EX06
        setFeedback({ tipo: 'erro', texto: MSG.indisponivel });
        router.replace('/receitas');
        return;
      }
      setDados(r);
    } catch {
      setErroLeitura(true); // EX08
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  if (carregando && !dados) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }
  if (erroLeitura || !dados) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo, padding: 24 }}>
        <Text style={{ color: cores.erro, textAlign: 'center' }}>{MSG.falhaLeitura}</Text>
        <Pressable onPress={() => void carregar()} style={{ marginTop: 12, padding: 12 }} accessibilityRole="button">
          <Text style={{ color: cores.primaria, fontWeight: '700' }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { receita, recorrencia } = dados;
  const [un1, unN] = recorrencia ? UNIDADE[recorrencia.unidade] : ['', ''];

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <View style={estilos.cabecalho}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Voltar" style={{ paddingHorizontal: 10 }}>
          <Text style={estilos.voltar}>‹</Text>
        </Pressable>
        <Text style={estilos.titulo}>Detalhe do lançamento</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={estilos.topo}>
          <View style={estilos.avatar}>
            <Text style={estilos.avatarTexto}>{receita.titulo.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.nome}>{receita.titulo}</Text>
            <Text style={estilos.valor}>+ {formatarBRL(receita.valor_centavos)}</Text>
          </View>
          <View style={estilos.tag}>
            <Text style={estilos.tagTexto}>Receita</Text>
          </View>
        </View>

        <Linha rotulo="Data" valor={formatarBR(receita.data)} />
        <Linha rotulo="Descrição" valor={receita.descricao ?? '—'} />
        <Linha rotulo="Origem" valor="Registro manual" />
        <Linha
          rotulo="Repetição"
          valor={
            recorrencia
              ? `A cada ${recorrencia.intervalo} ${recorrencia.intervalo === 1 ? un1 : unN}` +
                (recorrencia.termino ? ` · até ${formatarBR(recorrencia.termino)}` : ' · sem término')
              : 'Não se repete'
          }
        />
        <Linha rotulo="Registrada em" valor={formatarDataHora(receita.criado_em)} />
        <Linha rotulo="Última alteração" valor={formatarDataHora(receita.atualizado_em)} />
        <Linha rotulo="Sincronização" valor={receita.sync_status === 'pendente' ? 'Pendente' : 'Sincronizado'} />
      </ScrollView>

      <View style={estilos.rodape}>
        <Pressable
          onPress={() => router.push({ pathname: '/receitas/[id]/editar', params: { id } })}
          style={estilos.primario}
          accessibilityRole="button"
        >
          <Text style={estilos.primarioTexto}>Editar lançamento</Text>
        </Pressable>
        <Pressable onPress={exclusao.iniciar} style={estilos.perigo} accessibilityRole="button">
          <Text style={estilos.perigoTexto}>Excluir lançamento</Text>
        </Pressable>
      </View>

      {exclusao.dialogos}
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
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  voltar: { fontSize: 30, color: cores.primaria, fontWeight: '700', lineHeight: 32 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho },
  topo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.claro, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarTexto: { color: cores.marinho, fontWeight: '700', fontSize: 17 },
  nome: { fontSize: 17, fontWeight: '700', color: cores.marinho },
  valor: { fontSize: 18, fontWeight: '800', color: cores.sucesso, marginTop: 2 },
  tag: { backgroundColor: cores.claro, borderRadius: raio.pilula, paddingHorizontal: 10, paddingVertical: 4 },
  tagTexto: { fontSize: 12, fontWeight: '600', color: cores.marinho },
  linha: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E0F2FE' },
  rotulo: { fontSize: 12, color: cores.textoSuave },
  linhaValor: { fontSize: 15, color: cores.marinho, marginTop: 2 },
  rodape: { padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.borda },
  primario: { backgroundColor: cores.primaria, borderRadius: raio.botao, paddingVertical: 14, alignItems: 'center' },
  primarioTexto: { color: cores.branco, fontWeight: '700', fontSize: 15 },
  perigo: { alignItems: 'center', paddingVertical: 14 },
  perigoTexto: { color: cores.erro, fontWeight: '600', fontSize: 14 },
});
