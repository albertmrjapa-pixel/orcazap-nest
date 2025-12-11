import { Injectable } from '@nestjs/common';
import { PixService } from '../../pix/pix.service';
import { WhatsappContextStore } from '../core/whatsapp.context';

@Injectable()
export class PagamentoFlow {
  constructor(private readonly pixService: PixService, private readonly context: WhatsappContextStore) {}

  async iniciar(chatId: string, valor: number) {
    const ctx = this.context.get(chatId);
    if (!ctx?.profissionalId) throw new Error('Profissional não encontrado');

    const cobranca = await this.pixService.gerarCobranca(valor, ctx.profissionalId);
    this.context.set(chatId, { ...ctx, step: 'pagamento', payload: { cobranca } });
    return `Use o PIX copia-e-cola para pagar: ${cobranca.copiaCola}`;
  }

  async iniciarRecargaPadrao(chatId: string, valorPadrao = 19.9) {
    const mensagem = await this.iniciar(chatId, valorPadrao);
    return `Você está sem créditos. Geramos uma cobrança de R$ ${valorPadrao.toFixed(2)} para recarregar. ${mensagem}`;
  }
}
