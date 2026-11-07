import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ReceitaForm } from '@/components/receitas/ReceitaForm';
import { OpcoesModal } from '@/components/receitas/OpcoesModal';
import { buscarReceita, editarReceita, ReceitaIndisponivel } from '@/features/receitas/service';
import { formatarBR } from '@/features/receitas/dates';
import { centavosParaTexto } from '@/features/receitas/money';
import { setFeedback } from '@/features/receitas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { MSG } from '@/features/receitas/validation';
import type { EscopoSerie, FormValores, ReceitaInput } from '@/features/receitas/types';
import { cores } from '@/lib/theme';

export default function EditarReceita() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inicial, setInicial] = useState<FormValores | null>(null);
  const [emSerie, setEmSerie] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState<ReceitaInput | null>(null); // aguardando escolha de alcance

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
      setEmSerie(!!r.receita.recorrencia_id);
      setInicial({
        valor: centavosParaTexto(r.receita.valor_centavos),
        data: formatarBR(r.receita.data),
        titulo: r.receita.titulo,
        descricao: r.receita.descricao ?? '',
        recorrente: !!r.recorrencia,
        intervalo: String(r.recorrencia?.intervalo ?? 1),
        unidade: r.recorrencia?.unidade ?? 'mes',
        termino: r.recorrencia?.termino ? formatarBR(r.recorrencia.termino) : '',
      });
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

  async function gravar(dados: ReceitaInput, escopo: EscopoSerie) {
    setPendente(null);
    setSalvando(true);
    setErro(null);
    try {
      await editarReceita(id, dados, escopo);
      setFeedback({ tipo: 'sucesso', texto: 'Receita atualizada.' });
      sincronizarEmSegundoPlano();
      router.back();
    } catch (e) {
      if (e instanceof ReceitaIndisponivel) {
        setFeedback({ tipo: 'erro', texto: MSG.indisponivel });
        router.replace('/receitas');
        return;
      }
      setErro(MSG.falhaSalvar); // EX03
      setSalvando(false);
    }
  }

  function aoSalvar(dados: ReceitaInput) {
    if (emSerie) setPendente(dados); // FA08: pergunta de alcance
    else void gravar(dados, 'esta');
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }
  if (erroLeitura || !inicial) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo, padding: 24 }}>
        <Text style={{ color: cores.erro, textAlign: 'center' }}>{MSG.falhaLeitura}</Text>
        <Pressable onPress={() => void carregar()} style={{ marginTop: 12, padding: 12 }} accessibilityRole="button">
          <Text style={{ color: cores.primaria, fontWeight: '700' }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
      <ReceitaForm
        titulo="Editar receita"
        textoSalvar="Salvar alterações"
        inicial={inicial}
        emSerie={emSerie}
        salvando={salvando}
        erroGeral={erro}
        onSalvar={aoSalvar}
        onCancelar={() => router.back()}
      />
      <OpcoesModal
        visivel={!!pendente}
        titulo="Aplicar alterações a quais receitas?"
        mensagem="Mudanças na repetição só valem em “Esta e as próximas” ou “Todas”."
        opcoes={[
          { rotulo: 'Só esta', onPress: () => pendente && void gravar(pendente, 'esta') },
          { rotulo: 'Esta e as próximas', onPress: () => pendente && void gravar(pendente, 'proximas') },
          { rotulo: 'Todas', onPress: () => pendente && void gravar(pendente, 'todas') },
        ]}
        onCancelar={() => setPendente(null)}
      />
    </SafeAreaView>
  );
}
