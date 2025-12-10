import { Injectable } from '@nestjs/common';
import { OrcamentosService } from '../../orcamentos/orcamentos.service';
import { WhatsappContextStore } from '../core/whatsapp.context';

@Injectable()
export class AjustePrecosFlow {
  constructor(
    private readonly orcamentosService: OrcamentosService,
    private readonly context: WhatsappContextStore,
  ) {}

  async aplicarAjuste(chatId: string, fator: number) {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto não encontrado');
    const servicos = await this.orcamentosService.listarServicos(ctx.orcamentoId);
    const ajustados = servicos.map((s) => ({ ...s, preco: s.preco * fator }));
    await this.orcamentosService.registrarServicos(ctx.orcamentoId, ajustados);
    return 'Valores atualizados com sucesso.';
  }
}
