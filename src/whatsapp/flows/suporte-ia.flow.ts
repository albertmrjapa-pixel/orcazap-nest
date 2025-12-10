import { Injectable } from '@nestjs/common';
import { IaService } from '../../ia/ia.service';

@Injectable()
export class SuporteIaFlow {
  constructor(private readonly iaService: IaService) {}

  async responder(pergunta: string, historico: string[] = []) {
    return this.iaService.suporte(pergunta, historico);
  }
}
