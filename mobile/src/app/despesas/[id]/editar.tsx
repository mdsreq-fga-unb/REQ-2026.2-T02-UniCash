
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { DespesaForm } from '@/components/despesas/DespesaForm';
import { OpcoesModal } from '@/components/receitas/OpcoesModal';
import {
  buscarDespesa,
  editarDespesa,
  DespesaIndisponivel,
} from '@/features/despesas/service';
import { formatarBR } from '@/features/receitas/dates';
import { centavosParaTexto } from '@/features/receitas/money';
import { MSG_DESPESA } from '@/features/despesas/validation';
import type {
  EscopoSerie,
  FormValoresDespesa,
  Despesa,
  DespesaInput,
} from '@/features/despesas/types';
import { cores } from '@/lib/theme';

export default function EditarDespesa() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [despesa, setDespesa] = useState<Despesa | null>(null);
  const [inicial, setInicial] = useState<FormValoresDespesa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState<DespesaInput | null>(null);

  const emSerie = !!despesa?.recorrencia_id;

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLeitura(false);

    try {
      const resultado = await buscarDespesa(id);

      if (!resultado) {
        router.replace('/despesas');
        return;
      }

      setDespesa(resultado.despesa);

      setInicial({
        valor: centavosParaTexto(resultado.despesa.valor_centavos),
        data: formatarBR(resultado.despesa.data),
        titulo: resultado.despesa.titulo,
        descricao: resultado.despesa.descricao ?? '',
        categoriaId: resultado.despesa.categoria_id ?? '',
        fixaOuVariavel: resultado.despesa.fixa_ou_variavel ?? '',
        essencial:
          resultado.despesa.essencial === 1
            ? 'essencial'
            : resultado.despesa.essencial === 0
              ? 'nao_essencial'
              : '',
        recorrente: !!resultado.recorrencia,
        intervalo: String(resultado.recorrencia?.intervalo ?? 1),
        unidade: resultado.recorrencia?.unidade ?? 'mes',
        termino: resultado.recorrencia?.termino
          ? formatarBR(resultado.recorrencia.termino)
          : '',
      });
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

  async function gravar(dados: DespesaInput, escopo: EscopoSerie) {
    setPendente(null);
    setSalvando(true);
    setErro(null);

    try {
      await editarDespesa(id, dados, escopo);
      router.dismissTo('/despesas');
    } catch (e) {
      if (e instanceof DespesaIndisponivel) {
        router.replace('/despesas');
        return;
      }

      setErro(MSG_DESPESA.falhaSalvar);
      setSalvando(false);
    }
  }

  function aoSalvar(dados: DespesaInput) {
    if (emSerie) {
      setPendente(dados);
    } else {
      void gravar(dados, 'esta');
    }
  }

  if (carregando && !inicial) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: cores.fundo,
        }}
      >
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  if (erroLeitura || !inicial) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: cores.fundo,
          padding: 24,
        }}
      >
        <Text style={{ color: cores.erro, textAlign: 'center' }}>
          {MSG_DESPESA.falhaLeitura}
        </Text>

        <Pressable
          onPress={() => void carregar()}
          style={{ marginTop: 12, padding: 12 }}
          accessibilityRole="button"
        >
          <Text style={{ color: cores.primaria, fontWeight: '700' }}>
            Tentar novamente
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: cores.fundo }}
      edges={['top', 'bottom']}
    >
      <DespesaForm
        titulo="Editar despesa"
        textoSalvar="Salvar alterações"
        inicial={inicial}
        salvando={salvando}
        erroGeral={erro}
        onSalvar={aoSalvar}
        onCancelar={() => router.back()}
      />

      <OpcoesModal
        visivel={!!pendente}
        titulo="Aplicar alterações a quais despesas?"
        mensagem="Escolha quais ocorrências da repetição devem receber as alterações."
        opcoes={[
          {
            rotulo: 'Só esta',
            onPress: () => pendente && void gravar(pendente, 'esta'),
          },
          {
            rotulo: 'Esta e as próximas',
            onPress: () => pendente && void gravar(pendente, 'proximas'),
          },
          {
            rotulo: 'Todas',
            onPress: () => pendente && void gravar(pendente, 'todas'),
          },
        ]}
        onCancelar={() => setPendente(null)}
      />
    </SafeAreaView>
  );
}
