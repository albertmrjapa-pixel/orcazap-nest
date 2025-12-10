import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PixService {
  constructor(private readonly prisma: PrismaService) {}

  criarCobranca(profissionalId: string, valor: number) {
    return {
      profissionalId,
      valor,
      copiaECola: `000201PIXMOCK${profissionalId}${valor}`,
      txid: `pix-${Date.now()}`,
    };
  }

  async confirmarPagamento(profissionalId: string, valor: number) {
    await this.prisma.profissional.update({
      where: { id: profissionalId },
      data: { saldo: { increment: valor } },
    });
    return { status: 'confirmado', valor };
  }
}
