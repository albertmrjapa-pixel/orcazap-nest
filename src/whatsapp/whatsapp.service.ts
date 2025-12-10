import { Injectable, Logger } from '@nestjs/common';
import { WhatsappSender } from './core/whatsapp.sender';
import { WhatsappContextStore } from './core/whatsapp.context';
import { gerarMenuPrincipal } from './utils/menu';
import { MENU_OPCOES } from './utils/constants';
import { CadastroFlow } from './flows/cadastro.flow';
import { ColetaFlow } from './flows/coleta.flow';
import { PerguntasIaFlow } from './flows/perguntas-ia.flow';
import { PerguntasFixasFlow } from './flows/perguntas-fixas.flow';
import { ConfirmacaoFlow } from './flows/confirmacao.flow';
import { PagamentoFlow } from './flows/pagamento.flow';
import { AjustePrecosFlow } from './flows/ajuste-precos.flow';
import { MateriaisFlow } from './flows/materiais.flow';
import { MeuPerfilFlow } from './flows/meu-perfil.flow';
import { SuporteIaFlow } from './flows/suporte-ia.flow';
import { TtsService } from './core/tts.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly sender: WhatsappSender,
    private readonly context: WhatsappContextStore,
    private readonly cadastroFlow: CadastroFlow,
    private readonly coletaFlow: ColetaFlow,
    private readonly perguntasIaFlow: PerguntasIaFlow,
    private readonly perguntasFixasFlow: PerguntasFixasFlow,
    private readonly confirmacaoFlow: ConfirmacaoFlow,
    private readonly pagamentoFlow: PagamentoFlow,
    private readonly ajustePrecosFlow: AjustePrecosFlow,
    private readonly materiaisFlow: MateriaisFlow,
    private readonly meuPerfilFlow: MeuPerfilFlow,
    private readonly suporteIaFlow: SuporteIaFlow,
    private readonly ttsService: TtsService,
  ) {}

  async processarMensagem(chatId: string, mensagem: string) {
    const texto = mensagem.trim();
    let ctx = this.context.get(chatId);

    if (!ctx) {
      const cadastroMsg = await this.cadastroFlow.executar(chatId, {
        nome: `Profissional ${chatId}`,
        telefone: chatId,
      });
      await this.sender.enviarTexto(chatId, `${cadastroMsg}\n${gerarMenuPrincipal()}`);
      return;
    }

    if (texto.toLowerCase() === 'menu') {
      this.context.set(chatId, { ...ctx, step: 'menu' });
      await this.sender.enviarTexto(chatId, gerarMenuPrincipal());
      return;
    }

    switch (ctx.step) {
      case 'menu':
        await this.tratarMenu(chatId, texto);
        break;
      case 'coleta-descricao':
        await this.tratarColeta(chatId, texto);
        break;
      case 'perguntas-ia':
        await this.tratarPerguntasIa(chatId, texto);
        break;
      case 'perguntas-fixas':
        await this.tratarPerguntasFixas(chatId, texto);
        break;
      case 'confirmacao':
        await this.tratarConfirmacao(chatId, texto);
        break;
      case 'pagamento':
        await this.sender.enviarTexto(chatId, 'Aguardando confirmação do PIX.');
        break;
      default:
        await this.sender.enviarTexto(chatId, gerarMenuPrincipal());
    }
  }

  private async tratarMenu(chatId: string, opcao: string) {
    const ctx = this.context.get(chatId)!;
    if (opcao === MENU_OPCOES.CRIAR_ORCAMENTO) {
      this.context.set(chatId, { ...ctx, step: 'coleta-descricao' });
      await this.sender.enviarTexto(chatId, 'Descreva o serviço que deseja orçar.');
    } else if (opcao === MENU_OPCOES.COMPRAR_CREDITOS) {
      const resposta = this.pagamentoFlow.iniciar(chatId, 20);
      await this.sender.enviarTexto(chatId, resposta);
    } else if (opcao === MENU_OPCOES.MEUS_ORCAMENTOS) {
      await this.sender.enviarTexto(chatId, 'Em breve listaremos seus orçamentos anteriores.');
    } else if (opcao === MENU_OPCOES.MEU_PERFIL) {
      const perfil = await this.meuPerfilFlow.exibir(chatId);
      await this.sender.enviarTexto(chatId, perfil);
    } else if (opcao === MENU_OPCOES.ORCAR_MATERIAIS) {
      const materiais = await this.materiaisFlow.gerar(chatId);
      await this.sender.enviarTexto(chatId, materiais);
    } else if (opcao === MENU_OPCOES.SUPORTE_IA) {
      const resposta = await this.suporteIaFlow.responder('Ajuda solicitada');
      await this.sender.enviarTexto(chatId, resposta);
    } else {
      await this.sender.enviarTexto(chatId, 'Opção inválida. Digite menu para ver opções.');
    }
  }

  private async tratarColeta(chatId: string, descricao: string) {
    const ctx = this.context.get(chatId)!;
    const resultado = await this.coletaFlow.iniciar(chatId, ctx.profissionalId, descricao);
    await this.sender.enviarTexto(chatId, resultado.mensagem);
    await this.tratarPerguntasIa(chatId, '');
  }

  private async tratarPerguntasIa(chatId: string, respostaAnterior: string) {
    const ctx = this.context.get(chatId)!;
    const pergunta = await this.perguntasIaFlow.perguntar(chatId, respostaAnterior || undefined);
    const historico = this.context.get(chatId)!.payload?.historico ?? [];
    if (historico.length >= 3) {
      this.context.set(chatId, { ...ctx, step: 'perguntas-fixas', payload: { fixaIndex: 0 } });
      const primeira = this.perguntasFixasFlow.proximaPergunta(0);
      await this.sender.enviarTexto(chatId, `Perguntas finais: ${primeira}`);
    } else {
      await this.sender.enviarTexto(chatId, pergunta);
    }
  }

  private async tratarPerguntasFixas(chatId: string, resposta: string) {
    const ctx = this.context.get(chatId)!;
    const index = ctx.payload?.fixaIndex ?? 0;
    const proxima = await this.perguntasFixasFlow.registrarResposta(chatId, resposta, index);
    if (proxima) {
      this.context.set(chatId, { ...ctx, payload: { fixaIndex: index + 1 }, step: 'perguntas-fixas' });
      await this.sender.enviarTexto(chatId, proxima);
    } else {
      const mensagem = await this.confirmacaoFlow.solicitarConfirmacao(chatId);
      await this.sender.enviarTexto(chatId, mensagem);
    }
  }

  private async tratarConfirmacao(chatId: string, texto: string) {
    const comando = texto.trim();

    if (comando.toLowerCase() === 'confirmar') {
      const resultado = await this.confirmacaoFlow.confirmar(chatId);
      await this.sender.enviarTexto(chatId, resultado.mensagem);

      if (resultado.finalizado) {
        const audio = await this.ttsService.gerarAudio(
          'Seu orçamento está pronto!',
          `orcamento-${chatId}`,
        );

        await this.sender.enviarAudio(
          chatId,
          audio.base64,
          audio.mimeType,
          audio.filename,
          false,
        );
      }
      return;
    }

    const alterarMatch = comando.match(/alterar\s+(\d+)\s+([\d,.]+)/i);
    if (alterarMatch) {
      const indice = parseInt(alterarMatch[1], 10);
      const valor = parseFloat(alterarMatch[2].replace(/\./g, '').replace(',', '.'));
      if (isNaN(valor) || valor <= 0) {
        await this.sender.enviarTexto(chatId, 'Informe um valor válido maior que zero.');
        return;
      }

      const mensagem = await this.confirmacaoFlow.alterarValor(chatId, indice, valor);
      await this.sender.enviarTexto(chatId, mensagem);
      const resumo = await this.confirmacaoFlow.solicitarConfirmacao(chatId);
      await this.sender.enviarTexto(chatId, resumo);
      return;
    }

    const resumo = await this.confirmacaoFlow.solicitarConfirmacao(chatId);
    await this.sender.enviarTexto(chatId, `Não entendi. ${resumo}`);
  }

  async aplicarAjuste(chatId: string, fator: number) {
    const mensagem = await this.ajustePrecosFlow.aplicarAjuste(chatId, fator);
    await this.sender.enviarTexto(chatId, mensagem);
  }
}
