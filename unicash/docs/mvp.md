# Escopo do MVP (Minimum Viable Product) — UniCash

Este documento apresenta a especificação atualizada do **Minimum Viable Product (MVP)** do aplicativo **UniCash**, contendo a relação detalhada dos **Requisitos Funcionais (RFs)** selecionados e seus respectivos **Requisitos Não-Funcionais (RNFs)** associados.

---

## 1. Priorização do backlog e definição do MVP

A priorização original ([R05 — 25/09/2026](registros.md#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026)) usou a [planilha de priorização do UniCash](https://docs.google.com/spreadsheets/d/1uoo81vAhU673u4y6JfPPllNKDKD-qf1iN6xD9fmMXCw/edit?usp=sharing). As abas **valor**, **esforço** e **resumo** contêm RF01 a RF56. O gráfico desta página cruza as médias em uma matriz 4 × 4 de valor de negócio × esforço técnico. As notas de valor têm a seguinte interpretação:

| Nota | Interpretação do valor de negócio |
| :--- | :--- |
| **4** | Must have: essencial para o funcionamento e para a validação da proposta do UniCash |
| **3** | Should have: importante, mas pode ser entregue após o núcleo do MVP |
| **2** | Could have: oportunidade de evolução, sem impacto no funcionamento básico |
| **1** | Won't have now: não priorizado para a versão atual |

As notas individuais de valor orientam a priorização MoSCoW. A média e a célula da matriz apoiam a seleção, mas não atribuem sozinhas uma decisão final de inclusão: dependências e decisões de escopo também precisam ser registradas.

### 1.1 Cálculo das médias

As notas são calculadas em três passos:

1. **Valor de negócio:** somam-se as notas de Leinad, Alana e Maria e divide-se por três.
2. **Esforço de cada integrante:** somam-se as notas de esforço, complexidade e lacuna de capacidade e divide-se por três. Cada critério recebe uma nota de 1 a 4; quanto maior a nota, maior a dificuldade.
3. **Esforço técnico final:** calcula-se a média dos resultados de Natan, Dante, Erick, Evellyn e Caio, dividindo a soma por cinco. Todos têm o mesmo peso.

Os cinco integrantes preencheram os três critérios de RF01 a RF56. Bruno e Leonardo estão sem notas e não entram no cálculo; suas respostas ausentes não são consideradas zero.

Por exemplo, RF01 recebeu notas de valor **4, 4 e 2**, resultando em uma média de **3,33**. A média de esforço dos cinco integrantes é **1,93**. Isso coloca o requisito na faixa de valor alto e esforço moderado.

As médias completas são usadas na classificação. Os números apresentados no gráfico são arredondados para duas casas decimais.

| Média | Faixa | Valor de negócio | Esforço técnico |
| :--- | :--- | :--- | :--- |
| De 1 até menos de 1,5 | 1 | Baixo | Baixo |
| De 1,5 até menos de 2,5 | 2 | Moderado | Moderado |
| De 2,5 até menos de 3,5 | 3 | Alto | Alto |
| De 3,5 a 4 | 4 | Muito alto | Muito alto |

A aba **resumo** da planilha inclui os valores exatos de 1,5 e 2,5 nas faixas anteriores de esforço, enquanto o gráfico segue a tabela acima. Nenhum requisito tem esforço exatamente nesses limites, por isso a diferença não altera a classificação atual. Esse critério precisa ser unificado antes de novas avaliações.

A planilha cobre apenas RF01 a RF56; RF57 a RF64 ainda não têm notas nessa priorização.

### 1.2 Critério de decisão

<div id="matriz-valor-esforco" style="width:100%;height:1050px;"></div>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js" charset="utf-8"></script>
<script>
(function () {
  var D = [
    ["RF01","Cadastrar usuário",3.333333333,1.933333333],["RF02","Autenticar usuário",3.333333333,2],
    ["RF03","Visualizar perfil de usuário",3.666666667,1],["RF04","Editar perfil de usuário",3.666666667,1],
    ["RF05","Excluir perfil de usuário",4,1.266666667],["RF06","Encerrar sessão",4,1.533333333],
    ["RF07","Registrar receita",4,1.066666667],["RF08","Consultar receitas",4,1.066666667],
    ["RF09","Editar receita",4,1.066666667],["RF10","Excluir receita",4,1.066666667],
    ["RF11","Calcular total de receitas",4,1],["RF12","Criar meta financeira",4,1.466666667],
    ["RF13","Editar meta financeira",4,1],["RF14","Excluir meta financeira",4,1],
    ["RF15","Registrar despesa",4,1],["RF16","Consultar despesas",4,1.2],
    ["RF17","Editar despesa",4,1],["RF18","Excluir despesa",4,1],
    ["RF19","Criar categoria de despesas",4,1],["RF20","Visualizar metas financeiras",4,1],
    ["RF21","Importar extrato bancário",2.333333333,3.266666667],["RF22","Criar grupo de amigos ou família",3,2],
    ["RF23","Entrar em grupo de amigos ou família",2,1.933333333],["RF24","Convidar membro para grupo",2,2.333333333],
    ["RF25","Sair de grupo de amigos ou família",3,1.733333333],["RF26","Tornar controle financeiro privado",4,1.866666667],
    ["RF27","Visualizar metas de membros do grupo",2,2],["RF28","Criar meta do grupo",2,1.8],
    ["RF29","Visualizar metas do grupo",2,1.4],["RF30","Classificar usuários do grupo",2,1.666666667],
    ["RF31","Recuperar senha",3,2.533333333],["RF32","Definir lançamento recorrente",4,2.066666667],
    ["RF33","Editar ocorrência de lançamento recorrente",4,1.733333333],["RF34","Calcular saldo mensal",4,1.266666667],
    ["RF35","Reportar saldo anterior",4,1.4],["RF36","Acompanhar progresso da meta",4,1.2],
    ["RF37","Notificar aproximação do limite",4,2.266666667],["RF38","Notificar ultrapassagem do limite",4,2.266666667],
    ["RF39","Exibir indicador de categoria",3.666666667,1.933333333],["RF40","Gerar resumo financeiro inicial",4,1.866666667],
    ["RF41","Exibir gráfico de despesas",3.666666667,1.933333333],["RF42","Exibir percentual por categoria",3.666666667,1.666666667],
    ["RF43","Exibir previsão de faturas",2,2.2],["RF44","Conceder conquistas financeiras",4,2.266666667],
    ["RF45","Atribuir pontuação por metas",4,2.133333333],["RF46","Notificar conquista obtida",4,2.466666667],
    ["RF47","Classificar lançamentos importados",2,2.8],["RF48","Identificar lançamento duplicado",4,2.8],
    ["RF49","Consolidar extratos de contas",2,3.466666667],["RF50","Registrar despesa por comprovante",1,3.2],
    ["RF51","Definir papel de membro",3,2.133333333],["RF52","Consolidar dados do grupo",2,1.933333333],
    ["RF53","Comparar gastos do grupo",2,2.066666667],["RF54","Importar formatos de extrato",1,3.133333333],
    ["RF55","Apresentar tutorial inicial",4,2.066666667],["RF56","Avisar manutenção programada",4,2.733333333]
  ];
  var fmt = function (n) { return n.toFixed(2).replace(".", ","); };
  // cor por célula [valor][esforço]
  var C = {4:{1:"p",2:"m",3:"a",4:"pl"},3:{1:"m",2:"m",3:"a",4:"f"},2:{1:"a",2:"f",3:"f",4:"b"},1:{1:"a",2:"b",3:"b",4:"b"}};
  var COL = {p:"#8fdca3",m:"#cdeed3",a:"#cfe0fb",pl:"#fbe9b0",f:"#ececef",b:"#f6c9c9"};
  var xe = [0.8,1.5,2.5,3.5,4.2], ye = [0.8,1.5,2.5,3.5,4.0], shapes = [];
  for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
    shapes.push({type:"rect",xref:"x",yref:"y",x0:xe[i],x1:xe[i+1],y0:ye[j],y1:ye[j+1],
      fillcolor:COL[C[j+1][i+1]],line:{color:"#fff",width:2},layer:"below"});
  }
  // agrupa requisitos com médias idênticas
  var G = {};
  D.forEach(function (r) {
    var k = r[2].toFixed(3) + "|" + r[3].toFixed(3);
    (G[k] = G[k] || {v:r[2], e:r[3], r:[]}).r.push(r);
  });
  var pts = Object.keys(G).map(function (k) { return G[k]; });
  var trace = {
    type:"scatter", mode:"markers",
    x: pts.map(function (p) { return p.e; }),
    y: pts.map(function (p) { return p.v; }),
    marker:{size:9,color:"#1c1c1e",line:{color:"#fff",width:1}},
    customdata: pts.map(function (p) {
      return p.r.map(function (r) { return "<b>" + r[0] + "</b> " + r[1]; }).join("<br>")
        + "<br><br>Valor: " + fmt(p.v) + " | Esforço: " + fmt(p.e);
    }),
    hovertemplate: "%{customdata}<extra></extra>"
  };
  var notes = pts.map(function (p) {
    var lado = p.v > 3.5 && p.v < 3.9; // linha 3,67: rótulo horizontal, à direita
    return {x:p.e, y:p.v, xref:"x", yref:"y", showarrow:false,
      text: p.r.map(function (r) { return r[0]; }).join(" "),
      font:{size:11,color:"#1c1c1e"},
      textangle: lado ? 0 : -90,
      xanchor: lado ? "left" : "center",
      yanchor: lado ? "middle" : "bottom",
      xshift: lado ? 8 : 0, yshift: lado ? 0 : 8};
  });
  var layout = {
    title:{text:"Valor de Negócio × Esforço Técnico — Unicash",font:{size:25}},
    xaxis:{title:"Esforço técnico (média) →",range:[0.8,4.2],tickvals:[1,2,3,4],zeroline:false,showgrid:false,fixedrange:true},
    yaxis:{title:"Valor de negócio (média) →",range:[0.8,4.0],tickvals:[1,2,3,4],zeroline:false,showgrid:false,fixedrange:true},
    shapes:shapes, annotations:notes, showlegend:false,
    margin:{t:300,r:30,b:70,l:70}, paper_bgcolor:"#fff", plot_bgcolor:"#fff", hovermode:"closest"
  };
  Plotly.newPlot("matriz-valor-esforco", [trace], layout, {responsive:true, displayModeBar:false});
})();
</script>

<p style="font-size:13px;line-height:2">
<span style="background:#8fdca3;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Prioridade máxima</span>
<span style="background:#cdeed3;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Candidato / forte candidato ao MVP</span>
<span style="background:#cfe0fb;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Avaliar (viabilidade, contexto, oportunidade)</span>
<span style="background:#fbe9b0;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Planejar, reduzir ou decompor</span>
<span style="background:#ececef;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Entrega futura</span>
<span style="background:#f6c9c9;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Baixa prioridade</span>
</p>
Foram priorizados para o MVP os requisitos com valor médio igual ou aproximado a **4** e esforço baixo ou moderado, pois eles entregam alto valor com menor risco e permitem validar rapidamente a proposta central do aplicativo. A planilha classificou como prioridade principal os requisitos de gestão de perfil, receitas, metas, despesas, saldos, limites, relatórios, gamificação e onboarding que se encontram nesses quadrantes. Cadastro e autenticação foram mantidos como dependências estruturais do MVP, pois são necessários para proteger os dados financeiros e garantir que as demais funcionalidades sejam utilizadas por um usuário identificado.

### 1.3 Resultado da priorização

O recorte priorizado contempla:

| Frente do MVP | RFs relacionados | Escopo contemplado |
| :--- | :--- | :--- |
| **Núcleo financeiro** | RF07, RF08, RF09, RF10, RF11, RF15, RF16, RF17, RF18, RF34, RF35 | Registrar, consultar, editar e excluir receitas e despesas; calcular totais e saldo mensal; e reportar o saldo anterior. |
| **Metas e acompanhamento** | RF12, RF13, RF14, RF20, RF36 | Criar, editar, excluir e visualizar metas, além de acompanhar o progresso financeiro. |
| **Acesso e privacidade** | RF01, RF02, RF03, RF04, RF05, RF06 | Cadastrar e autenticar o usuário, visualizar e editar o perfil, encerrar a sessão e excluir a conta. |
| **Categorias, limites e relatórios** | RF19, RF37, RF38, RF39, RF40, RF41, RF42 | Criar categorias de despesas, notificar a aproximação ou ultrapassagem de limites e exibir o resumo e os indicadores financeiros. |
| **Recorrência e engajamento** | RF31, RF32, RF33, RF44, RF45, RF46 | Definir e editar lançamentos recorrentes, conceder conquistas, atribuir pontuação e notificar conquistas obtidas. |
| **Orientação inicial** | RF55 | Apresentar o tutorial inicial para reduzir a curva de aprendizado e apoiar o uso correto do aplicativo. |

Funcionalidades com menor valor médio, esforço técnico alto ou dependências ainda não resolvidas, como importações bancárias, recursos de grupos e automações mais avançadas, permanecem fora do núcleo do MVP e podem ser reavaliadas em releases posteriores. A matriz é um apoio à decisão: dependências, riscos de segurança, privacidade e integridade financeira também foram considerados antes da composição final do escopo.

---

## 2. Matriz de Rastreabilidade Resumida

| Requisito Funcional (RF) | Requisito Não-Funcional (RNF) Principal | Categoria |
| :--- | :--- | :--- |
| **RF01, RF02, RF06** | RNF01, RNF03, RNF07 (Segurança) | Gestão de Usuário e Acesso |
| **RF03, RF04, RF05** | RNF02, RNF05, RNF06 (Desempenho / LGPD) | Perfil e Privacidade |
| **RF07 a RF11** | RNF08, RNF09, RNF11 (Offline / Precisão) | Gestão de Receitas |
| **RF12 a RF14, RF20, RF36**| RNF12, RNF13, RNF15 (Usabilidade / UX) | Metas Financeiras |
| **RF15 a RF19** | RNF08, RNF09, RNF14 (Offline / Flexibilidade)| Despesas e Categorias |
| **RF31 a RF35** | RNF10, RNF16, RNF17 (Automação / Integridade)| Recorrência e Saldos |
| **RF37, RF38** | RNF18 (Push / Desempenho) | Alertas e Limites |
| **RF39 a RF42** | RNF09, RNF15, RNF19 (Acessibilidade / UX) | Relatórios e Gráficos |
| **RF44 a RF46** | RNF18, RNF20 (Engajamento / Feedback) | Gamificação |
| **RF55** | RNF04 (Usabilidade) | Onboarding |