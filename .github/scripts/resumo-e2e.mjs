// Monta o resumo do E2E (Maestro) em markdown: resultado de cada fluxo, galeria de prints e vídeo.
// Uso: node .github/scripts/resumo-e2e.mjs <relatorio.xml> <url-base-das-evidencias|""> <prints...> -- <saida.md>
// Os prints são caminhos relativos à pasta publicada na branch de evidências.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const fim = args.indexOf('--');
const [relatorio, urlBase, ...prints] = args.slice(0, fim);
const saida = args[fim + 1];
const execucao = process.env.URL_EXECUCAO ?? '';

const casos = [];
if (existsSync(relatorio)) {
  const xml = readFileSync(relatorio, 'utf8');
  for (const m of xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const nome = /name="([^"]*)"/.exec(m[1])?.[1] ?? '(sem nome)';
    const tempo = Number(/time="([^"]*)"/.exec(m[1])?.[1] ?? 0);
    const falha = /<(?:failure|error)\b([^>]*)/.exec(m[3] ?? '');
    const mensagem = falha ? (/message="([^"]*)"/.exec(falha[1])?.[1] || 'falhou') : null;
    casos.push({ nome, tempo, falha: mensagem });
  }
}

const passaram = casos.filter((c) => !c.falha).length;
const status = casos.length === 0 ? '⚠️ sem relatório' : passaram === casos.length ? '✅ todos passaram' : '❌ com falhas';

const linhas = [
  '<!-- e2e-maestro -->',
  `## Testes ponta a ponta (Maestro): ${status}`,
  '',
];

if (casos.length > 0) {
  linhas.push(
    `${passaram} de ${casos.length} fluxos passaram.`,
    '',
    '| Fluxo | Resultado | Tempo |',
    '|---|---|---|',
    ...casos.map((c) => `| ${c.nome} | ${c.falha ? `❌ ${c.falha.replace(/\|/g, '\\|')}` : '✅'} | ${c.tempo.toFixed(0)} s |`),
    '',
  );
}

if (urlBase) {
  const imagens = prints.filter((p) => p.endsWith('.png')).sort();
  const video = prints.find((p) => p.endsWith('.mp4'));
  if (imagens.length > 0) {
    linhas.push('### Prints', '', '<table><tr>');
    imagens.forEach((p, i) => {
      const nome = p.split('/').pop().replace('.png', '');
      if (i > 0 && i % 3 === 0) linhas.push('</tr><tr>');
      linhas.push(`<td align="center"><img src="${urlBase}/${p}" width="220"><br><sub>${nome}</sub></td>`);
    });
    linhas.push('</tr></table>', '');
  }
  if (video) linhas.push(`🎬 [Vídeo do fluxo](${urlBase}/${video})`, '');
}

if (execucao) linhas.push(`Execução e artefato \`e2e-uc13\` (relatório JUnit e saída do Maestro): ${execucao}`, '');
writeFileSync(saida, linhas.join('\n'));
