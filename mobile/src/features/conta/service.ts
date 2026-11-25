import { criarServicoSimulado } from './service.simulado';
import type { ContaService } from './types';

let servico: ContaService = criarServicoSimulado();

/** Ponto único de troca: a implementação com Firebase Authentication substitui a simulada aqui. */
export function definirServicoConta(s: ContaService) {
  servico = s;
}

export function obterServicoConta(): ContaService {
  return servico;
}
