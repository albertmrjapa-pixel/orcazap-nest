import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { IaService } from '../ia/ia.service';
import { CalculadoraOrcamento } from './utils/calculadora-orcamento';
import { MateriaisBuilder } from './builders/materiais-builder';
import { PdfBuilder } from './builders/pdf-builder';

@Injectable()
export class OrcamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly iaService: IaService,
  ) {}

  async criar(profissionalId: string) {
    return this.prisma.orcamento.create({
      data: { profissionalId },
    });
  }

  async registrarResposta(orcamentoId: string, pergunta: string, resposta: string) {
    return this.prisma.perguntaRespondida.create({
      data: { orcamentoId, pergunta, resposta },
    });
  }

  async registrarRespostaFixa(orcamentoId: string, campo: string, resposta: string) {
    return this.prisma.respostasFixas.create({
      data: { orcamentoId, campo, resposta },
    });
  }

  async obterDadosBasicos(orcamentoId: string) {
    return this.prisma.orcamento.findUnique({
      where: { id: orcamentoId },
      include: { respostasFixas: true, respostas: true },
    });
  }

  async atualizarDadosCliente(orcamentoId: string, nome?: string, telefone?: string) {
    return this.prisma.orcamento.update({
      where: { id: orcamentoId },
      data: {
        ...(nome ? { clienteNome: nome } : {}),
        ...(telefone ? { clienteTelefone: telefone } : {}),
      },
    });
  }

  async registrarServicos(
    orcamentoId: string,
    servicos: { titulo: string; descricao?: string; quantidade?: number; preco?: number }[],
  ) {
    await this.prisma.servicoOrcamento.deleteMany({ where: { orcamentoId } });
    for (const servico of servicos) {
      await this.prisma.servicoOrcamento.create({
        data: {
          orcamentoId,
          titulo: servico.titulo,
          descricao: servico.descricao,
          quantidade: servico.quantidade ?? 1,
          preco: servico.preco ?? 0,
        },
      });
    }
  }

  async listarServicos(orcamentoId: string) {
    return this.prisma.servicoOrcamento.findMany({ where: { orcamentoId } });
  }

  async precificarAutomaticamente(orcamentoId: string, regiao?: string) {
    const servicos = await this.listarServicos(orcamentoId);
    if (!servicos.length) return [];

    const regiaoCliente = regiao?.trim() || 'Brasil';
    const itens = servicos.map((servico) => ({
      titulo: servico.titulo,
      descricao: servico.descricao ?? undefined,
      quantidade: servico.quantidade ?? 1,
    }));

    const contextoIa = await this.montarContextoIa(orcamentoId);
    const sugestoes = await this.iaService.precificarPorRegiao(regiaoCliente, itens, contextoIa);

    const sugestaoMap = new Map<string, (typeof sugestoes)[number]>(
      sugestoes.map((s) => [s.titulo.toLowerCase(), s]),
    );

    const atualizados = servicos
      .map((servico, index) => {
        const iaItem = sugestaoMap.get(servico.titulo.toLowerCase()) ?? sugestoes[index];
        if (!iaItem) return servico;

        if (iaItem.incluir === false) return null;

        const precoSugerido = iaItem.precoSugerido ?? iaItem.precoMinimo ?? iaItem.precoMaximo;
        const quantidadeAjustada = iaItem.quantidade ?? servico.quantidade ?? 1;

        return {
          ...servico,
          titulo: servico.titulo,
          preco: precoSugerido ?? servico.preco,
          descricao: iaItem.descricao ?? servico.descricao,
          quantidade: quantidadeAjustada,
        };
      })
      .filter((servico): servico is typeof servicos[number] => Boolean(servico));

    await this.registrarServicos(orcamentoId, atualizados);
    return this.listarServicos(orcamentoId);
  }

  private async montarContextoIa(orcamentoId: string) {
    const orcamento = await this.prisma.orcamento.findUnique({
      where: { id: orcamentoId },
      include: { respostas: true, respostasFixas: true, servicos: true },
    });

    if (!orcamento) return [];

    const respostasContexto = orcamento.respostas
      .map((r) => `Pergunta: ${r.pergunta} | Resposta: ${r.resposta}`)
      .join(' || ');
    const respostasFixasContexto = orcamento.respostasFixas
      .map((r) => `${r.campo}: ${r.resposta}`)
      .join(' | ');
    const servicosContexto = orcamento.servicos
      .map(
        (s) => `${s.titulo}${s.descricao ? ` - ${s.descricao}` : ''} (quantidade: ${s.quantidade}, preco: ${s.preco})`,
      )
      .join(' | ');

    return [
      servicosContexto ? `Serviços atuais: ${servicosContexto}` : '',
      respostasContexto ? `Respostas do profissional: ${respostasContexto}` : '',
      respostasFixasContexto ? `Respostas fixas: ${respostasFixasContexto}` : '',
    ].filter(Boolean);
  }

  async estimarMateriais(orcamentoId: string) {
    const servicos = await this.prisma.servicoOrcamento.findMany({ where: { orcamentoId } });
    const materiais = MateriaisBuilder.gerarEstimativa(servicos);
    await this.prisma.materialEstimado.deleteMany({ where: { orcamentoId } });
    for (const item of materiais) {
      await this.prisma.materialEstimado.create({ data: { orcamentoId, ...item } });
    }
    return materiais;
  }

  async gerarResumoIa(orcamentoId: string) {
    const orcamento = await this.prisma.orcamento.findUnique({
      where: { id: orcamentoId },
      include: { servicos: true, respostasFixas: true, respostas: true, profissional: true },
    });
    const texto = await this.iaService.resumirOrcamento(orcamento!);
    return texto;
  }

  async gerarPdf(orcamentoId: string) {
    const orcamento = await this.prisma.orcamento.findUnique({
      where: { id: orcamentoId },
      include: { servicos: true, respostasFixas: true, respostas: true, profissional: true, materiais: true },
    });
    const resumo = await this.gerarResumoIa(orcamentoId);
    const html = PdfBuilder.montarHtml(orcamento!, resumo);
    return this.pdfService.gerarPdfBase64(html);
  }

  async calcularTotal(orcamentoId: string) {
    const servicos = await this.prisma.servicoOrcamento.findMany({ where: { orcamentoId } });
    return CalculadoraOrcamento.calcularTotal(servicos);
  }
}
