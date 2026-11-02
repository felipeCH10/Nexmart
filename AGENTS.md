# Nexmart - instruções dos agentes

## Skills

- `rubric-audit`: conferir os critérios da rubrica com evidências executadas.
- `secure-backend`: revisar autenticação, autorização, validação, segredos e integridade de pedidos.
- `typed-fullstack`: implementar mudanças simples mantendo TypeScript estrito, React, PHP/PDO e a arquitetura existente.

## Guardrails

- Nunca ler, imprimir, enviar ou versionar `.env` ou credenciais.
- Nunca desativar autenticação, autorização ou tipagem estrita.
- Nunca usar `any`, `@ts-ignore` ou `@ts-nocheck`.
- SQL deve permanecer no backend e sempre usar PDO preparado.
- O usuário autenticado deve vir do JWT validado; nunca confiar em ID ou permissão do navegador.
- Preservar dados e não executar comandos destrutivos sem autorização explícita.
- Fazer alterações pequenas, validar com build, lint ou testes e não afirmar verificações não executadas.
