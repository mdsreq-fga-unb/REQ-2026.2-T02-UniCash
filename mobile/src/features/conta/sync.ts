/**
 * Porta de sincronização (RF62), sem caso de uso próprio (DoR). O contrato é o estado de
 * sincronização dos registros: sincronizado, pendente, sem conexão, erro.
 * A implementação real (banco local + Cloud Firestore) entra por definirSincronizacao().
 */
export interface SincronizacaoPort {
  marcarTodosComoPendentes(): Promise<void>;
  contarPendentes(): Promise<number>;
  sincronizar(): Promise<void>;

  /** FA01: impede o envio automático até autorização do usuário. */
  pausarEnvioAutomatico(): Promise<void>;

  /** B4: retoma a sincronização para a conta autenticada. */
  retomar(uid: string): Promise<void>;

  /** D2: suspende a sincronização. Os dados locais permanecem. */
  suspender(): Promise<void>;

  /** FA02 / RNF40: restaura os dados da conta em aparelho vazio. */
  restaurarSeAparelhoVazio(uid: string): Promise<void>;
}


function criarSincronizacaoSimulada(): SincronizacaoPort {
  return {
    async marcarTodosComoPendentes() {},
    async contarPendentes() {
      return 0;
    },
    async sincronizar() {},
    async pausarEnvioAutomatico() {},
    async retomar() {},
    async suspender() {},
    async restaurarSeAparelhoVazio() {},
  };
}

let atual: SincronizacaoPort = criarSincronizacaoSimulada();

export function definirSincronizacao(s: SincronizacaoPort) {
  atual = s;
}

export function obterSincronizacao(): SincronizacaoPort {
  return atual;
}
