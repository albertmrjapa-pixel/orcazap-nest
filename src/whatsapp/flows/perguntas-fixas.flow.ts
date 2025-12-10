import { Injectable } from '@nestjs/common';
import { OrcamentosService } from '../../orcamentos/orcamentos.service';
import { WhatsappContextStore } from '../core/whatsapp.context';

const CAMPOS_FIXOS = ['Prazo', 'Forma de pagamento', 'Validade', 'Observações'];

@Injectable()
export class PerguntasFixasFlow {
  constructor(
    private readonly orcamentosService: OrcamentosService,
    private readonly context: WhatsappContextStore,
  ) {}

  proximaPergunta(index: number) {
    return CAMPOS_FIXOS[index];
  }

  async registrarResposta(chatId: string, resposta: string, index: number) {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto de orçamento não encontrado');
    const campo = CAMPOS_FIXOS[index];
    await this.orcamentosService.registrarRespostaFixa(ctx.orcamentoId, campo, resposta);
    const proxima = CAMPOS_FIXOS[index + 1];
    if (!proxima) {
      this.context.set(chatId, { ...ctx, step: 'confirmacao' });
    }
    return proxima;
  }
}
