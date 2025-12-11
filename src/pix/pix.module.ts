import { Module } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixController } from './pix.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfissionalModule } from '../profissional/profissional.module';

@Module({
  imports: [PrismaModule, ProfissionalModule],
  providers: [PixService],
  controllers: [PixController],
  exports: [PixService],
})
export class PixModule {}
