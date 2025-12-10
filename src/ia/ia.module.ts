import { Module } from '@nestjs/common';
import { IaService } from './ia.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [IaService],
  exports: [IaService],
})
export class IaModule {}
