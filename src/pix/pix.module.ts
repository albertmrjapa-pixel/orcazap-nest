import { Module, forwardRef } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixController } from './pix.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfissionalModule } from '../profissional/profissional.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, ProfissionalModule, forwardRef(() => WhatsappModule)],
  providers: [PixService],
  controllers: [PixController],
  exports: [PixService],
})
export class PixModule {}
