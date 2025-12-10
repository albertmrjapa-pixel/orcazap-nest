import { PrismaClient } from '@prisma/client';
import { seedCategorias } from '../src/prisma/seeds/categorias.seed';
import { seedPrecosPerguntas } from '../src/prisma/seeds/preco-pergunta.seed';
import { seedTreinamentos } from '../src/prisma/seeds/treinamento.seed';

const prisma = new PrismaClient();

async function main() {
  await seedCategorias(prisma);
  await seedPrecosPerguntas(prisma);
  await seedTreinamentos(prisma);
}

main()
  .catch((error) => {
    console.error('Erro ao executar seeds:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
