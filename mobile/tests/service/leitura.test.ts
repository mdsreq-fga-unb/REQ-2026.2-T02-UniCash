import { getDb } from '@/db/database';
import {
  buscarReceita,
  FalhaLeitura,
  listarReceitas,
  registrarReceita,
} from '@/features/receitas/service';
import { instalarBanco } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

describe('EX08: falha na leitura local', () => {
  it('listar lança FalhaLeitura quando a base não abre', async () => {
    (getDb as jest.Mock).mockRejectedValue(new Error('disco indisponível'));
    await expect(listarReceitas('2026-10-01', '2026-11-01')).rejects.toBeInstanceOf(FalhaLeitura);
  });

  it('detalhar lança FalhaLeitura quando a base não abre', async () => {
    (getDb as jest.Mock).mockRejectedValue(new Error('disco indisponível'));
    await expect(buscarReceita('qualquer')).rejects.toBeInstanceOf(FalhaLeitura);
  });

  it('ao tentar novamente (base disponível) a leitura funciona', async () => {
    (getDb as jest.Mock).mockRejectedValueOnce(new Error('falha momentânea'));
    await expect(listarReceitas('2026-10-01', '2026-11-01')).rejects.toBeInstanceOf(FalhaLeitura);

    instalarBanco();
    await registrarReceita(input());
    const r = await listarReceitas('2026-10-01', '2026-11-01');
    expect(r.itens).toHaveLength(1);
  });
});
