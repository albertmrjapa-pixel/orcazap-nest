import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { OrcamentosModule } from './orcamentos/orcamentos.module';
import { PixModule } from './pix/pix.module';
import { ProfissionalModule } from './profissional/profissional.module';
import { IaModule } from './ia/ia.module';
import { PdfModule } from './pdf/pdf.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    WhatsappModule,
    OrcamentosModule,
    PixModule,
    ProfissionalModule,
    IaModule,
    PdfModule,
  ],
})
export class AppModule {}
