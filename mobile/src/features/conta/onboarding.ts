import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_CONTINUAR_SEM_CONTA = 'unicash:continuar-sem-conta';

export async function decidirContinuarSemConta(): Promise<boolean> {
  return (await AsyncStorage.getItem(CHAVE_CONTINUAR_SEM_CONTA)) === '1';
}

export async function salvarContinuidadeSemConta(): Promise<void> {
  await AsyncStorage.setItem(CHAVE_CONTINUAR_SEM_CONTA, '1');
}
