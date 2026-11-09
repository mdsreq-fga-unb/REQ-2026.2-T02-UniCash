import { FalhaPersistencia, registrarReceita } from '@/features/receitas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

describe('Registrar receita (fluxo A)', () => {
  let banco: BancoFalso;
  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });
  afterEach(restaurarTempo);

  it('registra receita única com campos válidos, pendente de sincronização', async () => {
    await registrarReceita(input({ descricao: 'Logo para a empresa júnior' }));

    const linhas = banco.receitas();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      valor_centavos: 15000,
      data: '2026-10-16',
      titulo: 'Freela de design',
      descricao: 'Logo para a empresa júnior',
      recorrencia_id: null,
      sync_status: 'pendente',
      excluido_em: null,
    });
    expect(linhas[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(linhas[0].criado_em).toBeTruthy();
    expect(linhas[0].atualizado_em).toBeTruthy();
  });

  it('guarda o valor como inteiro em centavos', async () => {
    await registrarReceita(input({ valorCentavos: 123456 }));
    const r = banco.sqlite.prepare('SELECT valor_centavos, typeof(valor_centavos) AS tipo FROM receitas').get() as any;
    expect(r).toEqual({ valor_centavos: 123456, tipo: 'integer' });
  });

  it('descrição vazia é aceita (gravada como nula)', async () => {
    await registrarReceita(input({ descricao: null }));
    expect(banco.receitas()[0].descricao).toBeNull();
  });

  it('receita não tem categoria (RN13)', () => {
    const colunas = (banco.sqlite.prepare('PRAGMA table_info(receitas)').all() as any[]).map((c) => c.name);
    expect(colunas).not.toContain('categoria');
    expect(colunas).toEqual(
      expect.arrayContaining(['id', 'valor_centavos', 'data', 'titulo', 'descricao', 'recorrencia_id', 'sync_status', 'excluido_em']),
    );
  });

  it('o banco rejeita valor menor ou igual a zero (defesa em profundidade, RN09)', () => {
    expect(() =>
      banco.sqlite
        .prepare(
          "INSERT INTO receitas (id,valor_centavos,data,titulo,criado_em,atualizado_em) VALUES ('x',0,'2026-10-16','t','a','a')",
        )
        .run(),
    ).toThrow();
  });

  it('falha na gravação: nada é registrado e o erro é de persistência (EX03)', async () => {
    banco.falharNaOperacao(1);
    await expect(registrarReceita(input())).rejects.toBeInstanceOf(FalhaPersistencia);
    expect(banco.receitas()).toHaveLength(0);
  });
});
