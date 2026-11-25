import { getDb } from '@/db/database';

const CHAVE = 'tutorialOferecido';

export async function deveOferecerTutorial(): Promise<boolean> {
  const db = await getDb();
  const registro = await db.getFirstAsync<{ valor: number }>(
    'SELECT valor FROM preferencias_locais WHERE chave = ?',
    [CHAVE],
  );
  return registro?.valor !== 1;
}

export async function registrarTutorialOferecido(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO preferencias_locais (chave, valor) VALUES (?, 1)
     ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
    [CHAVE],
  );
}
