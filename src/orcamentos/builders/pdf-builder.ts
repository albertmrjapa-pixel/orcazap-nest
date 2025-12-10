import { Orcamento, RespostasFixas, ServicoOrcamento, MaterialEstimado, Profissional } from '@prisma/client';
import { CalculadoraOrcamento } from '../utils/calculadora-orcamento';
import { formatarPreco } from '../../whatsapp/utils/formatters';

type OrcamentoCompleto = Orcamento & {
  servicos: ServicoOrcamento[];
  respostasFixas: RespostasFixas[];
  materiais: MaterialEstimado[];
  profissional: Profissional;
};

export class PdfBuilder {
  static montarHtml(orcamento: OrcamentoCompleto, resumoIa: string) {
    const total = CalculadoraOrcamento.calcularTotal(orcamento.servicos);
    const servicosHtml = orcamento.servicos
      .map(
        (s) => `
        <tr>
          <td>${s.titulo}</td>
          <td>${s.descricao ?? ''}</td>
          <td>${s.quantidade}</td>
          <td>${formatarPreco(s.preco)}</td>
        </tr>`,
      )
      .join('');

    const respostasHtml = orcamento.respostasFixas
      .map((r) => `<li><strong>${r.campo}:</strong> ${r.resposta}</li>`)
      .join('');

    const materiaisHtml = orcamento.materiais
      .map(
        (m) => `
        <tr>
          <td>${m.nome}</td>
          <td>${m.quantidade} ${m.unidade}</td>
          <td>${formatarPreco(m.precoMedio)}</td>
        </tr>`,
      )
      .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { color: #0b5ed7; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            td, th { border: 1px solid #ddd; padding: 8px; }
            .total { text-align: right; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Orçamento ${orcamento.codigo}</h1>
          <p><strong>Profissional:</strong> ${orcamento.profissional.nome}</p>
          ${orcamento.clienteNome ? `<p><strong>Cliente:</strong> ${orcamento.clienteNome}</p>` : ''}
          ${orcamento.profissional.logoUrl ? `<img src="${orcamento.profissional.logoUrl}" height="80"/>` : ''}
          <h2>Serviços</h2>
          <table>
            <thead><tr><th>Título</th><th>Descrição</th><th>Qtd</th><th>Preço</th></tr></thead>
            <tbody>${servicosHtml}</tbody>
          </table>
          <p class="total">Total: ${formatarPreco(total)}</p>
          <h2>Respostas fixas</h2>
          <ul>${respostasHtml}</ul>
          <h2>Materiais sugeridos (oculto ao cliente)</h2>
          <table>
            <thead><tr><th>Material</th><th>Quantidade</th><th>Preço médio</th></tr></thead>
            <tbody>${materiaisHtml}</tbody>
          </table>
          <h2>Resumo humanizado</h2>
          <p>${resumoIa}</p>
        </body>
      </html>
    `;
  }
}
