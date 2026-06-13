---
name: config-new-module
description: Criar de forma deterministica um novo modulo de negocio dentro de `modules/` neste monorepo a partir de um nome de modulo e de um namespace npm obrigatorio, scaffoldar o modulo NestJS correspondente em `apps/backend/src/modules/<nome-do-modulo>` com controller e registro automatico no AppModule, e criar a estrutura base do modulo no frontend em `apps/frontend/src/app/(private)/<nome-do-modulo>/page.tsx`, `apps/frontend/src/modules/<nome-do-modulo>/pages/<nome-do-modulo>.page.tsx` e `apps/frontend/src/modules/<nome-do-modulo>/components/<nome-do-modulo>.component.tsx`. Use quando Codex precisar scaffoldar um workspace como `modules/auth`, copiar os templates fixos desta skill, registrar a dependencia do modulo em `apps/frontend` e `apps/backend`, garantir `ts-node` e `modules/*` no `package.json` raiz, instalar dependencias, executar o build do projeto e rodar os testes do modulo recem-criado.
---

# Config New Module

Usar o script `scripts/create-module.js` em vez de recriar a estrutura manualmente.

## Fluxo

1. Confirmar que o pedido informa explicitamente `nome do modulo` e `namespace`.
2. Nao prosseguir sem namespace.
3. Executar a partir da raiz do projeto:

```bash
node .agents/skills/config-new-module/scripts/create-module.js --module auth --namespace @SEU_NAMESPACE
```

> **Nota:** `@SEU_NAMESPACE` e ilustrativo. Derive o scope real do `package.json`/namespace do projeto alvo (ex.: campo `name` da raiz ou de `apps/backend/package.json`) antes de executar. Nao chumbe um scope de outro projeto.

4. Verificar ao final:
   - `modules/<nome-do-modulo>` criado.
   - `apps/backend/src/modules/<nome-do-modulo>/<nome-do-modulo>.module.ts` criado.
   - `apps/backend/src/modules/<nome-do-modulo>/<nome-do-modulo>.controller.ts` criado.
   - `apps/frontend/src/app/(private)/<nome-do-modulo>/page.tsx` criado.
   - `apps/frontend/src/modules/<nome-do-modulo>/pages/<nome-do-modulo>.page.tsx` criado.
   - `apps/frontend/src/modules/<nome-do-modulo>/components/<nome-do-modulo>.component.tsx` criado.
   - `apps/backend/src/app.module.ts` importando e registrando `<NomeDoModulo>Module`.
   - `apps/frontend/package.json` e `apps/backend/package.json` contendo `@namespace/<nome-do-modulo>`.
   - `package.json` raiz contendo `ts-node` em `devDependencies`.
   - `package.json` raiz contendo `modules/*` em `workspaces`.
   - `npm install`, `npm run build` e `npm run test --workspace @namespace/<nome-do-modulo>` executados com sucesso.

## Flags opcionais

Alem de `--module` e `--namespace` (ambos obrigatorios), o script aceita:

- `--workspace-root modules|packages` — diretorio raiz do novo workspace. Padrao: `modules`. Use `packages` para scaffoldar em `packages/` em vez de `modules/`.
- `--skip-frontend` — nao cria a estrutura do modulo no frontend nem atualiza `apps/frontend/package.json`.
- `--skip-backend` — nao atualiza a dependencia em `apps/backend/package.json`.
- `--skip-nestjs` — nao cria `apps/backend/src/modules/<nome>` nem registra o modulo no `AppModule`.
- `--add-to-modules` — adiciona a dependencia do novo pacote como `dependencies` em todos os demais workspaces ja existentes sob o `--workspace-root` escolhido.
- `--help`, `-h` — imprime o uso e sai.

Exemplo apenas-backend, em `packages/`:

```bash
node .agents/skills/config-new-module/scripts/create-module.js --module billing --namespace @SEU_NAMESPACE --workspace-root packages --skip-frontend
```

## Comportamento

- Criar `modules/` caso ainda nao exista.
- Recusar execucao quando `--namespace` nao for informado.
- Recusar execucao quando `modules/<nome-do-modulo>` ja existir.
- Recusar execucao quando `apps/backend/src/modules/<nome-do-modulo>` ja existir.
- Recusar execucao quando `apps/frontend/src/modules/<nome-do-modulo>` ou `apps/frontend/src/app/(private)/<nome-do-modulo>` ja existirem.
- Copiar os arquivos de `assets/module-template/` e substituir placeholders pelo nome do modulo e namespace informados.
- Copiar os arquivos de `assets/nestjs-module-template/` para `apps/backend/src/modules/<nome-do-modulo>/`, substituindo `__MODULE_NAME__` e `__MODULE_CLASS_NAME__` (PascalCase do nome).
- Copiar os arquivos de `assets/frontend-module-template/` para `apps/frontend/src/`, substituindo `__MODULE_NAME__`, `__MODULE_CLASS_NAME__` (PascalCase) e `__MODULE_DISPLAY_NAME__` (Title Case).
- Adicionar import e registro de `<NomeDoModulo>Module` em `apps/backend/src/app.module.ts`.
- Garantir a dependencia do modulo em `apps/frontend/package.json` e `apps/backend/package.json`.
- Garantir `ts-node@^10.9.2` no `package.json` raiz.
- Garantir `apps/*`, `modules/*` e `packages/*` em `workspaces`, preservando entradas extras existentes.
- Preservar arquivos nao relacionados.

## Templates

Os arquivos-base do workspace ficam em `assets/module-template/`:

- `jest.config.ts`
- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `test/index.test.ts`

Os arquivos-base do modulo NestJS ficam em `assets/nestjs-module-template/`:

- `module.ts` → copiado como `<nome-do-modulo>.module.ts`
- `controller.ts` → copiado como `<nome-do-modulo>.controller.ts`

Os arquivos-base do frontend ficam em `assets/frontend-module-template/`:

- `route-page.tsx` → copiado como `app/(private)/<nome-do-modulo>/page.tsx`
- `page.tsx` → copiado como `modules/<nome-do-modulo>/pages/<nome-do-modulo>.page.tsx`
- `component.tsx` → copiado como `modules/<nome-do-modulo>/components/<nome-do-modulo>.component.tsx`

Placeholders substituidos nos templates NestJS: `__MODULE_NAME__` (kebab-case) e `__MODULE_CLASS_NAME__` (PascalCase).
Placeholders substituidos nos templates do frontend: `__MODULE_NAME__` (kebab-case), `__MODULE_CLASS_NAME__` (PascalCase) e `__MODULE_DISPLAY_NAME__` (Title Case).

Editar esses arquivos antes do script somente quando o template padrao precisar mudar.

## Restricoes

- Nao inferir namespace quando ele nao vier no pedido.
- Nao pular `npm install`, `npm run build` ou o teste do workspace criado.
- Nao criar documentacao extra fora dos recursos da propria skill.
