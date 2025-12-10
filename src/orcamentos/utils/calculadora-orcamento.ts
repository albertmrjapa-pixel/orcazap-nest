import { ServicoOrcamento } from '@prisma/client';

export class CalculadoraOrcamento {
  static calcularTotal(servicos: ServicoOrcamento[]) {
    return servicos.reduce((acc, servico) => acc + servico.preco * servico.quantidade, 0);
  }
}
