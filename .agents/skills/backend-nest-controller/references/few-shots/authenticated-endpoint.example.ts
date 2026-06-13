// Exemplo ilustrativo. O scope "@<workspace>/<modulo>" e um placeholder:
// derive o scope real dos exports/index.ts do agregado/modulo alvo
// (normalmente o "name" do package.json do workspace correspondente).
// Os imports relativos abaixo partem do proprio controller, que vive em
// apps/backend/src/modules/<modulo>/; ajuste os caminhos ao local real
// (../../shared/** para a infraestrutura compartilhada do backend).
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ListMyTransactions,
  type ListMyTransactionsIn,
} from '@<workspace>/<modulo>';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { PrismaTransactionRepository } from './transaction.prisma';

type ListMyTransactionsHttpQuery = {
  page?: number;
  perPage?: number;
};

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionRepository: PrismaTransactionRepository,
  ) {}

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async listMine(
    @CurrentUser('id') userId: string,
    @Query() query: ListMyTransactionsHttpQuery,
  ) {
    const useCase = new ListMyTransactions(this.transactionRepository);

    const input: ListMyTransactionsIn = {
      ...query,
      userId,
    };

    return await useCase.execute(input);
  }
}

