import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfissionalService {
  constructor(private readonly prisma: PrismaService) {}

  async criarOuAtualizar(
    profissional: { id?: string; nome: string; telefone: string; email?: string },
    options?: { saldoInicial?: number },
  ) {
    if (profissional.id) {
      return this.prisma.profissional.update({
        where: { id: profissional.id },
        data: profissional,
      });
    }

    const data = { ...profissional } as { id?: string; nome: string; telefone: string; email?: string; saldo?: number };
    if (options?.saldoInicial !== undefined) {
      data.saldo = options.saldoInicial;
    }

    return this.prisma.profissional.create({ data });
  }

  async obter(id: string) {
    return this.prisma.profissional.findUnique({ where: { id } });
  }

  async obterPorTelefone(telefone: string) {
    return this.prisma.profissional.findFirst({ where: { telefone } });
  }

  async debitarSaldo(profissionalId: string, valor: number) {
    if (valor <= 0) return;

    const profissional = await this.obter(profissionalId);
    if (!profissional || profissional.saldo <= 0) return;

    const decremento = Math.min(valor, profissional.saldo);

    return this.prisma.profissional.update({
      where: { id: profissionalId },
      data: { saldo: { decrement: decremento } },
    });
  }

  async adicionarSaldo(profissionalId: string, valor: number) {
    if (valor <= 0) return;

    return this.prisma.profissional.update({
      where: { id: profissionalId },
      data: { saldo: { increment: valor } },
    });
  }
}
