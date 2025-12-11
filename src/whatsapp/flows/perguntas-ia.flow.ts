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
    let historicoGlobal: string[] = payload.historicoGlobal ?? [];
    let localizacao: { cidadeEstado?: string; bairro?: string } = payload.localizacao ?? {};
    const servicos = payload.servicos ?? [];
    let servicoAtual = payload.servicoAtual ?? 0;
    let finalizando = payload.finalizando ?? false;
    const servicoContexto = servicos[servicoAtual];
    if (respostaAnterior) {
      const perguntaRegistrada = payload.ultimaPergunta ?? `Pergunta ${historico.length + 1}`;
      const registroHistorico = payload.ultimaPergunta
        ? `Pergunta: ${payload.ultimaPergunta}\nResposta: ${respostaAnterior}`
        : respostaAnterior;

      historico.push(registroHistorico);
      if (this.isPerguntaLocalizacao(perguntaRegistrada)) {
        historicoGlobal = [...historicoGlobal, registroHistorico];
        localizacao = this.atualizarLocalizacao(localizacao, perguntaRegistrada, respostaAnterior);
      }
      await this.orcamentosService.registrarResposta(ctx.orcamentoId, perguntaRegistrada, respostaAnterior);

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
            payload: {
              ...payload,
              historico,
              historicoGlobal,
              localizacao,
              servicos,
              servicoAtual,
              finalizando: false,
            },
          });

          return { finalizado: true };
        }
      }
    }

    const descricaoContexto = servicoContexto
      ? `Serviço: ${servicoContexto.titulo}${servicoContexto.descricao ? ` - ${servicoContexto.descricao}` : ''}`
      : 'Serviço geral solicitado';
    const historicoComum = [...historicoGlobal, ...historico];
    const { pergunta, finalizado } = await this.iaService.gerarPerguntaInteligente(
      descricaoContexto,
      historicoComum,
      localizacao,
    );
    const novoContexto: WhatsappContext = {
      ...ctx,
      step: 'perguntas-ia',
      payload: {
        ...payload,
        historico,
        historicoGlobal,
        localizacao,
        servicos,
        servicoAtual,
        finalizando: finalizado,
        ultimaPergunta: pergunta,
      },
    };
    this.context.set(chatId, novoContexto);
    return { pergunta, finalizado: false };
  }

  private isPerguntaLocalizacao(pergunta: string): boolean {
    const texto = pergunta.toLowerCase();
    return texto.includes('cidade') || texto.includes('estado') || texto.includes('bairro');
  }

  private atualizarLocalizacao(
    atual: { cidadeEstado?: string; bairro?: string },
    pergunta: string,
    resposta: string,
  ): { cidadeEstado?: string; bairro?: string } {
    const texto = pergunta.toLowerCase();
    const novo = { ...atual };

    if (texto.includes('cidade') || texto.includes('estado')) {
      novo.cidadeEstado = resposta.trim();
    }

    if (texto.includes('bairro')) {
      novo.bairro = resposta.trim();
    }

    return novo;
  }
}
