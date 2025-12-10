import { PrismaClient } from '@prisma/client';

export async function seedTreinamentos(prisma: PrismaClient) {
  const categorias = await prisma.categoria.findMany();

  for (const categoria of categorias) {
    await prisma.treinamentoIaCategoria.upsert({
      where: { id: `${categoria.id}-global` },
      update: {},
      create: {
        id: `${categoria.id}-global`,
        categoriaId: categoria.id,
        conteudo: `Boas práticas para ${categoria.nome}: sempre visite o local e explique a solução em linguagem simples.`,
      },
    });
  }
}
