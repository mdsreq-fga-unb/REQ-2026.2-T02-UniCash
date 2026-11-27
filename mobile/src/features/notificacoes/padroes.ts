import type { TipoAlerta } from './types';

/** Estado inicial de cada tipo (D25): todos desligados. Constante única, consultada quando não há escolha gravada. */
export const ESTADO_INICIAL: Readonly<Record<TipoAlerta, boolean>> = { limite: false, conquistas: false };
