---
name: decisions
description: "Lane Decisões do ADAS — registro e guarda das decisões de arquitetura/convenção do spec-skills (DA-NNN no DECISIONS.md). Use SEMPRE que uma decisão for tomada, mudada ou questionada: escolha de stack/lib/contrato, convenção de pasta/nomenclatura, mudança de scaffold/script, trade-off aceito, reversão ('vamos usar X', 'muda pra Y', 'fica decidido', 'volta como era'). Também ao consultar histórico ('por que fizemos X?', 'quem decidiu?') e ANTES de refatorar/remover algo que pode ter sido decidido (estrutura clean/DDD, ordem do scaffold, namespace, contrato do shared)."
when_to_use: "Qualquer tarefa que tome/mude/questione uma decisão de arquitetura ou convenção; antes de alterar .specs/architecture.md, a ordem de um scaffold, ou um contrato em packages/shared."
---

# Decisões (DA-NNN)

> Procedência: extraído de `.specs/architecture.md` + governança de [samyrwendel/adas](https://github.com/samyrwendel/adas).
> Fonte da verdade = `DECISIONS.md` + `.specs/`. Esta lane fecha o item "Decisões" do `adas-check`.

## Quando se aplica
Toda decisão de arquitetura/convenção/escopo: stack, lib, contrato do `shared`, layout de pasta, nomenclatura,
ordem/flags de scaffold, db-provider, trade-off, reversão. E ao consultar "por que X?" / antes de refatorar área decidida.

## Fonte da verdade (NÃO duplicar)
- O log é `DECISIONS.md` (raiz). O índice no topo + a seção `DA-NNN` completa. A `.specs/architecture.md` referencia as DAs.

## Trava obrigatória
- Antes de mudar `.specs/`, a ordem de um scaffold, ou um contrato do `shared`: **leia a DA que decidiu aquilo**.
  Se a mudança contradiz uma DA aceita, ou é nova decisão (→ DA nova) ou supersede a antiga — **nunca** contradizer em silêncio.
- Numerar sequencial; **nunca** reusar número; antiga vira `🔄 Supersedida por DA-MMM` (não apaga).

## Regras — FAÇA
1. Decisão tomada/mudada → entrada `DA-NNN` no `DECISIONS.md` + índice + a `.specs/`/skill afetada, **no mesmo commit**.
2. Formato: `## DA-NNN — Título` + `Status ✅/🔄 · Data` + Contexto/Decisão/Consequências/Implementação (procedência: arquivo/skill).
3. Rode `node .agents/skills/adas-check/scripts/adas-self.js` antes de "feito" (pega DA órfã, placeholder, âncora, frontmatter).

## Regras — NÃO FAÇA
1. NUNCA reusar/pular número de DA, nem apagar uma decisão (só supersede).
2. NUNCA mudar área decidida (clean/DDD, ordem do scaffold, namespace, contrato do shared) sem DA nova ou supersede.
