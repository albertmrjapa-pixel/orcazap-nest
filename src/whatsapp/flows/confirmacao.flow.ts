import { Injectable } from '@nestjs/common';
import { OrcamentosService } from '../../orcamentos/orcamentos.service';
import { CalculadoraOrcamento } from '../../orcamentos/utils/calculadora-orcamento';
import { WhatsappContextStore } from '../core/whatsapp.context';
import { WhatsappSender } from '../core/whatsapp.sender';

@Injectable()
export class ConfirmacaoFlow {
  constructor(
    private readonly orcamentosService: OrcamentosService,
    private readonly sender: WhatsappSender,
    private readonly context: WhatsappContextStore,
  ) {}

  private formatarServicos(servicos: any[]) {
    return servicos
      .map((servico, index) => {
        const preco = servico.preco ?? 0;
        const quantidade = servico.quantidade ?? 1;
        const valor = preco * quantidade;
        const valorTexto = valor.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        const alerta = preco <= 0 ? ' ⚠️ Defina um valor para este item.' : '';
        const detalhes = servico.descricao ? ` - ${servico.descricao}` : '';
        return `${index + 1}. ${servico.titulo}${detalhes} - ${quantidade}x ${valorTexto}${alerta}`;
      })
      .join('\n');
  }

  private async obterContextoOrcamento(chatId: string) {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto não encontrado');
    return ctx.orcamentoId;
  }

  async solicitarConfirmacao(chatId: string) {
    const orcamentoId = await this.obterContextoOrcamento(chatId);
    const servicos = await this.orcamentosService.listarServicos(orcamentoId);
    const total = CalculadoraOrcamento.calcularTotal(servicos);
    const lista = this.formatarServicos(servicos);
    const possuiValorZerado = servicos.some((s) => (s.preco ?? 0) <= 0);

    this.context.set(chatId, { ...this.context.get(chatId)!, step: 'confirmacao' });

    const instrucoes =
      'Digite CONFIRMAR para gerar o orçamento ou ALTERAR <número do serviço> <novo valor> para ajustar preços.';
    const alertaTotal =
      total <= 0 || possuiValorZerado
        ? '\n⚠️ Há serviços sem valor definido. Atualize-os antes de confirmar.'
        : '';

    return `Revise os valores dos serviços:\n${lista}\n\nTotal: ${total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })}${alertaTotal}\n${instrucoes}`;
  }

  async alterarValor(chatId: string, indice: number, novoValor: number) {
    const orcamentoId = await this.obterContextoOrcamento(chatId);
    const servicos = await this.orcamentosService.listarServicos(orcamentoId);
    const indexServico = indice - 1;
    if (indexServico < 0 || indexServico >= servicos.length) {
      return 'Serviço não encontrado. Informe o número indicado na lista.';
    }

    const atualizados = servicos.map((servico, idx) =>
      idx === indexServico ? { ...servico, preco: novoValor } : servico,
    );
    await this.orcamentosService.registrarServicos(orcamentoId, atualizados);
    const total = CalculadoraOrcamento.calcularTotal(atualizados);

    return `Valor atualizado com sucesso. Novo total: ${total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })}`;
  }

  async confirmar(chatId: string) {
    const ctx = this.context.get(chatId);
    if (!ctx?.orcamentoId) throw new Error('Contexto não encontrado');

    const servicos = await this.orcamentosService.listarServicos(ctx.orcamentoId);
    const possuiValorZerado = servicos.some((s) => (s.preco ?? 0) <= 0);
    const total = CalculadoraOrcamento.calcularTotal(servicos);

    if (total <= 0 || possuiValorZerado) {
      return {
        finalizado: false,
        mensagem:
          'Existem serviços sem valor definido. Atualize os preços antes de finalizar (use ALTERAR <número> <valor>).',
      };
    }

    const pdfBase64 = await this.orcamentosService.gerarPdf(ctx.orcamentoId);
    await this.sender.enviarPdf(chatId, pdfBase64, 'orcamento.pdf');
    this.context.set(chatId, { ...ctx, step: 'finalizado' });
    const mensagem = `Orçamento finalizado! Total ${total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })}`;

    return { finalizado: true, mensagem };
  }
}
