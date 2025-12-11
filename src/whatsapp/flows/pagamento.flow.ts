import { Injectable } from '@nestjs/common';
import { PixService } from '../../pix/pix.service';
import { WhatsappContextStore } from '../core/whatsapp.context';

@Injectable()
export class PagamentoFlow {
  private readonly opcoesRecarga = [
    { valor: 19.9, tokens: 100, emoji: '1️⃣', numero: '1' },
    { valor: 49.9, tokens: 500, emoji: '2️⃣', numero: '2' },
    { valor: 79.9, tokens: 1000, emoji: '3️⃣', numero: '3' },
    { valor: 99.9, tokens: 2000, emoji: '4️⃣', numero: '4' },
  ];

  constructor(private readonly pixService: PixService, private readonly context: WhatsappContextStore) {}

  async solicitarValorRecarga(chatId: string) {
    const ctx = this.context.get(chatId);
    if (!ctx?.profissionalId) throw new Error('Profissional não encontrado');

    this.context.set(chatId, { ...ctx, step: 'pagamento-escolha', payload: {} });

    return `Escolha um valor para recarregar seu saldo:\n${this.gerarMenuRecarga()}\n\n` +
      'Envie o número ou emoji da opção desejada.';
  }

  async processarEscolha(chatId: string, escolha: string) {
    const opcao = this.normalizarEscolha(escolha);

    if (!opcao) {
      return `Opção inválida. Escolha uma das opções:\n${this.gerarMenuRecarga()}`;
    }

    const mensagemPix = await this.iniciar(chatId, opcao.valor);
    const valorFormatado = opcao.valor.toFixed(2).replace('.', ',');

    return `Você escolheu ${opcao.emoji} R$ ${valorFormatado} (${opcao.tokens} tokens). ${mensagemPix}`;
  }

  async iniciar(chatId: string, valor: number) {
    const ctx = this.context.get(chatId);
    if (!ctx?.profissionalId) throw new Error('Profissional não encontrado');

    const cobranca = await this.pixService.gerarCobranca(valor, ctx.profissionalId);
    this.context.set(chatId, { ...ctx, step: 'pagamento', payload: { cobranca } });
    return `Use o PIX copia-e-cola para pagar: ${cobranca.copiaCola}`;
  }

  async iniciarRecargaPadrao(chatId: string) {
    const mensagem = await this.solicitarValorRecarga(chatId);
    return `Você está sem créditos. ${mensagem}`;
  }

  private gerarMenuRecarga() {
    return this.opcoesRecarga
      .map((opcao) => `${opcao.emoji} - R$ ${opcao.valor.toFixed(2).replace('.', ',')} (${opcao.tokens} tokens)`) 
      .join('\n');
  }

  private normalizarEscolha(escolha: string) {
    const texto = escolha.trim();
    const apenasNumeros = texto.replace(/\D/g, '');

    return (
      this.opcoesRecarga.find((opcao) => opcao.numero === apenasNumeros) ||
      this.opcoesRecarga.find((opcao) => opcao.emoji === texto)
    );
  }
}
