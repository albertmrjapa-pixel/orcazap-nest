import { Injectable } from '@nestjs/common';
import { IaService } from '../../ia/ia.service';
import { OrcamentosService } from '../../orcamentos/orcamentos.service';
import { WhatsappContextStore } from '../core/whatsapp.context';
import { WhatsappContext } from '../types/whatsapp-context.type';

@Injectable()
export class ColetaFlow {
  constructor(
    private readonly iaService: IaService,
    private readonly orcamentosService: OrcamentosService,
    private readonly context: WhatsappContextStore,
  ) {}

  async iniciar(chatId: string, profissionalId: string, descricao: string) {
    const servicos = await this.iaService.separarServicos(descricao);
    const orcamento = await this.orcamentosService.criar(profissionalId);
    await this.orcamentosService.registrarServicos(orcamento.id, servicos);
    const ctx: WhatsappContext = {
      chatId,
      profissionalId,
      orcamentoId: orcamento.id,
      step: 'perguntas-ia',
      payload: { historico: [], servicos, servicoAtual: 0 },
    };
    this.context.set(chatId, ctx);
    return {
      mensagem: `Identificamos ${servicos.length} serviço(s). Vamos detalhar com perguntas inteligentes.`,
      orcamentoId: orcamento.id,
    };
  }
}
