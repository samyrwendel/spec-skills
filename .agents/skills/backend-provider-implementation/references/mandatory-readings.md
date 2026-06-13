# Mandatory Readings

Leia estes arquivos obrigatorios antes de implementar o provider:

1. o arquivo alvo em `modules/<modulo>/src/**/provider/*.provider.ts`
2. os tipos relacionados importados pelo provider alvo
3. `apps/backend/src/modules/<modulo>/<modulo>.module.ts`
4. o controller ou ponto de uso no backend, quando ele ajudar a entender a injecao da classe concreta

Leituras de referencia opcionais (use quando existirem no projeto; em projeto novo podem nao existir — nesse caso nao de halt e use o exemplo canonico de few-shots):

- `modules/auth/src/user/provider/crypto.provider.ts`
- `apps/backend/src/modules/auth/bcrypt.crypto.ts`
- `apps/backend/src/modules/auth/auth.module.ts`
- `references/few-shots/bcrypt-crypto.provider.example.ts` (exemplo canonico sempre disponivel)
- `references/few-shots/auth-module.provider-registration.example.ts`

Extraia dessas leituras:

- o contrato exato que precisa ser cumprido
- o nome real do modulo inferido pelo path
- a convencao local de naming dos arquivos concretos do backend
- como o backend injeta classes concretas e as repassa para casos de uso do dominio
- se ja existe biblioteca instalada que resolve o problema

Antes de editar, confirme tambem:

- se a interface alvo esta inequivoca
- se o modulo backend correspondente ja existe
- se a implementacao deve ficar na raiz do modulo backend
- se existe um consumidor Nest que precisara trocar abstracao por classe concreta

Se qualquer leitura obrigatoria (itens 1 a 4) falhar, pare e relate claramente o bloqueio. As leituras de referencia opcionais ausentes em projeto novo nao sao bloqueio.
