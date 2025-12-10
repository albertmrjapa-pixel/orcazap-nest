import { ServicoOrcamento } from '@prisma/client';

export class MateriaisBuilder {
  static gerarEstimativa(servicos: ServicoOrcamento[]) {
    return servicos.map((servico) => ({
      nome: `Materiais para ${servico.titulo}`,
      unidade: 'un',
      quantidade: Math.max(1, servico.quantidade),
      precoMedio: Math.max(50, servico.preco * 0.2),
    }));
  }
}
