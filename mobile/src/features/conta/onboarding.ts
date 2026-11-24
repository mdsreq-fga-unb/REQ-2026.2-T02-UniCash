let continuidadeSemContaNestaSessao = false;

export function continuarSemContaNestaSessao(): boolean {
  return continuidadeSemContaNestaSessao;
}

export function resetarContinuidadeSemConta(): void {
  continuidadeSemContaNestaSessao = false;
}

export async function salvarContinuidadeSemConta(): Promise<void> {
  continuidadeSemContaNestaSessao = true;
}
