import { useState, type ReactNode } from 'react';
import { Text } from 'react-native';
import { abrirTutorial } from '@/features/tutorial/navegacao';
import { MSG_ABERTURA_TUTORIAL } from '@/features/tutorial/conteudo';
import { AcaoTutorial, estilos } from './Interface';

export function EntradaTutorial({ texto, renderAcao }: {
  texto: string;
  renderAcao?: (props: { texto: string; desabilitada: boolean; onPress: () => void }) => ReactNode;
}) {
  const [estado, setEstado] = useState<'pronto' | 'abrindo' | 'erro'>('pronto');

  async function abrir() {
    setEstado('abrindo');
    setEstado(await abrirTutorial() ? 'pronto' : 'erro');
  }

  const rotulo = estado === 'erro' ? 'Tentar novamente' : texto;
  const desabilitada = estado === 'abrindo';
  const onPress = () => { void abrir(); };

  return (
    <>
      {estado === 'erro' && <Text accessibilityRole="alert" style={estilos.erro}>{MSG_ABERTURA_TUTORIAL}</Text>}
      {renderAcao
        ? renderAcao({ texto: rotulo, desabilitada, onPress })
        : <AcaoTutorial texto={rotulo} disabled={desabilitada} onPress={onPress} />}
    </>
  );
}
