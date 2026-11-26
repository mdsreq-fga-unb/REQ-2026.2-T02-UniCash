# Contrato: módulo `src/features/conquistas`

```ts
export type MarcoId = 'no-verde' | 'primeira-meta';

export interface MetaConcluida { id: string; titulo: string; concluidaEm: string }
export interface FonteMetas { concluidas(): Promise<MetaConcluida[]> }

export interface Selo {
  chave: string;               // 'no-verde:2026-10' | 'primeira-meta'
  marco: MarcoId;
  nome: string;
  descricao: string;
  data: string;                // AAAA-MM-DD
  referencia:
    | { tipo: 'mes'; mes: string; receitasCentavos: number; despesasCentavos: number; saldoCentavos: number }
    | { tipo: 'meta'; metaId: string; titulo: string };
}

export interface PontuacaoMeta { metaId: string; titulo: string; concluidaEm: string; pontos: number }

export interface ResumoConquistas {
  totalPontos: number;
  metasConcluidas: number;
  pontosPorMeta: number;
  selos: Selo[];               // data decrescente
  pontuacoes: PontuacaoMeta[]; // concluidaEm decrescente
}

/** Pura, sem I/O. Testada com tabelas de casos. */
export function avaliar(entrada: { meses: TotaisMes[]; metas: MetaConcluida[] }): ResumoConquistas;

/** Lê a base e a FonteMetas. Lança FalhaLeituraConquistas (EX03). Não grava. */
export function consultarConquistas(fonte?: FonteMetas): Promise<ResumoConquistas>;

/** Detalhe de um selo pela chave; null se o selo não existir mais (FA08). */
export function consultarSelo(chave: string, fonte?: FonteMetas): Promise<Selo | null>;

/**
 * Avalia e emite notificações dos selos novos ou pendentes (R7).
 * Nunca lança: falha vira log e nova tentativa na próxima chamada (EX01, EX02).
 * Execuções concorrentes são serializadas (uma por vez).
 */
export function avaliarEEmitir(deps?: {
  fonte?: FonteMetas;
  preferencias?: NotificationPreferences;    // UC14
  permissao?: NotificationPermission;        // UC14
  emissor?: EmissorNotificacao;
}): Promise<void>;

export interface EmissorNotificacao {
  emitir(n: { titulo: string; corpo: string; rota: '/conquistas' }): Promise<void>;
}
```

## Mensagens (`mensagens.ts`)
| Chave | Texto |
|---|---|
| vazio | "Nenhuma conquista ainda." |
| vazioIncentivo | "Mantenha as contas no verde e conclua suas metas para ganhar selos e pontos." |
| semMetas | "Nenhuma meta concluída" |
| erroLeitura | "Não foi possível carregar as conquistas. Tente novamente." (EX03) |
| tentarNovamente | "Tentar novamente" |
| acessoNegado | "Você não tem acesso a estas conquistas." (EX04) |
| acessoNegadoDetalhe | "As conquistas são visíveis apenas para o próprio usuário." |
| irParaMinhas | "Ir para minhas conquistas" |
| tituloNotificacao | `Novo selo: ${nome}` |

## Rotas (UI)
| Rota | Tela | Parâmetros |
|---|---|---|
| `/conquistas` | CQ1, CQ3, CQ4, CQ6 | `uid?` (EX04) |
| `/conquistas/[chave]` | CQ2 | `chave` do selo |

Entrada: ícone de selo (`award`) no cabeçalho de `/perfil`, `accessibilityLabel="Conquistas"`.
