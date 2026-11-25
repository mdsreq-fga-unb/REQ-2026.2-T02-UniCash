import { router } from 'expo-router';

export const PRAZO_ABERTURA_TUTORIAL_MS = 2000;

let proximaTentativa = 0;
const aberturas = new Map<string, (abriu: boolean) => void>();

/** A navegação é enfileirada. Só o foco da tela de destino confirma a abertura. */
export function abrirTutorial(origem: 'manual' | 'primeiro-acesso' = 'manual'): Promise<boolean> {
  const tentativa = String(++proximaTentativa);

  return new Promise((resolver) => {
    const prazo = setTimeout(() => concluir(false), PRAZO_ABERTURA_TUTORIAL_MS);

    function concluir(abriu: boolean) {
      clearTimeout(prazo);
      aberturas.delete(tentativa);
      resolver(abriu);
    }

    aberturas.set(tentativa, concluir);
    try {
      router.push({ pathname: '/tutorial', params: { origem, tentativa } });
    } catch {
      concluir(false);
    }
  });
}

export function confirmarAberturaTutorial(tentativa?: string): void {
  if (tentativa) aberturas.get(tentativa)?.(true);
}
