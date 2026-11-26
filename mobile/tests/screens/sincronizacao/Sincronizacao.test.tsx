import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { definirSessao } from '@/features/conta/sessao';
import TelaSincronizacao from '@/app/sincronizacao';
import { syncService } from '@/features/sincronizacao/service';
import { mensagensSincronizacao } from '@/features/sincronizacao/contrato';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (efeito: Parameters<typeof useEffect>[0]) => useEffect(efeito, [efeito]),
    router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() },
  };
});
jest.mock('@/features/sincronizacao/service', () => ({
  syncService: { consultar: jest.fn(), sincronizarAgora: jest.fn(), assinar: jest.fn() },
}));

const consultar = jest.mocked(syncService.consultar);
const sincronizar = jest.mocked(syncService.sincronizarAgora);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(syncService.assinar).mockReturnValue(jest.fn());
  definirSessao({ status: 'ativa', uid: 'uc16', email: 'teste@example.com' });
});


it('mostra a fila offline, reflete o ciclo e é operável pelos rótulos de texto', async () => {
  let recarregar = () => {};
  jest.mocked(syncService.assinar).mockImplementation((ouvinte) => {
    recarregar = ouvinte;
    return jest.fn();
  });
  consultar.mockResolvedValueOnce({
    estado: {
      status: 'sem-conexao', codigo: 'EX01', quantidadePendencias: 1,
      ultimaSincronizacao: null, sincronizando: false,
    },
    pendencias: [{ tipo: 'Despesa', id: '1', titulo: 'Ônibus', alteracao: 'Criação', estado: 'pendente' }],
  });

  await render(<TelaSincronizacao />);

  expect(screen.getByText('Sem conexão')).toBeTruthy();
  expect(screen.getByText(mensagensSincronizacao.EX01)).toBeTruthy();
  expect(screen.getByText('Pendências: 1')).toBeTruthy();
  expect(screen.getByText('Ônibus')).toBeTruthy();
  expect(screen.getByText('Despesa · Criação · Pendente')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar agora' }));
  expect(sincronizar).toHaveBeenCalledTimes(1);

  consultar.mockResolvedValueOnce({
    estado: {
      status: 'sincronizado', codigo: null, quantidadePendencias: 0,
      ultimaSincronizacao: '2026-11-26T15:00:00.000Z', sincronizando: false,
    },
    pendencias: [],
  });

  await act(() => recarregar());

  expect(screen.getByText('Sincronizado')).toBeTruthy();
  expect(screen.getByText('Pendências: 0')).toBeTruthy();
  expect(screen.getByText(/Última sincronização\s+26\/11\/2026/)).toBeTruthy();
  expect(screen.queryByText('Ônibus')).toBeNull();
});

it('oferece login e cadastro sem sessão e permite repetir a leitura local', async () => {
  definirSessao({ status: 'sem-sessao' });
  consultar.mockRejectedValueOnce(new Error('SQLite')).mockResolvedValueOnce({
    estado: {
      status: 'pendente', codigo: null, quantidadePendencias: 0,
      ultimaSincronizacao: null, sincronizando: false,
    },
    pendencias: [],
  });

  await render(<TelaSincronizacao />);

  expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Criar conta' })).toBeTruthy();
  expect(screen.getByText(mensagensSincronizacao.EX07)).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

  expect(screen.getByText('Pendências: 0')).toBeTruthy();
  expect(consultar).toHaveBeenCalledTimes(2);
});

it('mostra o motivo da recusa junto ao item e permite repetir o envio', async () => {
  consultar.mockResolvedValueOnce({
    estado: {
      status: 'erro', codigo: 'EX04', quantidadePendencias: 1,
      ultimaSincronizacao: null, sincronizando: false,
    },
    pendencias: [{ tipo: 'Receita', id: '1', titulo: 'Freela', alteracao: 'Edição', estado: 'erro' }],
  });

  await render(<TelaSincronizacao />);

  expect(screen.getByText('Receita · Edição · Erro')).toBeTruthy();
  expect(screen.getByText(mensagensSincronizacao.EX04)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo: Freela' }));
  expect(sincronizar).toHaveBeenCalledTimes(1);
});
