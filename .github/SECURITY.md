# Política de Segurança

O UniCash lida com dados financeiros pessoais. Levamos vulnerabilidades a sério.

## Versões suportadas

O projeto está em desenvolvimento acadêmico. Apenas a versão mais recente da branch `main` e a última release recebem correções.

## Como relatar uma vulnerabilidade

**Não abra uma issue pública.** Use o relato privado do GitHub: aba **Security** → **Report a vulnerability** deste repositório.

Inclua, se possível:

- descrição do problema e do impacto (ex.: acesso a dados de outro usuário);
- passos para reproduzir;
- versão do app ou commit afetado.

Responderemos em até 7 dias. Pedimos que a vulnerabilidade não seja divulgada até a correção.

## Segredos e credenciais

- Nunca faça commit de tokens, senhas ou chaves (`.env`, keystores, credenciais do Firebase com privilégio de administrador).
- Se um segredo for exposto por engano, avise os mantenedores imediatamente para que ele seja revogado.
