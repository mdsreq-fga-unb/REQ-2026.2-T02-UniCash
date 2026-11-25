import { fireEvent, render, screen } from '@testing-library/react-native';
import Tutorial from '@/app/tutorial';
import Ajuda from '@/app/ajuda';
import { Text } from 'react-native';
import { BancoPronto } from '@/db/Preparacao';
import { AcaoTutorial } from '@/components/tutorial/Interface';
import { PRAZO_ABERTURA_TUTORIAL_MS } from '@/features/tutorial/navegacao';
import { useOfertaTutorial } from '@/features/tutorial/useOfertaTutorial';
import { deveOferecerTutorial, registrarTutorialOferecido } from '@/features/tutorial/estado';
import { destinos, etapas, MSG_ABERTURA_TUTORIAL } from '@/features/tutorial/conteudo';
import { router, useLocalSearchParams } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/tutorial/estado');

async function tocar(nome: string) {
  await fireEvent.press(screen.getByRole('button', { name: nome }));
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(deveOferecerTutorial).mockResolvedValue(false);
});

it('oferece no primeiro acesso e permite pular, registrando a oferta', async () => {
  jest.mocked(deveOferecerTutorial).mockResolvedValueOnce(true);
  const resumo = await render(<BancoPronto.Provider value><Oferta /></BancoPronto.Provider>);
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/tutorial',
    params: { origem: 'primeiro-acesso', tentativa: expect.any(String) },
  });
  await resumo.unmount();
  (useLocalSearchParams as jest.Mock).mockReturnValue(router.push.mock.lastCall![0].params);
  await render(<Tutorial />);
  await tocar('Pular tutorial');
  expect(registrarTutorialOferecido).toHaveBeenCalledTimes(1);
  expect(router.dismissTo).toHaveBeenCalledWith('/');
});

it('percorre todas as etapas e conclui sem gravar até o final', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ origem: 'primeiro-acesso' });
  await render(<Tutorial />);
  await tocar('Iniciar tutorial');
  expect(screen.getByText(etapas[0].titulo)).toBeTruthy();

  for (const etapa of etapas.slice(1)) {
    await tocar('Avançar');
    expect(screen.getByText(etapa.titulo)).toBeTruthy();
  }

  expect(registrarTutorialOferecido).not.toHaveBeenCalled();
  await tocar('Concluir tutorial');
  expect(registrarTutorialOferecido).toHaveBeenCalledTimes(1);
  expect(router.dismissTo).toHaveBeenCalledWith('/');
});

it.each(etapas.map((etapa, i) => [etapa.id, i] as const))(
  'permite encerrar na etapa %s',
  async (_etapa, indice) => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    await render(<Tutorial />);
    for (let i = 0; i < indice; i++) await tocar('Avançar');
    await tocar('Encerrar tutorial');
    expect(registrarTutorialOferecido).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  },
);

it('mantém o resumo acessível quando a gravação falha (EX02)', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  jest.mocked(registrarTutorialOferecido).mockRejectedValueOnce(new Error('SQLite'));
  await render(<Tutorial />);
  await tocar('Encerrar tutorial');
  expect(router.dismissTo).toHaveBeenCalledWith('/');
});

it('oferece nova tentativa se o push da Ajuda não levar o tutorial ao foco (EX01)', async () => {
  const ajuda = await render(<Ajuda />);
  await tocar('Tutorial');
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(MSG_ABERTURA_TUTORIAL)).toBeNull();

  expect(await screen.findByText(MSG_ABERTURA_TUTORIAL, {}, {
    timeout: PRAZO_ABERTURA_TUTORIAL_MS + 1000,
  })).toBeTruthy();

  await tocar('Tentar novamente');
  const primeira = router.push.mock.calls[0][0].params;
  const segunda = router.push.mock.lastCall![0].params;
  expect(segunda).toEqual({ origem: 'manual', tentativa: expect.any(String) });
  expect(segunda.tentativa).not.toBe(primeira.tentativa);

  // O foco da tentativa antiga não deve confirmar a atual.
  (useLocalSearchParams as jest.Mock).mockReturnValue(primeira);
  await ajuda.rerender(<><Ajuda /><Tutorial /></>);
  expect(screen.getByRole('button', { name: 'Tutorial' })).toBeDisabled();

  (useLocalSearchParams as jest.Mock).mockReturnValue(segunda);
  await ajuda.rerender(<><Ajuda /><Tutorial /></>);
  expect(screen.getByRole('button', { name: 'Tutorial' })).toBeEnabled();
  expect(screen.queryByText(MSG_ABERTURA_TUTORIAL)).toBeNull();
});

it('mantém o resumo acessível quando a leitura da preferência falha', async () => {
  jest.mocked(deveOferecerTutorial).mockRejectedValueOnce(new Error('SQLite'));
  await render(<BancoPronto.Provider value><Oferta /></BancoPronto.Provider>);
  expect(await screen.findByText(MSG_ABERTURA_TUTORIAL)).toBeTruthy();
  expect(screen.getByText('Resumo disponível')).toBeTruthy();
});

it('não repete a oferta automática quando a preferência já existe', async () => {
  await render(<BancoPronto.Provider value><Oferta /></BancoPronto.Provider>);
  expect(await screen.findByText('Resumo disponível')).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();
});

it('abre cada tela de destino e preserva a etapa para continuar quando voltar', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  await render(<Tutorial />);
  for (const [acao, rota] of [
    ['Registrar receita', destinos['registrar-receita']],
    ['Registrar despesa', destinos['registrar-despesa']],
    ['Ver exemplo de meta', '/tutorial/criar-meta'],
    ['Ver meu resumo', '/tutorial/resumo'],
  ] as const) {
    await tocar('Avançar');
    await tocar(acao);
    expect(router.push).toHaveBeenLastCalledWith(rota);
    expect(screen.getByRole('button', { name: acao })).toBeTruthy();
  }
});

function Oferta() {
  const oferta = useOfertaTutorial(true);
  if (oferta.verificando) return null;
  return (
    <>
      <Text>Resumo disponível</Text>
      {oferta.falhou && (
        <>
          <Text>{MSG_ABERTURA_TUTORIAL}</Text>
          <AcaoTutorial texto="Tentar novamente" onPress={oferta.tentarNovamente} />
        </>
      )}
    </>
  );
}
