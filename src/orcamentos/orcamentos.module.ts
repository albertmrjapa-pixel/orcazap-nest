import { Module } from '@nestjs/common';
import { OrcamentosService } from './orcamentos.service';
import { OrcamentosController } from './orcamentos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfModule } from '../pdf/pdf.module';
import { IaModule } from '../ia/ia.module';

@Module({
  imports: [PrismaModule, PdfModule, IaModule],
  providers: [OrcamentosService],
  controllers: [OrcamentosController],
  exports: [OrcamentosService],
})
export class OrcamentosModule {}
