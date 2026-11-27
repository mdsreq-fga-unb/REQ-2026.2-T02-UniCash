# Processar pedidos de exclusão do UC11

O app exige conexão e senha atual para registrar o pedido. A criação de
`pedidos_remocao/{uid}` fecha as gravações daquele UID em `usuarios/{uid}` pelas
regras do Firestore. Publique as regras desta versão antes de liberar a tela.

Execute o script fora do app, com Node 22+ e Application Default Credentials
de uma identidade autorizada no projeto. A identidade precisa ler e atualizar
os pedidos, consultar e excluir os dados no Firestore e excluir usuários do
Firebase Authentication. Configure as credenciais somente no ambiente administrativo.

A partir da raiz do repositório:

```sh
cd scripts/remocao-conta
npm ci
node processar.mjs --projeto ID_DO_PROJETO --uid UID
node processar.mjs --projeto ID_DO_PROJETO --uid UID --executar
```

O primeiro comando com `node` consulta o status. Com `--executar`, o script
reserva um pedido, apaga os documentos e as subcoleções do UID e exclui seu
cadastro no Authentication. O pedido fica com status `concluido` para preservar
o bloqueio de gravação. Em caso de falha, execute novamente para o mesmo UID.
Se o processo foi encerrado à força, aguarde expirar a reserva de 30 minutos.

Valide primeiro em um projeto de teste. No aparelho, solicite a exclusão em
**Conta → Excluir conta** e confira a gravação do pedido e a limpeza local.
Tente sincronizar da segunda instalação com o mesmo UID. A gravação deve ser
recusada. Após executar o script, confira a remoção do usuário e das
subcoleções e rode o comando novamente para verificar o resultado idempotente.

Defina com a equipe o responsável e a frequência de processamento e a política de
backup e retenção do registro de conclusão. A limpeza automática da base SQLite
ocorre no aparelho que enviou o pedido. Antes da gravação remota o app salva um
identificador aleatório para consultar o comprovante no Firestore, inclusive
depois da exclusão do cadastro no Authentication. O pedido e o comprovante são
gravados juntos. O comprovante contém apenas a confirmação e admite consulta
pelo identificador exato. O script preserva esse comprovante.

A ausência de sessão e a falha de rede preservam a base enquanto o app não
consegue comprovar o recebimento. Marcadores legados `enviando` só podem ser
verificados com uma sessão válida do mesmo UID, pois foram gravados sem
identificador. Publique as novas regras antes de distribuir esta versão do app.
