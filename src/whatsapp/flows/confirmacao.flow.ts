import { Injectable } from '@nestjs/common';
import { OrcamentosService } from '../../orcamentos/orcamentos.service';
import { WhatsappContextStore } from '../core/whatsapp.context';
import { WhatsappSender } from '../core/whatsapp.sender';

@Injectable()
export class ConfirmacaoFlow {
  constructor(
    private readonly orcamentosService: OrcamentosService,
    private readonly sender: WhatsappSender,
    private readonly context: WhatsappContextStore,
  ) {}

  async finalizar(chatId: string) {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto não encontrado');
    const pdfBase64 = await this.orcamentosService.gerarPdf(ctx.orcamentoId);
    const total = await this.orcamentosService.calcularTotal(ctx.orcamentoId);
    await this.sender.enviarPdf(chatId, pdfBase64, 'orcamento.pdf');
    this.context.set(chatId, { ...ctx, step: 'finalizado' });
    return `Orçamento finalizado! Total ${total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })}`;
  }
}
