# Validação manual do UC15

Use o Expo Go com `npm start` dentro de `mobile/`, ou um APK desta versão. Comece em um ambiente de teste com uma instalação limpa. Para o segundo acesso, feche e reabra o app usando a mesma instalação.

- [ ] **Primeiro acesso.** Confira a oferta antes do resumo. Toque em **Iniciar tutorial** e leia as cinco etapas na ordem informação, receita, despesa, meta e resumo.
- [ ] **Conclusão e segundo acesso.** Toque em **Concluir tutorial**. Confira que o app abre o resumo. Feche o app por completo e reabra. O resumo deve aparecer sem nova oferta automática.
- [ ] **Reabertura.** Toque em **Ajuda → Tutorial** e confirme que a primeira etapa aparece. Com o mês sem lançamentos, confira também **Ver tutorial** no estado vazio.
- [ ] **Pular e encerrar.** Em outra instalação de teste sem a preferência, toque em **Pular tutorial** e confirme que a oferta não se repete ao reabrir. Na reabertura manual, encerre em uma etapa intermediária e confira que o app volta ao resumo.
- [ ] **Destinos.** Abra receita e despesa, volte ao tutorial e confirme que ele mantém a etapa corrente. Confira o exemplo de meta. Avance sem salvar e confira que os totais permanecem iguais.
- [ ] **Resumo na última etapa.** Abra **Ver meu resumo** e confira os valores do UC03 em uma base vazia e em uma base com lançamentos no mês selecionado. Toque em **Voltar ao tutorial** e confirme que a etapa **Entenda o resumo** continua aberta.
- [ ] **Validação de formulário.** Tente salvar uma receita ou despesa sem os dados obrigatórios. Confira a mensagem do formulário e que nenhum lançamento foi criado. Se for feita injeção de falha de persistência em uma build de teste, confira a mensagem do UC correspondente e a opção **Voltar à etapa**.
- [ ] **RNF20 e uso offline.** Repita a navegação em retrato nas larguras de 320, 360, 393 e 430 dp. Confira títulos, leitura do glossário, rolagem e acesso aos botões. Com o bundle já carregado, verifique o tutorial em modo avião, sem conta.

Para a evidência do DoD, registre a versão testada, a plataforma, as larguras verificadas e o resultado de cada item. A tela de meta desta versão é uma demonstração enquanto o UC12 estiver indisponível na base.
