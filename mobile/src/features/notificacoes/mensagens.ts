import type { TipoAlerta } from './types';

export const ROTULOS_ALERTA: Record<TipoAlerta, string> = {
  limite: 'Alertas de limite (80% e 100%)',
  conquistas: 'Conquistas',
};

export const MSG_NOTIFICACOES = {
  titulo: 'Notificações',
  EX01: 'Não foi possível salvar a configuração. Nenhuma alteração foi feita. Tente novamente.',
  EX02: 'Não foi possível carregar as notificações. Tente novamente.',
  FA06: 'As notificações estão bloqueadas neste aparelho. Libere nas configurações do aparelho para receber os alertas.',
  abrirConfiguracoes: 'Abrir configurações',
  tentarNovamente: 'Tentar novamente',
} as const;
