import { Body, Controller, Post } from '@nestjs/common';
import { PixService } from './pix.service';

@Controller('pix')
export class PixController {
  constructor(private readonly service: PixService) {}

  @Post('webhook')
  async webhook(@Body() body: Record<string, any>) {
    const txid = body?.pix?.[0]?.txid || body?.txid;
    if (!txid) return { status: 'ignored' };

    return this.service.confirmarPagamento(txid);
  }
}
