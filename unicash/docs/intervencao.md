# 3 - INTERVENÇÃO SOCIAL

O UniCash pretende contribuir para o desenvolvimento de hábitos de planejamento e acompanhamento financeiro entre seus usuários, principalmente estudantes universitários e famílias que administram recursos limitados. A intervenção social não está na ferramenta em si, mas no uso contínuo que ela pode viabilizar: tornar receitas, despesas e metas mais visíveis e acompanháveis ao longo do tempo.

## 3.1 Impacto Pretendido

Espera-se que o acompanhamento facilitado dos gastos favoreça maior autonomia na tomada de decisão financeira e apoie a preparação para despesas futuras. A redução do endividamento e a formação de reservas financeiras são tratadas como **resultados pretendidos**, e não como consequências automáticas do software: elas dependem de fatores externos à ferramenta: nível de renda do usuário, disciplina pessoal, contexto socioeconômico, que o UniCash não controla. Por isso, esses resultados precisam ser acompanhados por indicadores de uso ao longo do projeto (por exemplo, frequência de registro, permanência de uso, taxa de cumprimento de metas), e não assumidos como benefício garantido pela existência do app.

## 3.2 Efeitos Emergentes Positivos

O uso contínuo da plataforma pode levar os usuários a acompanhar suas finanças com maior frequência, desenvolvendo aos poucos hábitos mais conscientes de registro e planejamento.

## 3.3 Efeitos Emergentes Não Intencionais e Riscos

Como toda intervenção que expõe informações sensíveis e introduz comparação e feedback constante sobre o comportamento do usuário, o UniCash pode gerar efeitos não previstos ou indesejados, que a equipe reconhece como riscos a serem monitorados:

- **Ansiedade e sentimento de culpa ou fracasso**: o acompanhamento constante de gastos, especialmente com indicadores visuais de alerta (como o esquema verde/amarelo/vermelho por categoria), pode gerar ansiedade ou frustração em usuários que recorrentemente ultrapassam metas, em vez de incentivá-los a continuar usando a ferramenta.
- **Gamificação como fonte de pressão**: pontuações, conquistas e rankings comparativos entre membros de um mesmo grupo (funcionalidade multiusuário) podem se tornar fonte de constrangimento ou competição mal-vinda, principalmente em contextos onde as diferenças de renda ou de responsabilidades financeiras entre os membros são desconsideradas pelo sistema.
- **Comparação inadequada entre perfis econômicos diferentes**: ao comparar desempenho financeiro entre usuários de um grupo (ex.: família, república), o app corre o risco de tratar como equivalentes situações financeiras muito distintas, gerando julgamentos injustos sobre quem "gasta mais" ou "poupa menos".
- **Falsa percepção de que organização resolve insuficiência de renda**: o app pode transmitir a ideia implícita de que dificuldades financeiras decorrem de falta de organização, quando, para parte do público-alvo (estudantes bolsistas, famílias de baixa renda), o problema central é a insuficiência da renda disponível, não a ausência de controle sobre ela.
- **Decisões equivocadas baseadas em indicadores simplificados**: sinais visuais simplificados (como um indicador de cor única por categoria) podem induzir decisões financeiras inadequadas caso o usuário não compreenda os critérios por trás da classificação ou trate o indicador como recomendação definitiva.
- **Exposição de informações financeiras**: funcionalidades como leitura/importação de extratos bancários e compartilhamento de dados em grupos (família, república) aumentam a superfície de exposição de dados sensíveis, com risco de acesso indevido por outros membros do grupo ou vazamento de informações.
- **Exclusão de usuários com menor letramento digital ou financeiro**: parte do público-alvo (famílias com menor familiaridade tecnológica, estudantes sem histórico de planejamento financeiro) pode ter dificuldade em interpretar categorias, metas e relatórios, o que pode gerar abandono precoce da ferramenta em vez de inclusão.
- **Abandono da ferramenta**: a combinação dos fatores acima: pressão de metas, comparação social, complexidade de uso, pode levar ao abandono do aplicativo antes que qualquer benefício de longo prazo (redução de dívidas, formação de reserva) se manifeste, especialmente se o onboarding e a curva de aprendizado não forem cuidadosamente desenhados.

## 3.4 Monitoramento e Mitigação

Diante dos riscos identificados, a equipe pretende:

- Validar com a cliente e com usuários representativos (estudantes e famílias) se os indicadores de meta e os elementos de gamificação são percebidos como motivadores ou como fonte de pressão, ajustando a linguagem e a forma de apresentação conforme o feedback recebido;
- Tratar a comparação entre membros de grupo como funcionalidade opcional/configurável, evitando impor rankings a usuários que não desejem esse tipo de exposição;
- Definir, junto à cliente, controles de privacidade claros sobre o que é visível entre membros de um mesmo grupo;
- Acompanhar indicadores de uso (retenção, frequência de registro, abandono) ao longo do desenvolvimento incremental, como forma de identificar precocemente sinais de efeitos não intencionais.
