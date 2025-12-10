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

  async perguntar(chatId: string, respostaAnterior?: string) {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto de orçamento não encontrado');
    const payload = ctx.payload ?? {};
    const historico: string[] = payload.historico ?? [];
    const servicos = payload.servicos ?? [];
    const servicoAtual = payload.servicoAtual ?? 0;
    const servicoContexto = servicos[servicoAtual];
    if (respostaAnterior) {
      historico.push(respostaAnterior);
      await this.orcamentosService.registrarResposta(ctx.orcamentoId, `Pergunta ${historico.length}`, respostaAnterior);
    }
    const categoriaContexto = servicoContexto
      ? `Serviço: ${servicoContexto.titulo}${servicoContexto.descricao ? ` - ${servicoContexto.descricao}` : ''}`
      : 'Serviço geral solicitado';
    const pergunta = await this.iaService.gerarPerguntaInteligente(categoriaContexto, historico);
    const novoContexto: WhatsappContext = {
      ...ctx,
      step: 'perguntas-ia',
      payload: { ...payload, historico, servicos, servicoAtual },
    };
    this.context.set(chatId, novoContexto);
    return pergunta;
  }
}
