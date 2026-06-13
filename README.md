# spec-skills

Suíte de **skills determinísticas** (AI Driven Development) para scaffoldar projetos **TypeScript fullstack** com arquitetura modular/clean:

**Turborepo + Next.js (frontend) + NestJS (backend) + Prisma**, com um pacote `shared` (erros, validações, `Entity` base, `UseCase`, interfaces de `Repository`) consumido por módulos de negócio em `modules/<domínio>/src/<agregado>`.

As skills vivem em `.agents/skills/` e são lidas por ferramentas de IA (Codex CLI, Claude Code, etc.). Cada skill é um `SKILL.md` + scripts Node determinísticos e/ou few-shots.

> Cross-platform: os scripts usam `shell: process.platform === 'win32'` e `fs` do Node — rodam em **Windows e Linux/Mac**. As docs trazem blocos `bash` e `powershell`.

## Instalação (num projeto novo)

Numa pasta vazia, clone este repo e copie a pasta `.agents` para a raiz do seu projeto.

**PowerShell (Windows):**
```powershell
git clone --depth 1 https://github.com/samyrwendel/spec-skills .spec-skills-tmp
Copy-Item .spec-skills-tmp/.agents . -Recurse -Force
Remove-Item .spec-skills-tmp -Recurse -Force
```

**bash (Linux/Mac):**
```bash
git clone --depth 1 https://github.com/samyrwendel/spec-skills .spec-skills-tmp && cp -r .spec-skills-tmp/.agents . && rm -rf .spec-skills-tmp
```

Ou simplesmente peça à sua IA: *"Clone https://github.com/samyrwendel/spec-skills num temporário e copie a pasta `.agents` para a raiz deste projeto, sem sobrescrever nada existente."*

## As 15 skills

| Camada | Skills |
|---|---|
| **config-\*** (fundação) | `config-project-fullstack`, `config-db`, `config-package-shared`, `config-new-module` |
| **module-\*** (domínio) | `module-aggregate`, `module-entity`, `module-repository`, `module-use-case`, `shared-validation-rule` |
| **backend-\*** (persistência/HTTP) | `backend-nest-config`, `backend-nest-controller`, `backend-prisma-repository`, `backend-prisma-sync-module`, `backend-provider-implementation` |
| **spec-\*** (orquestrador) | `spec-backend-auth-basic` |

## Como começar um projeto novo

**1. Instale as skills** (acima).

**2. Bootstrap** — escolha o banco com `--db-provider`:

Começando já no Supabase:
```
Use as skills em .agents/skills para criar um projeto novo fullstack NESTA pasta, nesta ordem:
1) config-project-fullstack — namespace @meu-app
2) config-db com --db-provider supabase
3) config-package-shared
Depois vou colar as URLs reais do Supabase (DATABASE_URL + DIRECT_URL) no apps/backend/.env.
```

Prototipando local/grátis (migra pro Supabase depois trocando a URL):
```
Use as skills em .agents/skills para criar um projeto novo fullstack NESTA pasta:
1) config-project-fullstack — namespace @meu-app
2) config-db com --db-provider local-postgres
3) config-package-shared
```

**3. Criar módulos de negócio** (repete por módulo):
```
Crie o módulo "transactions" com a skill config-new-module (namespace @meu-app).
```

**4. Domínio + backend** (por agregado), ou a base de auth de uma vez:
```
Monte a base de autenticação do backend com a skill spec-backend-auth-basic (namespace @meu-app).
```

## Coringa de banco (`config-db --db-provider`)

| Valor | Banco | Docker | `.env` |
|---|---|---|---|
| `local-postgres` (default) | Postgres local | gera `docker-compose.yml` | `DB_*` + `DATABASE_URL` derivados |
| `supabase` | Supabase (managed Postgres) | nenhum | `DATABASE_URL` (pooler 6543) + `DIRECT_URL` (5432); cole as URLs reais do dashboard |
| `sqlite` | SQLite (arquivo) | nenhum | `DATABASE_URL="file:./dev.db"` |

Como Supabase **é** Postgres, dá pra prototipar grátis em `local-postgres` e migrar pra `supabase` só trocando a URL.

---

Skills extraídas por engenharia reversa de projetos reais. Use, edite por projeto, e evolua os padrões conforme a necessidade.
