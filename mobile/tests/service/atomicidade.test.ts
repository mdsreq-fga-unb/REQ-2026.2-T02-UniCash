import {
  editarReceita,
  excluirReceita,
  FalhaPersistencia,
  registrarReceita,
} from '@/features/receitas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

/**
 * RNF05 / RN11: se qualquer etapa da operação falhar, nenhum registro permanece parcialmente alterado.
 * Para cada operação, descobre quantas gravações ela faz e repete falhando em cada uma delas.
 */
async function verificarAtomicidade(
  preparar: (banco: BancoFalso) => Promise<void>,
  operacao: (banco: BancoFalso) => Promise<unknown>,
) {
  let banco = instalarBanco();
  await preparar(banco);
  const antes = banco.chamadas;
  await operacao(banco);
  const etapas = banco.chamadas - antes;
  expect(etapas).toBeGreaterThan(0);

  for (let k = 1; k <= etapas; k++) {
    banco = instalarBanco();
    await preparar(banco);
    const fotoAntes = banco.instantaneo();
    banco.falharNaOperacao(k);
    await expect(operacao(banco)).rejects.toBeInstanceOf(FalhaPersistencia);
    expect(banco.instantaneo()).toEqual(fotoAntes); // nada foi alterado, nem parcialmente
  }
}

describe('Atomicidade das operações (RNF05, RNF35)', () => {
  beforeEach(() => fixarHoje('2026-10-16'));
  afterEach(restaurarTempo);

  const serieMensal = () =>
    input({ data: '2026-10-16', titulo: 'Mesada', recorrencia: { intervalo: 1, unidade: 'mes', termino: '2027-01-16' } });
  const idDaSerie = (b: BancoFalso, data: string) => `${b.recorrencias()[0].id}_${data}`;

  it('registrar receita única', async () => {
    await verificarAtomicidade(async () => {}, () => registrarReceita(input()));
  });

  it('registrar receita recorrente (série e todas as ocorrências ou nada)', async () => {
    await verificarAtomicidade(async () => {}, () => registrarReceita(serieMensal()));
  });

  it('editar receita única', async () => {
    await verificarAtomicidade(
      () => registrarReceita(input()),
      (b) => editarReceita(b.receitas()[0].id, input({ titulo: 'Editada', valorCentavos: 99900 })),
    );
  });

  it('transformar receita única em recorrente', async () => {
    await verificarAtomicidade(
      () => registrarReceita(input()),
      (b) =>
        editarReceita(
          b.receitas()[0].id,
          input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' } }),
        ),
    );
  });

  it.each(['esta', 'proximas', 'todas'] as const)('editar série no alcance "%s"', async (escopo) => {
    await verificarAtomicidade(
      () => registrarReceita(serieMensal()),
      (b) => editarReceita(idDaSerie(b, '2026-11-16'), input({ data: '2026-11-16', titulo: 'Reajuste', valorCentavos: 20000, recorrencia: { intervalo: 1, unidade: 'mes', termino: '2027-01-16' } }), escopo),
    );
  });

  it('refazer a série com nova repetição', async () => {
    await verificarAtomicidade(
      () => registrarReceita(serieMensal()),
      (b) =>
        editarReceita(
          idDaSerie(b, '2026-11-16'),
          input({ data: '2026-11-16', recorrencia: { intervalo: 15, unidade: 'dia', termino: '2026-12-31' } }),
          'proximas',
        ),
    );
  });

  it('excluir receita única', async () => {
    await verificarAtomicidade(
      () => registrarReceita(input()),
      (b) => excluirReceita(b.receitas()[0].id),
    );
  });

  it.each(['esta', 'proximas', 'todas'] as const)('excluir série no alcance "%s"', async (escopo) => {
    await verificarAtomicidade(
      () => registrarReceita(serieMensal()),
      (b) => excluirReceita(idDaSerie(b, '2026-11-16'), escopo),
    );
  });

  describe('encerramento forçado durante a gravação (RNF35)', () => {
    it('ao reabrir, o registro está ausente quando a gravação não terminou', async () => {
      const banco = instalarBanco();
      banco.falharNaOperacao(1);
      await expect(registrarReceita(input())).rejects.toBeInstanceOf(FalhaPersistencia);
      expect(banco.receitas()).toHaveLength(0);
    });

    it('série interrompida no meio não deixa ocorrências soltas nem série sem ocorrências', async () => {
      const banco = instalarBanco();
      banco.falharNaOperacao(3); // 1 = série, 2 = 1ª ocorrência, 3 = 2ª ocorrência
      await expect(registrarReceita(serieMensal())).rejects.toBeInstanceOf(FalhaPersistencia);
      expect(banco.receitas()).toHaveLength(0);
      expect(banco.recorrencias()).toHaveLength(0);
    });

    it('ao terminar a gravação, o registro está inteiro', async () => {
      const banco = instalarBanco();
      await registrarReceita(serieMensal());
      expect(banco.recorrencias()).toHaveLength(1);
      expect(banco.receitas()).toHaveLength(4);
    });
  });
});
