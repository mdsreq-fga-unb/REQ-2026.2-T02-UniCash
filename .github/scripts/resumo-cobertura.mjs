// Monta o resumo de cobertura do Jest em markdown (resumo da execução e comentário do PR).
// Uso: node .github/scripts/resumo-cobertura.mjs <coverage-summary.json> <saida.md>
import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

const [entrada, saida] = process.argv.slice(2);
const dados = JSON.parse(readFileSync(entrada, 'utf8'));
const raiz = process.cwd();

const METRICAS = [
  ['lines', 'Linhas'],
  ['statements', 'Instruções'],
  ['functions', 'Funções'],
  ['branches', 'Ramos'],
];

const selo = (pct) => (pct >= 90 ? '🟢' : pct >= 75 ? '🟡' : '🔴');
const fmt = (m) => `${selo(m.pct)} ${m.pct.toFixed(1)}% (${m.covered}/${m.total})`;

const linhas = [
  '<!-- cobertura-jest -->',
  '## Cobertura dos testes (Jest)',
  '',
  '| Métrica | Cobertura |',
  '|---|---|',
  ...METRICAS.map(([chave, nome]) => `| ${nome} | ${fmt(dados.total[chave])} |`),
  '',
];

// Os 10 arquivos com menos linhas cobertas (ignorando arquivos sem linhas executáveis).
const arquivos = Object.entries(dados)
  .filter(([nome, m]) => nome !== 'total' && m.lines.total > 0)
  .map(([nome, m]) => ({ nome: relative(raiz, nome), ...m }))
  .sort((a, b) => a.lines.pct - b.lines.pct)
  .slice(0, 10);

if (arquivos.length > 0) {
  linhas.push(
    '<details><summary>Arquivos menos cobertos</summary>',
    '',
    '| Arquivo | Linhas | Ramos |',
    '|---|---|---|',
    ...arquivos.map((a) => `| \`${a.nome}\` | ${fmt(a.lines)} | ${fmt(a.branches)} |`),
    '',
    '</details>',
    '',
  );
}

linhas.push('Relatório completo: artefato `coverage` da execução (abra `lcov-report/index.html`).', '');
writeFileSync(saida, linhas.join('\n'));
