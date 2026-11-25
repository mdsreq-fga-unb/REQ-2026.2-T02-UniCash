import { useState } from 'react';
import { Text } from 'react-native';
import { abrirTutorial } from '@/features/tutorial/navegacao';
import { MSG_ABERTURA_TUTORIAL } from '@/features/tutorial/conteudo';
import { AcaoTutorial, estilos } from './Interface';

export function EntradaTutorial({ texto }: { texto: string }) {
  const [erro, setErro] = useState(false);

  function abrir() {
    try {
      abrirTutorial();
      setErro(false);
    } catch {
      setErro(true);
    }
  }

  return (
    <>
      {erro && <Text accessibilityRole="alert" style={estilos.erro}>{MSG_ABERTURA_TUTORIAL}</Text>}
      <AcaoTutorial texto={erro ? 'Tentar novamente' : texto} onPress={abrir} />
    </>
  );
}
