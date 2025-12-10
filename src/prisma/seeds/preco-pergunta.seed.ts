import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categorias = await prisma.categoria.findMany();
  for (const categoria of categorias) {
    for (let ordem = 1; ordem <= 3; ordem++) {
      await prisma.perguntaIa.upsert({
        where: { id: `${categoria.id}-${ordem}` },
        update: {},
        create: {
          id: `${categoria.id}-${ordem}`,
          categoriaId: categoria.id,
          texto: `Pergunta inteligente ${ordem} para ${categoria.nome}`,
          ordem,
          custo: 1,
        },
      });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
