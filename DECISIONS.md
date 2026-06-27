# spec-skills — Registro de Decisões (DA-NNN)

> Log **append-only**. Toda decisão de arquitetura/convenção/escopo vira uma entrada numerada.
> **Numerar sequencial, nunca reusar.** Mudar uma decisão = marcar a antiga `🔄 Supersedida por DA-MMM`
> (nunca apagar). Atualizar o índice + a `.specs/`/skill afetada **no mesmo commit**. Skill: `decisions`.
>
> DA-001…DA-010 = **engenharia reversa** das skills existentes (formalizam o que o repo já decidiu).
> DA-011 = adoção da camada de governança (este PR).

## Índice
- **DA-001** — Monorepo Turbo: `apps/frontend` (Next:3000) + `apps/backend` (Nest:4000)
- **DA-002** — Clean/DDD: `packages/shared` (Entity/UseCase/Repository/erros/validação) + módulos por agregado; controller fino reusa `In`/saída do usecase
- **DA-003** — Backend: erro/auth centralizados; teste `*.integration.http` (Rest Client) ao lado do controller
- **DA-004** — Determinismo: scaffolding via `scripts/*.js`, não replay manual; não mudar a ordem do scaffold
- **DA-005** — Cross-platform: Node `fs`/`path` + `process.platform`; sem `sed`/shell POSIX; docs bash+powershell
- **DA-006** — Trava + leituras obrigatórias: parar na ambiguidade; ler o código real antes de gerar
- **DA-007** — Skills em `.agents/skills/` (agnóstico de ferramenta); install = copiar `.agents/` pra raiz
- **DA-008** — `config-db --db-provider` coringa (local-postgres/supabase/sqlite); Supabase é Postgres
- **DA-009** — Teste: unit com fakes + 100% coverage do usecase/entity; integração HTTP
- **DA-010** — `adas-check`: drift-check (modos install/compare/align), determinístico-primeiro, profiles `.adas/profile.json`
- **DA-011** — Adoção da camada de governança ADAS (DECISIONS/.specs/AGENTS/skill `decisions`/`adas-self`); fecha a lane "Decisões"

---

## Protocolo operacional (o loop)
1. **Quando registrar:** escolha de stack/lib/contrato, convenção de pasta/nomenclatura, mudança de scaffold, trade-off, reversão.
2. **No mesmo commit:** entrada DA-NNN + índice + a `.specs/`/skill afetada.
3. **Supersede, não delete** (`🔄 Supersedida por DA-MMM`); número nunca reusado.
4. **Trava + leituras obrigatórias** antes de "feito" (DA-006). Rode `adas-self.js` (governança) e `adas-check.js` (código).

---

## DA-001 — Monorepo Turbo: frontend Next (3000) + backend Nest (4000)
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Contexto:** base fullstack TS precisa de topologia única e determinística.
- **Decisão:** Turborepo com `apps/frontend` (Next.js, 3000) e `apps/backend` (NestJS, 4000; CORS, `@nestjs/config`, `.env`).
- **Implementação/procedência:** `.agents/skills/config-project-fullstack` (`scripts/create-project.js`).

## DA-002 — Clean/DDD: `packages/shared` + módulos por agregado
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Contexto:** evitar lógica de domínio acoplada a HTTP/ORM e contrato duplicado.
- **Decisão:** `packages/shared` concentra `Entity` base, `UseCase`, interfaces de `Repository`, erros e validação
  (consumido por backend/frontend/módulos); domínio em `modules/<módulo>/src/<agregado>/{model,provider,usecase}`;
  controller do `apps/backend` é fino e reusa as interfaces `In`/saída do usecase (sem DTO redundante).
- **Procedência:** `config-package-shared`, `module-aggregate`, `module-entity`, `module-use-case`, `backend-nest-controller`.

## DA-003 — Erro/auth central + teste `*.integration.http`
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Decisão:** o controller confia na infra central de erro/auth do projeto; ao criar/atualizar controller,
  gerar/atualizar o `*.integration.http` (Rest Client) ao lado, mesmo nome-base do módulo.
- **Procedência:** `backend-nest-controller`.

## DA-004 — Determinismo: scripts, não replay manual
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Decisão:** scaffolding sempre via `scripts/*.js` determinístico; não replicar passos à mão; não alterar a
  ordem do scaffold a menos que o próprio script esteja sendo atualizado.
- **Procedência:** `config-project-fullstack` (Constraints), `config-package-shared`, `module-aggregate`.

## DA-005 — Cross-platform (Node puro, sem shell POSIX)
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Decisão:** scripts usam só `fs`/`path` + `process.platform`; nada de `sed`/shell POSIX; docs com bash E powershell.
- **Consequência:** roda em Windows e Linux/Mac. (Por isso `adas-self`/checadores são Node, não bash.)
- **Procedência:** `README.md`, runner `adas-check/scripts/adas-check.js`.

## DA-006 — Trava + leituras obrigatórias (cura da reinvenção)
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Decisão:** a skill para na ambiguidade (pergunta) e LÊ o código real (`references/mandatory-readings.md`)
  antes de gerar. Não inventa contrato/estrutura fora do escopo.
- **Procedência:** `module-entity` (Referências obrigatórias), `backend-nest-controller` (Trava obrigatória).

## DA-007 — Skills em `.agents/skills/` (multi-ferramenta)
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Decisão:** skills vivem em `.agents/skills/<nome>/` (`SKILL.md` + `scripts/` + `references/` + `agents/openai.yaml`),
  lidas por Codex CLI / Claude Code / etc.; install = copiar `.agents/` pra raiz.
- **Nota aberta:** o auto-trigger por `description` no Claude Code escaneia `.claude/skills/`; em `.agents/` as
  skills tendem a rodar por invocação explícita. Espelhar/symlink pra `.claude/skills/` se quiser auto-trigger (validar).
- **Procedência:** `README.md`, árvore do repo.

## DA-008 — `config-db --db-provider` coringa
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Decisão:** `local-postgres` (default, docker) | `supabase` (pooler 6543 + direct 5432) | `sqlite`. Supabase **é**
  Postgres → prototipa local e migra trocando a URL.
- **Procedência:** `config-db`, `README.md`.

## DA-009 — Teste: fakes + 100% coverage + integração HTTP
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Decisão:** usecase/entity nascem com unit test (fakes concretos) e **100% coverage** do arquivo; controller gera `*.integration.http`.
- **Procedência:** `module-use-case`, `module-entity`, `backend-nest-controller`.

## DA-010 — `adas-check`: drift-check (install/compare/align)
**Status:** ✅ Aceita · **Data:** 2026-06-27
- **Decisão:** sensor de saída de faixa; determinístico onde dá (grep/AST), LLM pro nuance; profiles `.adas/profile.json`;
  lanes Design/Idioma ✅, App/Produto/Decisões em evolução.
- **Procedência:** `.agents/skills/adas-check`.

## DA-011 — Adoção da camada de governança ADAS
**Status:** ✅ Aceita · **Data:** 2026-06-27 · Relacionada: DA-010
- **Contexto:** o repo tinha geração + checagem de código, mas faltava a metade de **governança** (decisões,
  constituição, âncora, auto-auditoria) — a lane "Decisões" do `adas-check` estava planejada.
- **Decisão:** adotar de [samyrwendel/adas](https://github.com/samyrwendel/adas): `DECISIONS.md` (este log),
  `.specs/architecture.md` (constituição), `AGENTS.md` (âncora), skill `decisions` (lane "Decisões") e
  `adas-check/scripts/adas-self.js` (auto-auditoria da governança). Fecha a lane "Decisões".
- **Consequência:** spec-skills passa a ser o **consumidor TS-fullstack** do método universal `adas`.
- **Implementação:** este PR (`feat/adas-governance`).
