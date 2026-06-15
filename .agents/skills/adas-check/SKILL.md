---
name: adas-check
description: "Modo COMPARE do ADAS — sensor de saída de faixa. Audita um projeto contra o padrão (lanes/guard-rails) e reporta os desvios com severidade, arquivo:linha e o fix sugerido. Determinístico onde dá (grep/AST), LLM só pro nuance. Use quando o pedido envolver auditar aderência ao design system, i18n, padrões do app, regras de produto ou decisões — em projeto novo ou bagunçado."
---

# adas-check — drift-check (modo compare do ADAS)

O ADAS (Advanced Driver-Assistance System) mantém a LLM **na pista** das especificações em vez de inventar cor/estrutura/escopo. Esta skill é o **sensor de saída de faixa**: lê um projeto, compara contra as lanes e devolve um **relatório de saída de faixa** (departures) com severidade + `arquivo:linha` + o fix.

> Inimigo: LLM stateless = drift (cada sessão/agente reinventa, recria, nomeia diferente — "uma equipe onde ninguém se fala"). Arma: comparar continuamente contra a fonte da verdade e avisar o motorista só quando há saída de faixa real.

## Faixas (organizadas por DOMÍNIO, como o ADAS)

| Faixa | Checagem determinística (barata, sem LLM) | Checagem com LLM (julgamento) | Status |
|---|---|---|---|
| **Design** | hex fora do token set; `#fff` como bg; ciano em CTA | componente canônico reinventado | ✅ `scripts/check-design.js` |
| **Idioma** | paridade de chaves entre locales; `aria-label`/placeholder/title/alt hardcoded; texto JSX literal | mistura de idiomas na mesma tela | ✅ `scripts/check-i18n.js` |
| **App** | `fetch(` solto vs `useApiClient`; endpoint sem auth/validação; god-file crescendo | componente canônico recriado | ⏳ planejado |
| **Produto** | dado mockado/hardcoded; fee sem % + USD | feature fora dos pilares/escopo | ⏳ planejado |
| **Decisões** | mudança em área decidida sem DA-NNN novo | contradiz uma DA aceita | ⏳ planejado |

As regras determinísticas pegam ~80% barato e sem drift; a passada com LLM pega o nuance. A mesma fonte da verdade (as skills/lanes) gera o doc portátil **e** o checador.

## Faixa Design (implementada)

```bash
node .agents/skills/adas-check/scripts/check-design.js <dir-alvo> [--profile holdge] [--json]
```

- Varre arquivos de UI (`.tsx/.ts/.jsx/.js/.css/...`), ignora `node_modules`/`dist`/pasta-ponto.
- Reporta cada cor hex **fora do token set** do perfil, com contagem, `arquivo:linha` e o **token aprovado mais próximo** (distância RGB) como sugestão de fix. Severidade por frequência (major ≥20×, minor ≥5×, nit).
- `--json` para consumo por outra ferramenta (ex.: o modo **align**).
- Perfis em `scripts/check-design.js` (`PROFILES`). **Holdge** é o perfil inicial; cada projeto novo = um perfil com seus tokens. (Próximo passo: ler os tokens do CSS/tema do projeto em vez de hardcodar o perfil.)

## Faixa Idioma (implementada)

```bash
node .agents/skills/adas-check/scripts/check-i18n.js <dir-ui> [--locales <dir>] [--json]
```

Três sensores: **(A)** paridade de chaves entre locales (detecta auto o `i18n/locales/<locale>/*.json`, achata chaves nested, diff por namespace) — alta confiança; **(B)** atributos hardcoded (`placeholder`/`aria-label`/`title`/`alt`/`label` com texto literal) — alta confiança; **(C)** texto JSX literal fora de `{t(...)}` — heurística, marcado "revisar". `--json` pro modo align.

## Os 3 modos do ADAS (contexto)

- **install** — projeto novo nasce na pista (skills `config-*`/`module-*`/`backend-*` do spec-skills).
- **compare** — ESTA skill: detecta saída de faixa em qualquer projeto (novo ou legado).
- **align** — traz o projeto pra pista (consome o relatório JSON desta skill; auto-fix dos desvios mecânicos + flag dos de julgamento). ⏳ planejado.

## Cross-platform

Scripts só usam `fs`/`path` do Node (Windows e Linux). Sem `sed`/shell POSIX.
