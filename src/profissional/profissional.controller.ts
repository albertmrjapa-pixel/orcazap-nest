import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProfissionalService } from './profissional.service';

@Controller('profissionais')
export class ProfissionalController {
  constructor(private readonly service: ProfissionalService) {}

  @Post()
  criar(@Body() body: { id?: string; nome: string; telefone: string; email?: string }) {
    return this.service.criarOuAtualizar(body);
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.service.obter(id);
  }
}
