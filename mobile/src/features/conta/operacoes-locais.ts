const filas = new Map<string, Promise<unknown>>();

/** Serializa operações de importação no mesmo banco, inclusive após falha. */
export async function serializarImportacao<T>(uid: string, executar: () => Promise<T>): Promise<T> {
  const anterior = filas.get(uid) ?? Promise.resolve();
  const atual = anterior.catch(() => {}).then(executar);
  filas.set(uid, atual);
  try { return await atual; }
  finally { if (filas.get(uid) === atual) filas.delete(uid); }
}
