import { Injectable } from '@nestjs/common';
import { IaService } from '../../ia/ia.service';
import { OrcamentosService } from '../../orcamentos/orcamentos.service';
import { WhatsappContextStore } from '../core/whatsapp.context';
import { WhatsappContext } from '../types/whatsapp-context.type';
import { detectarCategoriaPergunta, PerguntaCategoria } from '../../ia/prompts/perguntas-inteligentes/categorias';

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

      if (payload.ultimaPergunta) {
        await this.aplicarRespostasEspecificas(
          ctx.orcamentoId,
          servicoContexto?.titulo ?? 'Serviço geral',
          payload.ultimaPergunta,
          respostaAnterior,
        );
      }

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
      payload: { ...payload, historico, servicos, servicoAtual, finalizando: finalizado, ultimaPergunta: pergunta },
    };
    this.context.set(chatId, novoContexto);
    return { pergunta, finalizado: false };
  }

  private async aplicarRespostasEspecificas(
    orcamentoId: string,
    servicoTitulo: string,
    perguntaAnterior: string,
    resposta: string,
  ) {
    const categoria = detectarCategoriaPergunta(servicoTitulo);
    if (categoria !== PerguntaCategoria.CHURRASCO_EVENTOS) return;

    const perguntaLower = perguntaAnterior.toLowerCase();
    const respostaLower = resposta.toLowerCase();
    const servicosAtuais = await this.orcamentosService.listarServicos(orcamentoId);
    let houveAlteracao = false;

    const normalizar = (texto: string) =>
      texto
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

    const existeItem = (titulo: string) =>
      servicosAtuais.some((servico) => normalizar(servico.titulo) === normalizar(titulo));

    const adicionarItem = (titulo: string, descricao: string) => {
      if (existeItem(titulo)) return;
      houveAlteracao = true;
      servicosAtuais.push({
        id: undefined as any,
        orcamentoId,
        titulo,
        descricao,
        quantidade: 1,
        preco: 0,
      } as any);
    };

    if (perguntaLower.includes('bebida')) {
      const descricao = resposta.trim() || 'Bebidas fornecidas pelo profissional conforme preferência do cliente.';
      adicionarItem('Bebidas', descricao);
    }

    if (perguntaLower.includes('carvao') || perguntaLower.includes('carvão') || perguntaLower.includes('gelo') || perguntaLower.includes('descart')) {
      const precisaLevar = respostaLower.includes('profissional') || respostaLower.includes('levar') || respostaLower.includes('sim');
      if (precisaLevar) {
        const descricao = resposta.trim() || 'Fornecimento de carvão, gelo e descartáveis pelo profissional.';
        adicionarItem('Suprimentos (carvão, gelo e descartáveis)', descricao);
      }
    }

    if (houveAlteracao) {
      await this.orcamentosService.registrarServicos(
        orcamentoId,
        servicosAtuais.map((servico) => ({
          titulo: servico.titulo,
          descricao: servico.descricao ?? undefined,
          quantidade: servico.quantidade ?? 1,
          preco: servico.preco ?? 0,
        })),
      );
    }
  }
}
