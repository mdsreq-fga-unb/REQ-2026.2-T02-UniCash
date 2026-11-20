import {
  consumirSolicitacaoSemeadura,
  limparSolicitacaoSemeadura,
  solicitarSemeaduraAposExclusao,
} from '@/features/categorias/semeaduraPendente';

describe('Sinal de semeadura após exclusão', () => {
  beforeEach(limparSolicitacaoSemeadura);

  it('não marca nomes que não são reservados', () => {
    solicitarSemeaduraAposExclusao('mercado');
    expect(consumirSolicitacaoSemeadura()).toBe(false);
  });

  it('marca nome reservado normalizado e consome uma única vez', () => {
    solicitarSemeaduraAposExclusao('  CASA  ');
    expect(consumirSolicitacaoSemeadura()).toBe(true);
    expect(consumirSolicitacaoSemeadura()).toBe(false);
  });
});
