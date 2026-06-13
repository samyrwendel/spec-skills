# User Entity Pattern

Esta referencia resume o padrao real observado em `modules/auth/src/user/model/user.entity.ts` e `modules/auth/test/user/model/user.entity.test.ts`.

## Estrutura da entidade

```ts
export interface UserState extends EntityState {
  name: string;
  email: string;
  passwordHash: string;
}

export class User extends Entity<UserState> {
  constructor(props: UserState) {
    super(props);
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "user.name",
        value: this.name,
        rules: [
          new RequiredRule(),
          new MinLengthRule(3),
          new MaxLengthRule(80),
          new PersonNameRule(),
        ],
      },
      {
        code: "user.email",
        value: this.email,
        rules: [new RequiredRule(), new EmailRule()],
      },
      {
        code: "user.passwordHash",
        value: this.passwordHash,
        rules: [new BcryptHashRule()],
      },
    ]);
  }
}
```

> Atencao a `password` vs `passwordHash`: o campo aqui guarda um hash ja
> derivado, por isso o nome `passwordHash` e a regra `BcryptHashRule` (consistente
> com `validation-inference-guide.md`). Use `password` (texto puro) apenas quando a
> entidade receber a senha bruta — nesse caso aplique `RequiredRule`,
> `StrongPasswordRule` e `NoCommonPasswordRule`, nunca `BcryptHashRule`.

## Padroes a preservar

- `State` estende `EntityState`
- construtor apenas chama `super(props)`
- getters explicitos
- `validate()` manual e linear com `Validator.validate([...])`
- codigos de erro previsiveis via prefixo por campo

## Padrao dos testes

Cobrir pelo menos:

- criacao de entidade valida
- getters
- timestamps herdados da classe base
- `clone()` preservando `id` e `createdAt` e atualizando `updatedAt`
- lazy validation
- sucesso e falha de `validate()`
- mensagens de erro esperadas
- cenarios limite de tamanho e formato

Helper observado no projeto:

```ts
function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}
```
