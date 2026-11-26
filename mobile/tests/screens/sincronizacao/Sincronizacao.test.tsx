import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

it('mostra a fila offline, reflete o ciclo e é operável pelos rótulos de texto', async () => {
  let recarregar = () => {};
  jest.mocked(syncService.assinar).mockImplementation((ouvinte) => {
    recarregar = ouvinte;
    return jest.fn();
  });
  consultar.mockResolvedValueOnce({
    estado: {
      status: 'sem-conexao', codigo: 'EX02', quantidadePendencias: 1,
      ultimaSincronizacao: null, sincronizando: false,
    },
    pendencias: [{ tipo: 'Despesa', id: '1', titulo: 'Ônibus', alteracao: 'Envio', estado: 'pendente' }],
  });

  await render(<TelaSincronizacao />);

  expect(screen.getByText('Sem conexão')).toBeTruthy();
  expect(screen.getByText(mensagensSincronizacao.EX02)).toBeTruthy();
  expect(screen.getByText('Pendências: 1')).toBeTruthy();
  expect(screen.getByText('Ônibus')).toBeTruthy();
  expect(screen.getByText('Despesa · Envio · Pendente')).toBeTruthy();

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
