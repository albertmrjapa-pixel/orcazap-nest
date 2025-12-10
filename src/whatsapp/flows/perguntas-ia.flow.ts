import { Injectable } from '@nestjs/common';
import { IaService } from '../../ia/ia.service';
import { OrcamentosService } from '../../orcamentos/orcamentos.service';
import { WhatsappContextStore } from '../core/whatsapp.context';
import { WhatsappContext } from '../types/whatsapp-context.type';

@Injectable()
export class PerguntasIaFlow {
  constructor(
    private readonly iaService: IaService,
    private readonly orcamentosService: OrcamentosService,
    private readonly context: WhatsappContextStore,
  ) {}

  async perguntar(chatId: string, categoria: string, respostaAnterior?: string) {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto de orçamento não encontrado');
    const historico: string[] = ctx.payload?.historico ?? [];
    if (respostaAnterior) {
      historico.push(respostaAnterior);
      await this.orcamentosService.registrarResposta(ctx.orcamentoId, `Pergunta ${historico.length}`, respostaAnterior);
    }
    const pergunta = await this.iaService.gerarPerguntaInteligente(categoria, historico);
    const novoContexto: WhatsappContext = { ...ctx, step: 'perguntas-ia', payload: { historico } };
    this.context.set(chatId, novoContexto);
    return pergunta;
  }
}
