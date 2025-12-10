import { Injectable } from '@nestjs/common';
import { PixService } from '../../pix/pix.service';
import { WhatsappContextStore } from '../core/whatsapp.context';

@Injectable()
export class PagamentoFlow {
  constructor(private readonly pixService: PixService, private readonly context: WhatsappContextStore) {}

  iniciar(chatId: string, valor: number) {
    const ctx = this.context.get(chatId);
    if (!ctx?.profissionalId) throw new Error('Profissional não encontrado');
    const cobranca = this.pixService.criarCobranca(ctx.profissionalId, valor);
    this.context.set(chatId, { ...ctx, step: 'pagamento', payload: { cobranca } });
    return `Use o PIX copia-e-cola para pagar: ${cobranca.copiaECola}`;
  }
}
