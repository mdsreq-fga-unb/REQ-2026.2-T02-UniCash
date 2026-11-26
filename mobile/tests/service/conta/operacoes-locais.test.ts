import { serializarImportacao } from '@/features/conta/operacoes-locais';

it('aguarda a importação anterior do mesmo UID mesmo quando ela falha', async () => {
  let liberar!: () => void;
  const bloqueio = new Promise<void>(resolve => { liberar = resolve; });
  const primeira = serializarImportacao('A', async () => { await bloqueio; throw new Error('falha'); });
  const segunda = jest.fn(async () => 'ok');
  const seguinte = serializarImportacao('A', segunda);
  const falha = expect(primeira).rejects.toThrow('falha');
  await serializarImportacao('B', async () => {});
  expect(segunda).not.toHaveBeenCalled();
  liberar();
  await falha;
  await expect(seguinte).resolves.toBe('ok');
  expect(segunda).toHaveBeenCalledTimes(1);
});
