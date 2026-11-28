import { useCallback, useRef, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { AcaoTutorial, estilos, TelaTutorial } from '@/components/tutorial/Interface';
import { destinos, etapas, glossario, MSG_ABERTURA_TUTORIAL } from '@/features/tutorial/conteudo';
import { confirmarAberturaTutorial } from '@/features/tutorial/navegacao';
import { registrarTutorialOferecido } from '@/features/tutorial/estado';

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
    <TelaTutorial>
      <Text style={estilos.progresso}>Etapa {indice + 1} de {etapas.length}</Text>
      <Text accessibilityRole="header" style={estilos.titulo}>{etapa.titulo}</Text>
      <Text style={estilos.texto}>{etapa.texto}</Text>
      {etapa.termos.map((termo) => (
        <View key={termo} style={estilos.cartao}>
          <Text style={estilos.termo}>{termo[0].toUpperCase() + termo.slice(1)}</Text>
          <Text style={estilos.texto}>{glossario[termo]}</Text>
        </View>
      ))}
      {erro && <Text accessibilityRole="alert" style={estilos.erro}>{MSG_ABERTURA_TUTORIAL}</Text>}
      {'destino' in etapa && (
        <AcaoTutorial texto={erro ? 'Tentar novamente' : etapa.acao} disabled={encerrando}
          onPress={() => visitar(etapa.destino)} />
      )}
      <AcaoTutorial
        texto={ultima ? 'Concluir tutorial' : 'Avançar'}
        principal
        disabled={encerrando}
        onPress={ultima ? encerrar : () => { setErro(false); setIndice(indice + 1); }}
      />
      {indice > 0 && (
        <AcaoTutorial texto="Voltar" disabled={encerrando} onPress={() => {
          setErro(false);
          setIndice((atual) => Math.max(0, atual - 1));
        }} />
      )}
      <AcaoTutorial texto="Encerrar tutorial" disabled={encerrando} onPress={encerrar} />
    </TelaTutorial>
  );
}
