import { Injectable } from '@nestjs/common';
import { OrcamentosService } from '../../orcamentos/orcamentos.service';
import { WhatsappContextStore } from '../core/whatsapp.context';

@Injectable()
export class MateriaisFlow {
  constructor(
    private readonly orcamentosService: OrcamentosService,
    private readonly context: WhatsappContextStore,
  ) {}

  async gerar(chatId: string) {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto não encontrado');
    const materiais = await this.orcamentosService.estimarMateriais(ctx.orcamentoId);
    return materiais.map((m) => `${m.nome} - ${m.quantidade} ${m.unidade}`).join('\n');
  }
}
