import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const enableTracing = process.env.PRISMA_ENABLE_TRACING === 'true';

    super({
      log: ['error', 'warn'],
      // Prisma's query engine expects the enableTracing flag in constructor options.
      ...({ enableTracing } as Record<string, unknown>),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
