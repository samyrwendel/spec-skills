// scope ilustrativo — derive o scope real do package.json do projeto alvo.
import { CrudRepository } from "@<scope>/shared";
import { User } from "../model";

export interface UserPageParams {
  page: number;
  perPage: number;
}

export interface UserRepository extends CrudRepository<
  User,
  User,
  User,
  UserPageParams
> {}
