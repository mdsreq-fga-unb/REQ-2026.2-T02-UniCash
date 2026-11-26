import { definirSincronizacao, obterSincronizacao, type SincronizacaoPort } from '@/features/conta/sync';

describe('porta de sincronização', () => {
  it('a implementação simulada não faz nada e não tem pendências', async () => {
    const s = obterSincronizacao();
    expect(await s.contarPendentes()).toBe(0);
    await expect(s.marcarTodosComoPendentes()).resolves.toBeUndefined();
    await expect(s.sincronizar()).resolves.toBeUndefined();
    await expect(s.retomar('u1')).resolves.toBeUndefined();
    await expect(s.suspender()).resolves.toBeUndefined();
    await expect(s.restaurarSeAparelhoVazio('u1')).resolves.toBeUndefined();
  });

  it('definirSincronizacao troca a implementação', () => {
    const outra = {} as SincronizacaoPort;
    definirSincronizacao(outra);
    expect(obterSincronizacao()).toBe(outra);
  });
});
