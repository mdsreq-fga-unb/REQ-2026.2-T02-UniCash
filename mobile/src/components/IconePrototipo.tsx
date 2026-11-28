import { Image, type ImageStyle, type StyleProp } from 'react-native';

const imagens = {
  resumo: require('../assets/prototipo/resumo.png'),
  movimentacoes: require('../assets/prototipo/movimentacoes.png'),
  metas: require('../assets/prototipo/metas.png'),
  perfil: require('../assets/prototipo/perfil.png'),
  offline: require('../assets/prototipo/offline.png'),
  menos: require('../assets/prototipo/menos.png'),
  mais: require('../assets/prototipo/mais.png'),
  relatorios: require('../assets/prototipo/relatorios.png'),
  editar: require('../assets/prototipo/editar.png'),
  sincronizar: require('../assets/prototipo/sincronizar.png'),
  ajuda: require('../assets/prototipo/ajuda.png'),
  tutorial: require('../assets/prototipo/tutorial.png'),
  direita: require('../assets/prototipo/direita.png'),
  voltar: require('../assets/prototipo/voltar.png'),
  expandir: require('../assets/prototipo/expandir.png'),
  calendario: require('../assets/prototipo/calendario.png'),
};

export type NomeIcone = keyof typeof imagens;

export function IconePrototipo({ nome, tamanho = 20, style }: {
  nome: NomeIcone;
  tamanho?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      accessible={false}
      source={imagens[nome]}
      resizeMode="contain"
      style={[{ width: tamanho, height: tamanho }, style]}
    />
  );
}
