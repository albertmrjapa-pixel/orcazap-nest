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
import { ProfissionalService } from '../profissional/profissional.service';
import { OrcamentosService } from '../orcamentos/orcamentos.service';
import { WhatsappContext } from './types/whatsapp-context.type';

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
    private readonly profissionalService: ProfissionalService,
    private readonly orcamentosService: OrcamentosService,
  ) {}

  async processarMensagem(chatId: string, mensagem: string) {
    const texto = mensagem.trim();
    const telefone = this.normalizarTelefone(chatId);
    let ctx = this.context.get(chatId);

    if (!ctx) {
      const profissionalExistente = await this.profissionalService.obterPorTelefone(telefone);

      if (profissionalExistente) {
        ctx = { profissionalId: profissionalExistente.id, chatId, step: 'menu' };
        this.context.set(chatId, ctx);
        await this.sender.enviarTexto(
          chatId,
          `Bem-vindo de volta, ${profissionalExistente.nome}!\n${gerarMenuPrincipal()}`,
        );
        return;
      }

      this.context.set(chatId, {
        chatId,
        step: 'cadastro-nome',
        payload: { telefone },
      });

      await this.sender.enviarTexto(chatId, 'Olá! Precisamos dos seus dados. Qual é o seu nome completo?');
      return;
    }

    if (texto.toLowerCase() === 'menu') {
      this.context.set(chatId, this.criarContextoBase(ctx));
      await this.sender.enviarTexto(chatId, gerarMenuPrincipal());
      return;
    }

    switch (ctx.step) {
      case 'cadastro-nome':
        await this.tratarCadastroNome(chatId, texto);
        break;
      case 'cadastro-email':
        await this.tratarCadastroEmail(chatId, texto);
        break;
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
      case 'definir-precos':
        await this.tratarDefinicaoPrecos(chatId, texto);
        break;
      case 'confirmacao':
        await this.tratarConfirmacao(chatId, texto);
        break;
      case 'confirmacao-alterar-servico':
        await this.tratarConfirmacaoSelecaoServico(chatId, texto);
        break;
      case 'confirmacao-alterar-valor':
        await this.tratarConfirmacaoValor(chatId, texto);
        break;
      case 'pagamento':
        await this.sender.enviarTexto(chatId, 'Aguardando confirmação do PIX.');
        break;
      case 'finalizado':
        this.context.set(chatId, this.criarContextoBase(ctx));
        await this.tratarMenu(chatId, texto);
        break;
      default:
        await this.sender.enviarTexto(chatId, gerarMenuPrincipal());
    }
  }

  private async tratarMenu(chatId: string, opcao: string) {
    const ctx = this.context.get(chatId)!;
    if (opcao === MENU_OPCOES.CRIAR_ORCAMENTO) {
      this.context.set(chatId, { ...this.criarContextoBase(ctx), step: 'coleta-descricao' });
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
    const resultado = await this.perguntasIaFlow.perguntar(chatId, respostaAnterior || undefined);

    if (resultado.finalizado) {
      this.context.set(chatId, { ...ctx, step: 'perguntas-fixas', payload: { fixaIndex: 0 } });
      const primeira = this.perguntasFixasFlow.proximaPergunta(0);
      await this.sender.enviarTexto(chatId, `Perguntas finais: ${primeira}`);
      return;
    }

    if (resultado.pergunta) {
      await this.sender.enviarTexto(chatId, resultado.pergunta);
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
      await this.iniciarDefinicaoPrecos(chatId);
    }
  }

  private async iniciarDefinicaoPrecos(chatId: string) {
    let ctx = this.context.get(chatId)!;
    if (!ctx.orcamentoId) throw new Error('Contexto de orçamento não encontrado');

    let servicos = await this.orcamentosService.listarServicos(ctx.orcamentoId);
    const precisaPrecificar = servicos.some((servico) => (servico.preco ?? 0) <= 0);

    if (precisaPrecificar) {
      try {
        servicos = await this.orcamentosService.precificarAutomaticamente(ctx.orcamentoId);
        ctx = { ...ctx, payload: { ...ctx.payload, precificadoIa: true } };
        this.context.set(chatId, ctx);
        await this.sender.enviarTexto(
          chatId,
          'Sugeri valores automaticamente com IA para agilizar. Revise e ajuste se precisar.',
        );
      } catch (error) {
        this.logger.warn(`Falha ao precificar automaticamente: ${error instanceof Error ? error.message : error}`);
        await this.sender.enviarTexto(
          chatId,
          'Não consegui sugerir preços automaticamente agora. Vamos informar manualmente.',
        );
      }
    }

    const proximoIndex = servicos.findIndex((servico) => (servico.preco ?? 0) <= 0);

    if (proximoIndex === -1) {
      const mensagem = await this.confirmacaoFlow.solicitarConfirmacao(chatId);
      await this.sender.enviarTexto(chatId, mensagem);
      return;
    }

    const servico = servicos[proximoIndex];
    this.context.set(chatId, {
      ...ctx,
      step: 'definir-precos',
      payload: { ...ctx.payload, precoIndex: proximoIndex },
    });

    await this.sender.enviarTexto(
      chatId,
      `Qual o valor para "${servico.titulo}" (quantidade ${servico.quantidade})? Responda somente com o número em reais.`,
    );
  }

  private async tratarDefinicaoPrecos(chatId: string, valorTexto: string) {
    const ctx = this.context.get(chatId)!;
    const indice = ctx.payload?.precoIndex ?? 0;

    const valor = parseFloat(valorTexto.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      await this.sender.enviarTexto(chatId, 'Informe um valor numérico maior que zero, por favor.');
      return;
    }

    const servicos = await this.orcamentosService.listarServicos(ctx.orcamentoId!);
    if (indice < 0 || indice >= servicos.length) {
      await this.sender.enviarTexto(chatId, 'Não consegui identificar o serviço. Vamos revisar.');
      await this.iniciarDefinicaoPrecos(chatId);
      return;
    }

    const atualizados = servicos.map((servico, idx) =>
      idx === indice ? { ...servico, preco: valor } : servico,
    );
    await this.orcamentosService.registrarServicos(ctx.orcamentoId!, atualizados);

    const proximoIndex = atualizados.findIndex((servico) => (servico.preco ?? 0) <= 0);
    if (proximoIndex === -1) {
      const mensagem = await this.confirmacaoFlow.solicitarConfirmacao(chatId);
      await this.sender.enviarTexto(chatId, mensagem);
      return;
    }

    const proximoServico = atualizados[proximoIndex];
    this.context.set(chatId, {
      ...ctx,
      step: 'definir-precos',
      payload: { ...ctx.payload, precoIndex: proximoIndex },
    });

    await this.sender.enviarTexto(
      chatId,
      `Anotei. Qual o valor para "${proximoServico.titulo}" (quantidade ${proximoServico.quantidade})?`,
    );
  }

  private async tratarConfirmacao(chatId: string, texto: string) {
    const comando = texto.trim().toLowerCase();

    if (comando === '2' || comando === 'confirmar') {
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

    if (comando === '1' || comando.startsWith('alterar')) {
      const ctx = this.context.get(chatId)!;
      this.context.set(chatId, { ...ctx, step: 'confirmacao-alterar-servico', payload: {} });
      await this.sender.enviarTexto(
        chatId,
        'Qual número do serviço deseja alterar? Envie apenas o número correspondente na lista.',
      );
      return;
    }

    const resumo = await this.confirmacaoFlow.solicitarConfirmacao(chatId);
    await this.sender.enviarTexto(chatId, `Não entendi. ${resumo}`);
  }

  private async tratarConfirmacaoSelecaoServico(chatId: string, texto: string) {
    const ctx = this.context.get(chatId)!;
    const indice = parseInt(texto.trim(), 10) - 1;

    if (Number.isNaN(indice)) {
      await this.sender.enviarTexto(chatId, 'Envie apenas o número do serviço que deseja alterar.');
      return;
    }

    const servicos = await this.orcamentosService.listarServicos(ctx.orcamentoId!);
    if (indice < 0 || indice >= servicos.length) {
      await this.sender.enviarTexto(chatId, 'Número inválido. Use o número exibido na lista de serviços.');
      return;
    }

    const servico = servicos[indice];
    this.context.set(chatId, {
      ...ctx,
      step: 'confirmacao-alterar-valor',
      payload: { ...ctx.payload, servicoIndex: indice },
    });

    await this.sender.enviarTexto(
      chatId,
      `Qual o novo valor para "${servico.titulo}" (quantidade ${servico.quantidade})? Responda apenas com o número em reais.`,
    );
  }

  private async tratarConfirmacaoValor(chatId: string, texto: string) {
    const ctx = this.context.get(chatId)!;
    const indice = ctx.payload?.servicoIndex;

    if (typeof indice !== 'number') {
      this.context.set(chatId, { ...ctx, step: 'confirmacao' });
      await this.sender.enviarTexto(chatId, 'Não consegui identificar o serviço. Vamos revisar o resumo.');
      const resumo = await this.confirmacaoFlow.solicitarConfirmacao(chatId);
      await this.sender.enviarTexto(chatId, resumo);
      return;
    }

    const valor = parseFloat(texto.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      await this.sender.enviarTexto(chatId, 'Informe um valor numérico maior que zero.');
      return;
    }

    const mensagem = await this.confirmacaoFlow.alterarValor(chatId, indice + 1, valor);
    await this.sender.enviarTexto(chatId, mensagem);

    this.context.set(chatId, { ...ctx, step: 'confirmacao', payload: {} });
    const resumo = await this.confirmacaoFlow.solicitarConfirmacao(chatId);
    await this.sender.enviarTexto(chatId, resumo);
  }

  async aplicarAjuste(chatId: string, fator: number) {
    const mensagem = await this.ajustePrecosFlow.aplicarAjuste(chatId, fator);
    await this.sender.enviarTexto(chatId, mensagem);
  }

  private async tratarCadastroNome(chatId: string, nome: string) {
    const ctx = this.context.get(chatId)!;
    this.context.set(chatId, {
      ...ctx,
      step: 'cadastro-email',
      payload: { ...ctx.payload, nome: nome.trim() },
    });

    await this.sender.enviarTexto(chatId, 'Ótimo! Agora, informe seu email.');
  }

  private async tratarCadastroEmail(chatId: string, email: string) {
    const ctx = this.context.get(chatId)!;
    const nome = ctx.payload?.nome ?? '';
    const telefone = ctx.payload?.telefone ?? this.normalizarTelefone(chatId);

    const cadastroMsg = await this.cadastroFlow.executar(chatId, {
      nome,
      telefone,
      email: email.trim(),
    });

    await this.sender.enviarTexto(chatId, `${cadastroMsg}\n${gerarMenuPrincipal()}`);
  }

  private normalizarTelefone(chatId: string) {
    return chatId.replace('@c.us', '');
  }

  private criarContextoBase(ctx: WhatsappContext) {
    return {
      chatId: ctx.chatId,
      profissionalId: ctx.profissionalId,
      step: 'menu',
      payload: undefined,
      orcamentoId: undefined,
    } as WhatsappContext;
  }
}
