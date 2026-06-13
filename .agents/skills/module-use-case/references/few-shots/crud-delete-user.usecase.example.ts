// Nota: `@app/shared` é o scope ilustrativo do projeto-exemplo.
// No projeto alvo, derive o scope do package.json/namespace (ex.: `@<scope>/shared`).
import { UseCase } from "@app/shared";
import { UserRepository } from "../provider";

export interface DeleteUserIn {
  id: string;
}

export class DeleteUser implements UseCase<DeleteUserIn, void> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: DeleteUserIn): Promise<void> {
    await this.userRepository.delete(input.id);
  }
}
