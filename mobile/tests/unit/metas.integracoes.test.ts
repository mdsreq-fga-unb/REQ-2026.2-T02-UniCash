import {
  limparNotificadoresMetas,
  notificarAlteracaoMeta,
  registrarNotificadorMetas,
} from '@/features/metas/integracoes';

describe('ponto de integração de metas (UC05/UC09)', () => {
  beforeEach(() => limparNotificadoresMetas());

  it('notifica consumidores registrados e permite cancelar', async () => {
    const recebidos: unknown[] = [];
    const cancelar = registrarNotificadorMetas({
      aoAlterarMeta: (evento) => {
        recebidos.push(evento);
      },
    });

    await notificarAlteracaoMeta({ tipo: 'criada', metaId: 'm1' });
    expect(recebidos).toEqual([{ tipo: 'criada', metaId: 'm1' }]);

    cancelar();
    await notificarAlteracaoMeta({ tipo: 'editada', metaId: 'm1' });
    expect(recebidos).toHaveLength(1);
  });

  it('falha de um consumidor não reverte nem interrompe os demais', async () => {
    const recebidos: string[] = [];
    registrarNotificadorMetas({
      aoAlterarMeta: () => {
        throw new Error('consumidor indisponível');
      },
    });
    registrarNotificadorMetas({
      aoAlterarMeta: (evento) => {
        recebidos.push(evento.metaId);
      },
    });

    await expect(
      notificarAlteracaoMeta({ tipo: 'excluida', metaId: 'm2' }),
    ).resolves.toBeUndefined();
    expect(recebidos).toEqual(['m2']);
  });
});
