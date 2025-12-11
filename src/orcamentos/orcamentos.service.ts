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

    const sugestoes = await this.iaService.precificarPorRegiao(regiaoCliente, itens);

    const atualizados = servicos.map((servico, index) => {
      const iaItem = sugestoes[index];
      if (!iaItem) return servico;

      const precoSugerido = iaItem.precoSugerido ?? iaItem.precoMinimo ?? iaItem.precoMaximo;

      return {
        ...servico,
        titulo: iaItem.titulo?.trim() || servico.titulo,
        preco: precoSugerido ?? servico.preco,
        descricao: iaItem.descricao ?? servico.descricao,
        quantidade: iaItem.quantidade ?? servico.quantidade,
      };
    });

    await this.registrarServicos(orcamentoId, atualizados);
    return this.listarServicos(orcamentoId);
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
      include: { servicos: true, respostasFixas: true, profissional: true },
    });
    const texto = await this.iaService.resumirOrcamento(orcamento!);
    return texto;
  }

  async gerarPdf(orcamentoId: string) {
    const orcamento = await this.prisma.orcamento.findUnique({
      where: { id: orcamentoId },
      include: { servicos: true, respostasFixas: true, profissional: true, materiais: true },
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
