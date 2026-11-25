import { useSyncExternalStore } from 'react';
import type { SessionState } from './types';

let atual: SessionState = { status: 'sem-sessao' };
const ouvintes = new Set<() => void>();

export function obterSessao(): SessionState {
  return atual;
}

/** Chamada pelo serviço de conta ao entrar, confirmar o e-mail ou sair. */
export function definirSessao(s: SessionState) {
  atual = s;
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

export function useSessao(): SessionState {
  return useSyncExternalStore(assinar, obterSessao, obterSessao);
}

/** Evento de mudança de sessão (contrato compartilhado com o UC11). Retorna a função que cancela a assinatura. */
export function aoMudarSessao(f: (s: SessionState) => void): () => void {
  return assinar(() => f(atual));
}
