import { getDb } from '@/db/database';
import { migrarSeNecessario } from '@/db/migrations';
import {
  deveOferecerTutorial,
  registrarTutorialOferecido,
} from '@/features/tutorial/estado';
import { instalarBanco } from '../helpers/fakeDb';

describe('UC15 — preferências locais', () => {
  let banco: ReturnType<typeof instalarBanco>;

  beforeEach(async () => {
    banco = instalarBanco();
    banco.sqlite.pragma('user_version = 7');
    await migrarSeNecessario(await getDb());
  });

  afterEach(() => banco.sqlite.close());

  it('oferece no primeiro acesso e mantém uma única chave persistida após regravações', async () => {
    expect(banco.sqlite.pragma('user_version', { simple: true })).toBe(8);
    const antes = banco.instantaneo();
    await expect(deveOferecerTutorial()).resolves.toBe(true);
    await Promise.all([registrarTutorialOferecido(), registrarTutorialOferecido()]);

    await expect(deveOferecerTutorial()).resolves.toBe(false);
    expect(banco.sqlite.prepare('SELECT * FROM preferencias_locais').all()).toEqual([
      { chave: 'tutorialOferecido', valor: 1 },
    ]);
    expect(banco.instantaneo()).toEqual(antes);
  });

  it('pode oferecer novamente quando a gravação falha', async () => {
    banco.falharNaOperacao(1);
    await expect(registrarTutorialOferecido()).rejects.toThrow();
    await expect(deveOferecerTutorial()).resolves.toBe(true);
  });
});
