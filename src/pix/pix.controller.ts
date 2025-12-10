import { Body, Controller, Post } from '@nestjs/common';
import { PixService } from './pix.service';

@Controller('pix')
export class PixController {
  constructor(private readonly service: PixService) {}

  @Post('webhook')
  async webhook(@Body() body: { profissionalId: string; valor: number }) {
    return this.service.confirmarPagamento(body.profissionalId, body.valor);
  }
}
