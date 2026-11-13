import { getDb } from '@/db/database';
import { excluirReceita, registrarReceita } from '@/features/receitas/service';
import { contarPendentes } from '@/features/receitas/pendencias';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

describe('Contador de pendências de sincronização', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });
  afterEach(restaurarTempo);

  const marcarTodasComoSincronizadas = () =>
    banco.sqlite.prepare("UPDATE receitas SET sync_status = 'sincronizado'").run();

  it('sem receitas: zero', async () => {
    expect(await contarPendentes()).toBe(0);
  });

  it('conta cada receita registrada que ainda não foi sincronizada', async () => {
    await registrarReceita(input({ titulo: 'A' }));
    await registrarReceita(input({ titulo: 'B' }));
    expect(await contarPendentes()).toBe(2);
  });

  it('ignora as já sincronizadas', async () => {
    await registrarReceita(input({ titulo: 'A' }));
    await registrarReceita(input({ titulo: 'B' }));
    marcarTodasComoSincronizadas();
    expect(await contarPendentes()).toBe(0);

    await registrarReceita(input({ titulo: 'C' }));
    expect(await contarPendentes()).toBe(1);
  });

  it('uma exclusão ainda não sincronizada também conta como pendente', async () => {
    await registrarReceita(input());
    marcarTodasComoSincronizadas();
    const id = banco.receitas()[0].id;

    await excluirReceita(id);
    expect(await contarPendentes()).toBe(1);
  });

  it('cada ocorrência de uma série pendente conta como um registro', async () => {
    // 16/10, 16/11 e 16/12/2026
    await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' } }));
    expect(await contarPendentes()).toBe(3);
  });

  it('resultado vazio da consulta é tratado como zero', async () => {
    (getDb as jest.Mock).mockResolvedValue({ getFirstAsync: jest.fn().mockResolvedValue(null) });
    expect(await contarPendentes()).toBe(0);
  });
});
