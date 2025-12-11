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

  async perguntar(chatId: string, respostaAnterior?: string): Promise<{ pergunta?: string; finalizado: boolean }> {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto de orçamento não encontrado');
    const payload = ctx.payload ?? {};
    let historico: string[] = payload.historico ?? [];
    const servicos = payload.servicos ?? [];
    let servicoAtual = payload.servicoAtual ?? 0;
    let finalizando = payload.finalizando ?? false;
    const servicoContexto = servicos[servicoAtual];
    if (respostaAnterior) {
      historico.push(respostaAnterior);
      await this.orcamentosService.registrarResposta(ctx.orcamentoId, `Pergunta ${historico.length}`, respostaAnterior);

      if (finalizando) {
        const possuiProximoServico = servicoAtual + 1 < servicos.length;
        if (possuiProximoServico) {
          servicoAtual += 1;
          historico = [];
          finalizando = false;
        } else {
          this.context.set(chatId, {
            ...ctx,
            step: 'perguntas-ia',
            payload: { ...payload, historico, servicos, servicoAtual, finalizando: false },
          });

          return { finalizado: true };
        }
      }
    }

    const categoriaContexto = servicoContexto
      ? `Serviço: ${servicoContexto.titulo}${servicoContexto.descricao ? ` - ${servicoContexto.descricao}` : ''}`
      : 'Serviço geral solicitado';
    const { pergunta, finalizado } = await this.iaService.gerarPerguntaInteligente(categoriaContexto, historico);
    const novoContexto: WhatsappContext = {
      ...ctx,
      step: 'perguntas-ia',
      payload: { ...payload, historico, servicos, servicoAtual, finalizando: finalizado },
    };
    this.context.set(chatId, novoContexto);
    return { pergunta, finalizado: false };
  }
}
