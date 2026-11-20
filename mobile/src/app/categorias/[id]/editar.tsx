import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CategoriaForm } from '@/components/categorias/CategoriaForm';
import { OpcoesModal } from '@/components/receitas/OpcoesModal';
import {
  buscarCategoria,
  editarCategoria,
  excluirCategoria,
  CategoriaIndisponivel,
  CategoriaPadraoProtegida,
  NomeDuplicado,
} from '@/features/categorias/service';
import { CATEGORIA_EXCLUIDA, CATEGORIA_SALVA, setFeedback } from '@/features/categorias/feedback';
import { solicitarSemeaduraAposExclusao } from '@/features/categorias/semeaduraPendente';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { EntradaCategoriaInvalida, MSG_CAT } from '@/features/categorias/validation';
import type { Categoria, CategoriaInput } from '@/features/categorias/types';
import { cores, raio } from '@/lib/theme';

/** Limite da linha do banco para o formato do formulário (centavos/centésimos preservados). */
function limiteInicial(c: Categoria): CategoriaInput['limite'] {
  if (c.limite_tipo === 'valor') return { tipo: 'valor', valor: c.limite_centavos ?? 0 };
  if (c.limite_tipo === 'percentual_renda') return { tipo: 'percentual_renda', valor: c.limite_percentual_centesimos ?? 0 };
  return null;
}

/** Fluxos C (editar) e D (excluir) do UC06. */
export default function EditarCategoria() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const padrao = !!categoria?.padrao;
  const ocupado = salvando || excluindo; // espelho visual; a defesa real é a trava síncrona

  /**
   * Trava síncrona compartilhada por gravar() e excluir(): fecha no mesmo ciclo
   * do toque, antes de qualquer renderização — não existe janela entre a ação e
   * os estados `salvando`/`excluindo` chegarem ao render. Bloqueia duas gravações,
   * duas exclusões e o cruzamento entre elas. É liberada no catch (inclusive
   * rejeição imediata) e NÃO é liberada no sucesso: a tela navega para fora e a
   * trava continua fechada para a tela antiga.
   */
  const emOperacao = useRef(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLeitura(false);
    try {
      const c = await buscarCategoria(id);
      if (!c) {
        // EX06: excluída em outro lugar — informa na listagem e volta.
        setFeedback({ tipo: 'erro', texto: MSG_CAT.indisponivel });
        router.replace('/categorias');
        return;
      }
      setCategoria(c);
    } catch {
      setErroLeitura(true); // EX08 — a exibição difere conforme já exista categoria carregada
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function gravar(dados: CategoriaInput): Promise<void> {
    if (emOperacao.current) return; // trava síncrona: exclusão em andamento ou envio duplicado
    emOperacao.current = true;
    setSalvando(true);
    setErroGeral(null);
    setErroNome(null);
    try {
      await editarCategoria(id, dados);
      sincronizarEmSegundoPlano();
      setFeedback(CATEGORIA_SALVA);
      router.dismissTo('/categorias');
      // Sucesso com navegação: a trava permanece — nada mais acontece nesta tela.
    } catch (e) {
      if (e instanceof NomeDuplicado) {
        setErroNome(MSG_CAT.nomeDuplicado); // EX07: erro no campo nome
      } else if (e instanceof CategoriaIndisponivel) {
        setFeedback({ tipo: 'erro', texto: MSG_CAT.indisponivel }); // EX06
        router.replace('/categorias');
        return; // a categoria não existe mais: a tela sai, a trava segue fechada
      } else if (e instanceof CategoriaPadraoProtegida) {
        setErroGeral(MSG_CAT.categoriaPadrao); // EX02
      } else if (e instanceof EntradaCategoriaInvalida) {
        setErroGeral(e.message); // defesa em profundidade (RN13/RN14)
      } else {
        setErroGeral(MSG_CAT.falhaSalvar); // EX03 e erros inesperados
      }
      emOperacao.current = false; // libera nova tentativa (inclusive rejeição imediata)
      setSalvando(false);
    }
  }

  async function excluir(): Promise<void> {
    if (emOperacao.current) return; // trava síncrona: gravação em andamento ou exclusão duplicada
    emOperacao.current = true;
    setExcluindo(true);
    try {
      await excluirCategoria(id);
      sincronizarEmSegundoPlano();
      // A exclusão já está confirmada. O sinal apenas agenda uma reavaliação da
      // semeadura no próximo foco, se o nome for reservado; falhas posteriores
      // não revertem a exclusão nem são tratadas como falha dela.
      if (categoria) solicitarSemeaduraAposExclusao(categoria.nome_normalizado);
      setFeedback(CATEGORIA_EXCLUIDA);
      router.dismissTo('/categorias');
      // Sucesso com navegação: a trava permanece — nada mais acontece nesta tela.
    } catch (e) {
      if (e instanceof CategoriaIndisponivel) {
        setFeedback({ tipo: 'erro', texto: MSG_CAT.indisponivel }); // EX06
        router.replace('/categorias');
        return; // a tela sai, a trava segue fechada
      }
      // EX02 não deveria ocorrer (o botão não existe para padrões) — defesa em profundidade.
      setErroGeral(e instanceof CategoriaPadraoProtegida ? MSG_CAT.categoriaPadrao : MSG_CAT.falhaExcluir);
      emOperacao.current = false; // libera nova tentativa (inclusive rejeição imediata)
      setExcluindo(false);
    }
  }

  if (!categoria) {
    // Aguardando a primeira carga, ou EX06 já encaminhado (o replace está a caminho): spinner.
    if (carregando || !erroLeitura) {
      return (
        <View style={estilos.centro}>
          <ActivityIndicator color={cores.primaria} />
        </View>
      );
    }
    // EX08 sem dados carregados: mensagem e recuperação. Com dados carregados,
    // uma falha de atualização mantém o formulário — nada é perdido.
    return (
      <SafeAreaView style={estilos.centro} edges={['top', 'bottom']}>
        <Text style={estilos.erro}>{MSG_CAT.falhaLeitura}</Text>
        <Pressable onPress={() => void carregar()} style={estilos.tentar} accessibilityRole="button">
          <Text style={estilos.tentarTexto}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const inicial: CategoriaInput = { nome: categoria.nome, limite: limiteInicial(categoria) };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
      {/* Falha de ATUALIZAÇÃO com dados já carregados: o formulário permanece
          intacto (nada é perdido) e o aviso oferece a recuperação. */}
      {erroLeitura ? (
        <View style={estilos.bannerErro}>
          <Text style={estilos.bannerErroTexto}>!  Não foi possível atualizar a categoria.</Text>
          <Pressable
            onPress={() => void carregar()}
            style={estilos.tentarBanner}
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
          >
            <Text style={estilos.tentarBannerTexto}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}
      <CategoriaForm
        titulo="Editar categoria"
        textoSalvar="Salvar alterações"
        inicial={inicial}
        padrao={padrao}
        salvando={ocupado}
        erroGeral={erroGeral}
        erroNomeExterno={erroNome}
        onNomeAlterado={() => setErroNome(null)} // limpa o erro de duplicidade ao editar o nome
        onSalvar={gravar} // devolve a Promise: o formulário libera a trava quando ela termina
        onCancelar={() => router.back()}
      />

      {/* Fluxo D: exclusão apenas de categorias próprias (RN13); padrões não têm a opção. */}
      {!padrao ? (
        <Pressable
          onPress={() => setConfirmando(true)}
          disabled={ocupado}
          style={estilos.excluir}
          accessibilityRole="button"
          accessibilityLabel="Excluir categoria"
        >
          <Text style={[estilos.excluirTexto, ocupado && estilos.excluirTextoDesabilitado]}>Excluir categoria</Text>
        </Pressable>
      ) : null}

      <OpcoesModal
        visivel={confirmando}
        titulo="Excluir categoria?"
        mensagem={`A categoria “${categoria.nome}” será excluída e o limite de gastos associado será perdido. Esta ação não pode ser desfeita. Quando a integração com despesas (UC02) estiver disponível, os lançamentos relacionados serão mantidos e ficarão como “Sem categoria”.`}
        opcoes={[
          {
            rotulo: 'Excluir',
            destrutiva: true,
            onPress: () => {
              setConfirmando(false);
              void excluir();
            },
          },
        ]}
        onCancelar={() => setConfirmando(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo, padding: 24 },
  erro: { color: cores.erro, fontSize: 14, textAlign: 'center' },
  tentar: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tentarTexto: { color: cores.primaria, fontWeight: '700' },
  bannerErro: {
    backgroundColor: cores.erro,
    borderRadius: raio.cartao,
    padding: 14,
    paddingBottom: 8,
    marginHorizontal: 12,
    marginTop: 8,
  },
  bannerErroTexto: { color: cores.branco, fontSize: 13, fontWeight: '600' },
  tentarBanner: {
    alignSelf: 'flex-start',
    backgroundColor: cores.branco,
    borderRadius: raio.botao,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  tentarBannerTexto: { color: cores.erro, fontWeight: '700', fontSize: 13 },
  excluir: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  excluirTexto: { color: cores.erro, fontWeight: '600', fontSize: 15 },
  excluirTextoDesabilitado: { opacity: 0.5 },
});
