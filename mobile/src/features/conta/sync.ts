/**
 * Porta de sincronização (RF62), sem caso de uso próprio (DoR). O contrato é o estado de
 * sincronização dos registros: sincronizado, pendente, sem conexão, erro.
 * A implementação real (banco local + Cloud Firestore) entra por definirSincronizacao().
 */
export interface SincronizacaoPort {
  /** E6: marca todos os registros existentes no aparelho como pendentes. */
  marcarTodosComoPendentes(): Promise<void>;
  contarPendentes(): Promise<number>;
  /** Envia as pendências. Lança erro se não conseguir; os registros continuam pendentes (EX08). */
  sincronizar(): Promise<void>;
  /** B4: retoma a sincronização para a conta e envia as alterações pendentes. */
  retomar(uid: string): Promise<void>;
  /** D2: suspende a sincronização. Os dados locais permanecem (RN06). */
  suspender(): Promise<void>;
  /** FA02 / RNF40: em aparelho novo ou reinstalado, restaura os dados da conta a partir do Firestore. */
  restaurarSeAparelhoVazio(uid: string): Promise<void>;
}

function criarSincronizacaoSimulada(): SincronizacaoPort {
  return {
    async marcarTodosComoPendentes() {},
    async contarPendentes() {
      return 0;
    },
    async sincronizar() {},
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
