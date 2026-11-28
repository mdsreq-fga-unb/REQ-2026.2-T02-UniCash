import { useCallback, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { SafeAreaView } from 'react-native-safe-area-context';
import { IconePrototipo, type NomeIcone } from '@/components/IconePrototipo';
import { cores } from '@/lib/theme';
import { AcaoTutorial, estilos, TelaTutorial } from '@/components/tutorial/Interface';
import { destinos, etapas, glossario, MSG_ABERTURA_TUTORIAL } from '@/features/tutorial/conteudo';
import { confirmarAberturaTutorial } from '@/features/tutorial/navegacao';
import { registrarTutorialOferecido } from '@/features/tutorial/estado';

const icones: Record<(typeof etapas)[number]['id'], NomeIcone> = {
  informacao: 'carteiraTutorial',
  receita: 'listaTutorial',
  despesa: 'graficoTutorial',
  meta: 'metaTutorial',
  resumo: 'graficoTutorial',
};

export default function Tutorial() {
  const { origem, tentativa } = useLocalSearchParams<{ origem?: string; tentativa?: string }>();
  const [iniciado, setIniciado] = useState(origem !== 'primeiro-acesso');
  const [indice, setIndice] = useState(0);
  const [erro, setErro] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const encerrarEmAndamento = useRef(false);
  const etapa = etapas[indice];
  const ultima = indice === etapas.length - 1;

  const encerrar = useCallback(async () => {
    if (encerrarEmAndamento.current) return;
    encerrarEmAndamento.current = true;
    setEncerrando(true);
    try {
      await registrarTutorialOferecido();
    } catch {
      // EX02: o tutorial poderá ser oferecido de novo na próxima abertura.
    }
    router.dismissTo('/');
  }, []);

  useFocusEffect(useCallback(() => {
    confirmarAberturaTutorial(tentativa);
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      void encerrar();
      return true;
    });
    return () => inscricao.remove();
  }, [encerrar, tentativa]));

  function visitar(destino: keyof typeof destinos) {
    try {
      router.push(destinos[destino]);
      setErro(false);
    } catch {
      setErro(true);
    }
  }

  if (!iniciado) {
    return (
      <TelaTutorial>
        <Text accessibilityRole="header" style={estilos.titulo}>Boas-vindas ao UniCash</Text>
        <Text style={estilos.texto}>Aprenda a registrar seu dinheiro, criar metas e entender o resumo.</Text>
        <AcaoTutorial texto="Iniciar tutorial" principal disabled={encerrando} onPress={() => setIniciado(true)} />
        <AcaoTutorial texto="Pular tutorial" disabled={encerrando} onPress={encerrar} />
      </TelaTutorial>
    );
  }

  return (
    <SafeAreaView style={layout.tela}>
      <View style={layout.cabecalho}>
        <Text style={layout.marca}>UniCash</Text>
        <Pressable accessibilityRole="button" disabled={encerrando} onPress={encerrar} style={layout.encerrar}>
          <Text style={layout.link}>Encerrar tutorial</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={layout.conteudo}>
        <View style={layout.pictograma}>
          <IconePrototipo nome={icones[etapa.id]} tamanho={37} />
        </View>
        <Text accessibilityRole="header" style={layout.titulo}>{etapa.titulo}</Text>
        <Text style={layout.texto}>{etapa.texto}</Text>
        {etapa.termos.length > 0 && (
          <View style={layout.exemplo}>
            {etapa.termos.map((termo) => (
              <View key={termo}>
                <Text style={layout.termo}>{termo[0].toUpperCase() + termo.slice(1)}</Text>
                <Text style={layout.explicacao}>{glossario[termo]}</Text>
              </View>
            ))}
          </View>
        )}
        {erro && <Text accessibilityRole="alert" style={estilos.erro}>{MSG_ABERTURA_TUTORIAL}</Text>}
        {'destino' in etapa && (
          <AcaoTutorial texto={erro ? 'Tentar novamente' : etapa.acao} disabled={encerrando}
            onPress={() => visitar(etapa.destino)} />
        )}
      </ScrollView>
      <View style={layout.rodape}>
        <View accessible accessibilityLabel={`Etapa ${indice + 1} de ${etapas.length}`} style={layout.indicadores}>
          {etapas.map(({ id }, posicao) => (
            <View key={id} style={[layout.ponto, posicao === indice && layout.pontoAtivo]} />
          ))}
        </View>
        <View style={layout.acoes}>
          {indice > 0 && (
            <View style={layout.acao}>
              <AcaoTutorial texto="Voltar" disabled={encerrando} onPress={() => {
                setErro(false);
                setIndice((atual) => Math.max(0, atual - 1));
              }} />
            </View>
          )}
          <View style={layout.acao}>
            <AcaoTutorial texto={ultima ? 'Concluir tutorial' : 'Avançar'} principal disabled={encerrando}
              onPress={ultima ? encerrar : () => { setErro(false); setIndice(indice + 1); }} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const layout = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 49,
  },
  marca: { color: cores.marinho, fontSize: 16, fontWeight: '700' },
  encerrar: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  link: { color: cores.primaria, fontSize: 14 },
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: 16, gap: 18 },
  pictograma: {
    width: 104, height: 104, alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    borderRadius: 24, borderWidth: 1, borderColor: cores.borda,
  },
  titulo: { color: cores.marinho, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  texto: { color: cores.primaria, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  exemplo: { borderWidth: 1, borderColor: cores.borda, borderRadius: 12, padding: 14, gap: 10 },
  termo: { color: cores.marinho, fontSize: 14, fontWeight: '600' },
  explicacao: { color: cores.primaria, fontSize: 12, lineHeight: 17 },
  rodape: { borderTopWidth: 1, borderTopColor: cores.borda, padding: 16, paddingTop: 10, gap: 10 },
  indicadores: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: cores.claro },
  pontoAtivo: { backgroundColor: cores.primaria },
  acoes: { flexDirection: 'row', gap: 10 },
  acao: { flex: 1 },
});
