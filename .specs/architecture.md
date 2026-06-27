# spec-skills — Constituição (.specs)

> A camada mais ESTÁVEL do ADAS: os invariantes da arquitetura que as skills assumem e que NÃO mudam
> sem uma decisão (`DA-NNN`). Reverse-engineerado das próprias skills em `.agents/skills/` — cada item
> cita a skill de onde veio (procedência). Fonte da verdade = as skills; se este doc divergir, regenere.

## Stack & topologia (DA-001)
**Turborepo** com:
- `apps/frontend` — Next.js, porta **3000**.
- `apps/backend` — NestJS, porta **4000** (CORS, `@nestjs/config`, `.env`/`.env.example`).
- `packages/shared` — base compartilhada.
- `modules/<domínio>/src/<agregado>` — módulos de negócio.
> Procedência: `config-project-fullstack`.

## Camadas (clean/DDD) — a regra de ouro (DA-002)
- **`packages/shared`** concentra os contratos reutilizáveis: `Entity` base (`src/model/entity.ts`),
  `UseCase`, interfaces de `Repository`, **erros de domínio** e **validação** (`src/validation/`:
  `rules/`, `validator.ts`, `index.ts`). Consumido por backend, frontend e módulos. Namespace `@<scope>/shared`.
- **`modules/<módulo>/src/<agregado>/`** = domínio puro: `model/` (entidade), `provider/`, `usecase/`
  (`*.usecase.ts`), com `src/index.ts` por módulo e index por agregado (exports corretos).
- **`apps/backend/src/modules/<módulo>/`** = adaptação HTTP: controller **fino** que reusa as interfaces
  `In`/saída do usecase (sem DTO redundante), confia na infra **central de erro/auth**, e gera teste
  `*.integration.http` (Rest Client). O domínio NÃO conhece HTTP/Prisma.
> Procedência: `config-package-shared`, `module-aggregate`, `module-entity`, `module-use-case`, `backend-nest-controller`.

## Nomenclatura (DA-002)
- Namespace `@<scope>` derivado dos `package.json` — **nunca chumbar um scope de cliente real**.
- `kebab-case` em pastas/arquivos de agregado. Sufixos: `*.usecase.ts`, `*.entity.ts`, `*.repository.ts`,
  `*.provider.ts`, `*.integration.http`, `*.example.ts` (few-shots).

## Determinismo (DA-004)
Scaffolding via **scripts** (`scripts/create-project.js`, `rebuild-shared.js`, `create-aggregate.js`, …) —
**não replay manual** dos passos. Não mudar a ordem do scaffold a menos que o próprio script esteja sendo atualizado.
> Procedência: `config-project-fullstack` (Constraints).

## Cross-platform (DA-005)
Scripts usam só `fs`/`path` do Node + detecção `process.platform` — **sem `sed`/shell POSIX**. Docs trazem
blocos `bash` E `powershell`. Roda em Windows e Linux/Mac.

## Disciplina de teste (DA-009)
Unit com **fakes concretos** e **100% de coverage** do usecase/entity criado; integração HTTP via `*.integration.http`.
> Procedência: `module-use-case`, `module-entity`.

## Trava + leituras obrigatórias (DA-006)
A skill **para na ambiguidade** (>1 módulo/agregado/arquivo que casa → pergunta) e **lê o código real**
antes de gerar (ex.: `modules/auth/src/user/model/user.entity.ts`, `packages/shared/src/validation/`).
Reuso-por-construção. > Procedência: `module-entity` (Referências obrigatórias), `backend-nest-controller` (Trava).

## Banco — coringa (DA-008)
`config-db --db-provider local-postgres|supabase|sqlite`. Supabase **é** Postgres → prototipa local, migra trocando a URL.

## Convenção de skill (DA-007)
Skills vivem em `.agents/skills/<nome>/` (agnóstico de ferramenta) = `SKILL.md` (frontmatter `name`+`description`)
+ `scripts/*.js` (determinístico) + `references/` (`mandatory-readings.md`, `few-shots/*.example.ts`, checklists)
+ `agents/openai.yaml`. Instala copiando `.agents/` pra raiz do projeto.

## Espelhos / contratos
- Profile de checagem (cores/tokens) = `.adas/profile.json` (máquina, p/ `adas-check`) — gerado do tema do projeto (`--detect-tokens`).
