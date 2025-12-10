export interface ColetaResposta {
  pergunta: string;
  resposta: string;
}

export interface ColetaResultado {
  clienteNome: string;
  clienteTelefone: string;
  servicos: { titulo: string; descricao?: string }[];
}
