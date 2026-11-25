import { useState } from 'react';
import { Text } from 'react-native';
import { abrirTutorial } from '@/features/tutorial/navegacao';
import { MSG_ABERTURA_TUTORIAL } from '@/features/tutorial/conteudo';
import { AcaoTutorial, estilos } from './Interface';

export function EntradaTutorial({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<'pronto' | 'abrindo' | 'erro'>('pronto');

  async function abrir() {
    setEstado('abrindo');
    setEstado(await abrirTutorial() ? 'pronto' : 'erro');
  }

  return (
    <>
      {estado === 'erro' && <Text accessibilityRole="alert" style={estilos.erro}>{MSG_ABERTURA_TUTORIAL}</Text>}
      <AcaoTutorial texto={estado === 'erro' ? 'Tentar novamente' : texto} disabled={estado === 'abrindo'} onPress={() => { void abrir(); }} />
    </>
  );
}
