import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfissionalService {
  constructor(private readonly prisma: PrismaService) {}

  async criarOuAtualizar(profissional: { id?: string; nome: string; telefone: string; email?: string }) {
    if (profissional.id) {
      return this.prisma.profissional.update({
        where: { id: profissional.id },
        data: profissional,
      });
    }
    return this.prisma.profissional.create({ data: profissional });
  }

  async obter(id: string) {
    return this.prisma.profissional.findUnique({ where: { id } });
  }
}
