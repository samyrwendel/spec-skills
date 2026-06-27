# spec-skills — leia a governança antes de produzir qualquer coisa

> Este repo é um **skill-pack** (AI Driven Development) governado por um **ADAS** (Anti-Drift Adherence
> System): faixas/guard-rails que mantêm qualquer LLM/ferramenta **dentro da arquitetura** — em vez de
> inventar estrutura, nomenclatura, contrato ou escopo novos.
> **Princípio-mestre: ADESÃO > INVENÇÃO.** Se já existe skill/script/contrato/padrão/decisão, USE o que existe.

## Antes de QUALQUER tarefa
1. Leia a **constituição** em [`.specs/architecture.md`](.specs/architecture.md) — os invariantes da
   arquitetura (Turbo + Next + Nest + Prisma, clean/DDD, `packages/shared`, módulos por agregado).
2. A **skill** específica vive em `.agents/skills/<nome>/SKILL.md`. **Não replay manual** — rode o
   `scripts/*.js` determinístico da skill. Antes de gerar, leia os arquivos de `references/mandatory-readings.md`.
3. **Trava obrigatória:** pare na ambiguidade (>1 módulo/agregado/arquivo que casa) e pergunte — não adivinhe.
4. Histórico de decisões em [`DECISIONS.md`](DECISIONS.md). Tomou/mudou uma decisão de arquitetura?
   Registre `DA-NNN` lá (skill `decisions`), no MESMO commit; **supersede, nunca apaga**.

## Saúde da governança
```bash
node .agents/skills/adas-check/scripts/adas-self.js   # audita o próprio ADAS (decisões/.specs/âncora)
node .agents/skills/adas-check/scripts/adas-check.js <dir-ui>   # audita o CÓDIGO contra as faixas
```

## Multi-ferramenta
Este é o arquivo-âncora padrão (`AGENTS.md`). Pra cada ferramenta achar a governança no boot, espelhe/symlink:
Claude Code → `CLAUDE.md` · Cursor → `.cursorrules`. Todos apontam pra cá.

---
Governança importada de [samyrwendel/adas](https://github.com/samyrwendel/adas) (o método universal);
o spec-skills é o consumidor TS-fullstack.
