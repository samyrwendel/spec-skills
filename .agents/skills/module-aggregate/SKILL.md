---
name: module-aggregate
description: Cria a estrutura padronizada de um agregado dentro de um módulo de negócio, organizando pastas, arquivos-base e nomenclaturas de model, provider e usecase para acelerar a evolução consistente do projeto.
---

# Module Aggregate

Use o script `scripts/create-aggregate.js` para criar de forma deterministica a estrutura base de um agregado dentro de um modulo existente em `modules/<modulo>`.

## Entradas obrigatorias

1. `nome do modulo`, correspondente a uma pasta ja existente em `modules/<modulo>`.
2. `nome do agregado`.

## Entrada opcional

3. `tipo de estrutura inicial dos casos de uso`:
   - `crud` (default deterministico)
   - `example`

Se o pedido nao informar essa terceira entrada, assuma `crud` automaticamente. Nao interromper para confirmar com o usuario; o modo `example` so e usado quando solicitado explicitamente.

## Entrada opcional adicional

4. `--shared <pacote>`: pacote compartilhado a importar nos imports dos templates. Se nao informado, o script deriva `@<scope>/shared` a partir do scope do `package.json` do projeto alvo (fallback ilustrativo `@app/shared` quando nao houver scope). Nunca chumbe um scope real.

## Fluxo

1. Validar que o pedido informa explicitamente o modulo e o agregado.
2. Validar que `modules/<modulo>` ja existe e contem `src/index.ts`.
3. Normalizar o nome do agregado para `kebab-case` em pastas e arquivos.
4. Se `mode` nao vier no pedido, assumir `crud` (default deterministico, sem confirmacao humana).
5. Executar a partir da raiz do projeto.

PowerShell (Windows):

```powershell
node .agents/skills/module-aggregate/scripts/create-aggregate.js --module auth --aggregate user-profile --mode crud
```

bash:

```bash
node .agents/skills/module-aggregate/scripts/create-aggregate.js --module auth --aggregate user-profile --mode crud
```

O `--mode` pode ser omitido (assume `crud`). Use `--shared "@<scope>/shared"` apenas se quiser sobrescrever o scope derivado do `package.json`.

6. Verificar ao final:
   - `modules/<modulo>/src/<aggregate>/model/<aggregate>.entity.ts`
   - `modules/<modulo>/src/<aggregate>/provider/<aggregate>.repository.ts`
   - `modules/<modulo>/src/<aggregate>/usecase/index.ts`
   - `modules/<modulo>/src/<aggregate>/index.ts`
   - `modules/<modulo>/src/index.ts` exportando `./<aggregate>` sem remover exports existentes

## O que a skill cria

- Estrutura do agregado em `modules/<modulo>/src/<aggregate>/`
- Pastas `model`, `provider` e `usecase`
- Entidade base com `Entity` e `EntityState`
- Contrato inicial de repositorio com `CrudRepository`
- Arquivos `index.ts` necessarios para exportar o agregado
- Casos de uso minimos conforme o modo solicitado

## Modos de usecase

### `crud`

Cria a base padronizada:

- `create-<aggregate>.usecase.ts`
- `update-<aggregate>.usecase.ts`
- `delete-<aggregate>.usecase.ts`
- `find-<aggregate>-by-id.usecase.ts`
- `find-<aggregate>-page.usecase.ts`

### `example`

Cria apenas um caso de uso minimo e generico para demonstrar a estrutura:

- `create-<aggregate>.usecase.ts`

## Convencoes obrigatorias

- Nao implementar regras reais de negocio.
- Nao inventar atributos especificos do agregado.
- Nao assumir uma abordagem opinativa de DDD alem da organizacao por agregado ja usada no projeto.
- Nao criar controller, adapter, implementacao Prisma, migration ou qualquer infraestrutura adicional.
- Preservar exports existentes em `modules/<modulo>/src/index.ts`.
- Usar apenas recursos contidos nesta skill em `.agents/skills/module-aggregate`.

## Recursos internos

- `scripts/create-aggregate.js`: materializa a estrutura do agregado.
- `assets/common/`: templates base de `model`, `provider` e `index.ts`.
- `assets/usecase/crud/`: templates dos casos de uso CRUD.
- `assets/usecase/example/`: template do caso de uso minimo de exemplo.

Os templates usam o token `__SHARED_PACKAGE__` no import do pacote compartilhado. O script substitui esse token pelo valor de `--shared` ou pelo scope derivado do `package.json` (`@<scope>/shared`). Nunca ha scope chumbado nos `.tpl`.

## Guardrails

- Nao executar quando o modulo informado nao existir.
- Nao executar quando o agregado ja existir.
- Quando o modo nao vier no pedido, assumir `crud` (default deterministico); usar `example` apenas quando explicitamente solicitado.
- Nao editar arquivos fora de `modules/<modulo>/src/**`, exceto a propria skill.
- Nao adicionar documentacao extra fora dos arquivos da skill.
