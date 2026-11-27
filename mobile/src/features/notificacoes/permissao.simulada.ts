import type { EstadoPermissao, NotificationPermission } from './types';

/** Versão simulada da permissão do aparelho, para testes (DoR do UC14). */
export function criarPermissaoSimulada(inicial: EstadoPermissao, respostaAoSolicitar: EstadoPermissao = 'concedida') {
  let estado = inicial;
  const chamadas = { solicitar: 0, pedidosAoSistema: 0, abrirConfiguracoes: 0 };
  const permissao: NotificationPermission & { chamadas: typeof chamadas; definir(e: EstadoPermissao): void } = {
    chamadas,
    definir(e) {
      estado = e;
    },
    async consultar() {
      return estado;
    },
    async solicitar() {
      chamadas.solicitar++;
      if (estado === 'nao-decidida') {
        chamadas.pedidosAoSistema++;
        estado = respostaAoSolicitar;
      }
      return estado;
    },
    async abrirConfiguracoes() {
      chamadas.abrirConfiguracoes++;
    },
  };
  return permissao;
}
