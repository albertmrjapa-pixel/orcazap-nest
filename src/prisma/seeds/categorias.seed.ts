import { PrismaClient } from '@prisma/client';

export async function seedCategorias(prisma: PrismaClient) {
  const categorias = ['Elétrica', 'Pintura', 'Pedreiro', 'Refrigeração'];
  for (const nome of categorias) {
    const categoriaExistente = await prisma.categoria.findFirst({ where: { nome } });

    if (!categoriaExistente) {
      await prisma.categoria.create({ data: { nome } });
    }
  }
}
