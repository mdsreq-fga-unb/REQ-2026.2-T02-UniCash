import { aoMudarSessao, definirSessao, obterSessao } from '@/features/conta/sessao';

beforeEach(() => definirSessao({ status: 'sem-sessao' }));

describe('sessão (contrato SessionState)', () => {
  it('começa sem sessão', () => {
    expect(obterSessao()).toEqual({ status: 'sem-sessao' });
  });

  it('definirSessao troca o estado', () => {
    definirSessao({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
    expect(obterSessao()).toEqual({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
  });

  it('aoMudarSessao avisa a cada mudança com o novo estado', () => {
    const ouvinte = jest.fn();
    const cancelar = aoMudarSessao(ouvinte);
    definirSessao({ status: 'ativa', uid: 'u1', email: 'a@b.com' });
    definirSessao({ status: 'sem-sessao' });
    expect(ouvinte).toHaveBeenNthCalledWith(1, { status: 'ativa', uid: 'u1', email: 'a@b.com' });
    expect(ouvinte).toHaveBeenNthCalledWith(2, { status: 'sem-sessao' });
    cancelar();
  });

  it('depois de cancelar, não avisa mais', () => {
    const ouvinte = jest.fn();
    aoMudarSessao(ouvinte)();
    definirSessao({ status: 'ativa', uid: 'u1', email: 'a@b.com' });
    expect(ouvinte).not.toHaveBeenCalled();
  });

  it('vários ouvintes recebem o aviso', () => {
    const a = jest.fn();
    const b = jest.fn();
    const ca = aoMudarSessao(a);
    const cb = aoMudarSessao(b);
    definirSessao({ status: 'ativa', uid: 'u1', email: 'a@b.com' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    ca();
    cb();
  });
});
