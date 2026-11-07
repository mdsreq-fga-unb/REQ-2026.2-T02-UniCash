import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { OpcoesModal } from '@/components/receitas/OpcoesModal';
import { buscarReceita, excluirReceita, ReceitaIndisponivel } from '@/features/receitas/service';
import { formatarBR, formatarDataHora } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { setFeedback } from '@/features/receitas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { MSG } from '@/features/receitas/validation';
import type { EscopoSerie, Receita, Recorrencia } from '@/features/receitas/types';
import { cores } from '@/lib/theme';

const UNIDADE: Record<string, [string, string]> = { dia: ['dia', 'dias'], mes: ['mês', 'meses'], ano: ['ano', 'anos'] };
const ALCANCE: Record<EscopoSerie, string> = {
  esta: 'Será excluída apenas esta receita.',
  proximas: 'Serão excluídas esta receita e as próximas da série.',
  todas: 'Serão excluídas todas as receitas da série.',
};

type Etapa = null | 'alcance' | 'confirmar';

export default function DetalheReceita() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dados, setDados] = useState<{ receita: Receita; recorrencia: Recorrencia | null } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>(null);
  const [escopo, setEscopo] = useState<EscopoSerie>('esta');

  const voltarParaLista = (f: { tipo: 'sucesso' | 'erro'; texto: string }) => {
    setFeedback(f);
    router.replace('/receitas');
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLeitura(false);
    try {
      const r = await buscarReceita(id);
      if (!r) return voltarParaLista({ tipo: 'erro', texto: MSG.indisponivel }); // EX06
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

  async function excluir() {
    setEtapa(null);
    try {
      await excluirReceita(id, escopo);
      sincronizarEmSegundoPlano();
      voltarParaLista({ tipo: 'sucesso', texto: 'Receita excluída.' });
    } catch (e) {
      if (e instanceof ReceitaIndisponivel) voltarParaLista({ tipo: 'erro', texto: MSG.indisponivel });
      else voltarParaLista({ tipo: 'erro', texto: MSG.falhaSalvar }); // EX03 em D: volta à lista
    }
  }

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
        <Text style={estilos.titulo}>Detalhe da receita</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={estilos.nome}>{receita.titulo}</Text>
        <Text style={estilos.valor}>+ {formatarBRL(receita.valor_centavos)}</Text>

        <Linha rotulo="Data" valor={formatarBR(receita.data)} />
        <Linha rotulo="Descrição" valor={receita.descricao ?? '—'} />
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
        <Linha rotulo="Sincronização" valor={receita.sync_status === 'pendente' ? 'Pendente de sincronização' : 'Sincronizado'} />
      </ScrollView>

      <View style={{ padding: 20 }}>
        <Pressable
          onPress={() => router.push({ pathname: '/receitas/[id]/editar', params: { id } })}
          style={estilos.primario}
          accessibilityRole="button"
        >
          <Text style={estilos.primarioTexto}>Editar receita</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setEscopo('esta');
            setEtapa(receita.recorrencia_id ? 'alcance' : 'confirmar');
          }}
          style={estilos.perigo}
          accessibilityRole="button"
        >
          <Text style={estilos.perigoTexto}>Excluir receita</Text>
        </Pressable>
      </View>

      <OpcoesModal
        visivel={etapa === 'alcance'}
        titulo="Excluir quais receitas?"
        opcoes={(['esta', 'proximas', 'todas'] as const).map((e) => ({
          rotulo: e === 'esta' ? 'Só esta' : e === 'proximas' ? 'Esta e as próximas' : 'Todas',
          onPress: () => {
            setEscopo(e);
            setEtapa('confirmar');
          },
        }))}
        onCancelar={() => setEtapa(null)}
      />
      <OpcoesModal
        visivel={etapa === 'confirmar'}
        titulo="Excluir receita?"
        mensagem={`“${receita.titulo}” (+ ${formatarBRL(receita.valor_centavos)} em ${formatarBR(receita.data)}). ${ALCANCE[escopo]} Esta ação não pode ser desfeita.`}
        opcoes={[{ rotulo: 'Excluir', destrutiva: true, onPress: () => void excluir() }]}
        onCancelar={() => setEtapa(null)}
      />
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
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  voltar: { fontSize: 32, color: cores.primaria, fontWeight: '700' },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.marinho },
  nome: { fontSize: 22, fontWeight: '700', color: cores.marinho },
  valor: { fontSize: 26, fontWeight: '800', color: cores.sucesso, marginTop: 4, marginBottom: 18 },
  linha: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.borda },
  rotulo: { fontSize: 13, color: cores.textoSuave },
  linhaValor: { fontSize: 16, color: cores.marinho, marginTop: 2 },
  primario: { backgroundColor: cores.primaria, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primarioTexto: { color: cores.branco, fontWeight: '700', fontSize: 16 },
  perigo: { borderWidth: 1.5, borderColor: cores.erro, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  perigoTexto: { color: cores.erro, fontWeight: '700', fontSize: 16 },
});
