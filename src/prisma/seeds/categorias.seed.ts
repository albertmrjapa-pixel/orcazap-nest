import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categorias = ['Elétrica', 'Pintura', 'Pedreiro', 'Refrigeração'];
  for (const nome of categorias) {
    const categoriaExistente = await prisma.categoria.findFirst({ where: { nome } });

    if (!categoriaExistente) {
      await prisma.categoria.create({ data: { nome } });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
