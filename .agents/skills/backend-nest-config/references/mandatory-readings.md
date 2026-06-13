# Leituras Obrigatorias

Leia estes arquivos antes de implementar a configuracao compartilhada do backend NestJS:

1. `packages/shared/src/error/index.ts`
2. `packages/shared/src/error/domain.error.ts`
3. `packages/shared/src/error/validation.error.ts`
4. `packages/shared/src/error/validation.exception.ts`
5. `apps/backend/src/app.module.ts`
6. `apps/backend/src/main.ts`
7. `apps/backend/src/modules/auth/auth.controller.ts`

Depois dessas leituras base, localizar e ler qualquer arquivo existente do projeto que trate de:

- autenticacao
- JWT
- token
- claims
- usuario logado
- `request.user` ou `req.user`
- guards de autenticacao
- decorators de contexto autenticado
- contexto do request

Busca sugerida — use a ferramenta de busca de codigo disponivel (ex.: a busca por conteudo da sua stack/IDE, ou a tool de Grep do agente) procurando por estes termos em `apps/backend/src`, `modules` e `packages/shared`, ignorando `node_modules`:

```
jwt | token | claims | CurrentUser | currentUser | request.user | req.user | passport | AuthGuard | Bearer | Authorization | authenticated user | user context
```

Nao dependa de `ripgrep` (`rg`) estar instalado. Se preferir rodar no terminal, escolha a variante do seu shell:

- Windows PowerShell 5.1:

```powershell
Get-ChildItem -Path apps\backend\src, modules, packages\shared -Recurse -File `
  | Where-Object { $_.FullName -notmatch '\\node_modules\\' } `
  | Select-String -Pattern 'jwt|token|claims|CurrentUser|currentUser|request\.user|req\.user|passport|AuthGuard|Bearer|Authorization|authenticated user|user context'
```

- Bash/Git Bash (caso `git grep` esteja disponivel no repo):

```bash
git grep -nIE "jwt|token|claims|CurrentUser|currentUser|request\.user|req\.user|passport|AuthGuard|Bearer|Authorization|authenticated user|user context" -- apps/backend/src modules packages/shared
```

Objetivo das leituras:

- Confirmar como a hierarquia de erros compartilhados funciona e quais status HTTP devem ser respeitados.
- Identificar se o bootstrap atual do backend ja tem filtros globais, pipes, interceptors ou configuracoes correlatas.
- Detectar repeticao de `try/catch` em controllers para convergir tudo para um filtro global.
- Reaproveitar qualquer infraestrutura de autenticacao ja existente antes de criar uma nova.
- Inferir, quando possivel, o shape local de `request.user` e do payload autenticado.

Se algum arquivo obrigatorio nao existir no projeto alvo:

- parar para reavaliar a estrutura real
- localizar o arquivo equivalente antes de editar
- registrar a suposicao feita no resultado final da execucao
