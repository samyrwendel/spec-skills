// Exemplo ilustrativo. O scope "@<workspace>/<modulo>" e um placeholder:
// derive o scope real dos exports/index.ts do agregado/modulo alvo
// (normalmente o "name" do package.json do workspace correspondente).
// O import abaixo e relativo ao proprio controller, que vive em
// apps/backend/src/modules/<modulo>/; ajuste o caminho ao local real.
import { Body, Controller, Post } from '@nestjs/common';
import { CreateTransaction, type CreateTransactionIn } from '@<workspace>/<modulo>';
import { PrismaTransactionRepository } from './transaction.prisma';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionRepository: PrismaTransactionRepository,
  ) {}

  @Post('/')
  async create(@Body() body: CreateTransactionIn) {
    const useCase = new CreateTransaction(this.transactionRepository);

    return await useCase.execute(body);
  }
}

