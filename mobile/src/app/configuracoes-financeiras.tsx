import { router } from 'expo-router';
import { Botao } from '@/components/conta/Botao';
import { TelaConta } from '@/components/conta/TelaConta';

export default function ConfiguracoesFinanceiras() {
  return (
    <TelaConta titulo="Configurações financeiras" onVoltar={() => router.back()}>
      <Botao rotulo="Saldo inicial" tipo="contorno" onPress={() => router.push('/saldo-inicial')} />
    </TelaConta>
  );
}
