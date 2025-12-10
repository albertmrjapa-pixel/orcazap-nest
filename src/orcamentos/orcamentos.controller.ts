import { Controller, Get, Param } from '@nestjs/common';
import { OrcamentosService } from './orcamentos.service';

@Controller('orcamentos')
export class OrcamentosController {
  constructor(private readonly service: OrcamentosService) {}

  @Get(':id/pdf')
  async gerarPdf(@Param('id') id: string) {
    const base64 = await this.service.gerarPdf(id);
    return { id, pdfBase64: base64 };
  }

  @Get(':id/total')
  async total(@Param('id') id: string) {
    return { total: await this.service.calcularTotal(id) };
  }
}
