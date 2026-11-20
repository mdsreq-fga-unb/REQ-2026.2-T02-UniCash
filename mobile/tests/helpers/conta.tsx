import { useLocalSearchParams } from 'expo-router';
import { definirSessao } from '@/features/conta/sessao';
import type { ContaService } from '@/features/conta/types';

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({})),
    Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, SafeAreaProvider: View };
});

jest.mock('@/features/conta/service', () => ({
  obterServicoConta: () => require('./conta').servico,
}));

/** Serviço de conta falso: cada teste define o que cada operação devolve. */
export const servico = {
  cadastrar: jest.fn(),
  verificarConfirmacao: jest.fn(),
  reenviarConfirmacao: jest.fn(),
  enviarDadosDoAparelho: jest.fn(),
  entrar: jest.fn(),
  enviarRecuperacao: jest.fn(),
  redefinirSenha: jest.fn(),
  contarPendentes: jest.fn(),
  sincronizarAgora: jest.fn(),
  sair: jest.fn(),
} as unknown as jest.Mocked<ContaService>;

/** Chamar no beforeEach: limpa chamadas, volta cada operação a "sucesso" e zera a sessão. */
export function reiniciar(params: Record<string, string> = {}) {
  jest.clearAllMocks();
  for (const f of Object.values(servico)) (f as jest.Mock).mockReset().mockResolvedValue(undefined);
  (servico.contarPendentes as jest.Mock).mockResolvedValue(0);
  (useLocalSearchParams as jest.Mock).mockReset().mockReturnValue(params);
  definirSessao({ status: 'sem-sessao' });
}
