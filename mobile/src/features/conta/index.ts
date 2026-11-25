import { criarAuthFirebase, iniciarObservadorDeSessao } from './auth.firebase';
import { criarContaServiceFirebase } from './service.firebase';
import { definirServicoConta } from './service';
import { aoMudarSessao } from './sessao';
import { definirSincronizacao, obterSincronizacao } from './sync';
import { criarSincronizacaoDoApp } from './sync.app';

let iniciado = false;

/**
 * Liga o UC10 ao Firebase e à sincronização do app. Chamar uma vez, no topo de src/app/_layout.tsx:
 *   import { iniciarConta } from '@/features/conta';
 *   iniciarConta();
 */
export function iniciarConta() {
  if (iniciado) return;
  iniciado = true;

  definirSincronizacao(criarSincronizacaoDoApp());
  definirServicoConta(criarContaServiceFirebase(criarAuthFirebase()));

  // B4 / D2: sessão ativa retoma a sincronização (enviando pendências) e restaura os dados em
  // aparelho novo (FA02); sem sessão suspende. Falhas aqui não derrubam a sessão (EX08).
  aoMudarSessao((s) => {
    const sync = obterSincronizacao();
    if (s.status === 'ativa') {
      sync
        .retomar(s.uid)
        .then(() => sync.restaurarSeAparelhoVazio(s.uid))
        .catch(() => {});
    } else {
      sync.suspender().catch(() => {});
    }
  });

  iniciarObservadorDeSessao();
}
