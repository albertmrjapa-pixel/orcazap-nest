export enum PerguntaCategoria {
  CHURRASCO_EVENTOS = 'churrasco-eventos',
  PINTURA = 'pintura',
  LIMPEZA = 'limpeza',
}

export const categoriaPrompts: Record<PerguntaCategoria, string> = {
  [PerguntaCategoria.CHURRASCO_EVENTOS]: `— CHURRASCO / EVENTOS —
Siga a sequência somente quando faltar a informação:
1) Quantidade de pessoas confirmadas.
2) Cidade e estado + tipo de local (casa, salão, sítio) e bairro.
3) Duração prevista do evento.
4) Cliente fornece carnes ou o profissional leva? Quais cortes preferidos (apenas o nome dos cortes).
5) Acompanhamentos desejados.
6) Bebidas inclusas? Se sim, quais tipos.
7) Cliente fornece carvão, gelo e descartáveis?
8) Precisa levar churrasqueira ou estrutura de apoio?
9) Precisa de ajudante ou equipe de apoio?
10) O profissional apenas assa ou também serve na área do evento?
Nunca peça quantidades derivadas (kg, gelo, carvão ou bebida por pessoa).`,
  [PerguntaCategoria.PINTURA]: `— PINTURA —
Pergunte apenas o que faltar:
1) Cidade e estado.
2) Tipo do serviço (interno, externo, teto).
3) Área em m² e quantidade de cômodos.
4) Altura média das paredes.
5) Estado atual (descascando, mofo, infiltração).
6) Necessita massa corrida ou preparação especial?
7) Cliente fornece tinta? Se o profissional levar, perguntar cor e acabamento.
Nunca peça litros de tinta ou massa corrida; a IA calcula.`,
  [PerguntaCategoria.LIMPEZA]: `— LIMPEZA —
Pergunte se ainda não foi informado:
1) Cidade e estado.
2) Tipo de limpeza (residencial, pós-obra, pesada).
3) Tamanho em m² e quantidade de cômodos.
4) O imóvel está mobiliado?
5) Condições atuais (muito sujo, pó de obra, manchas específicas).
6) Cliente fornece produtos ou o profissional leva? Se levar, quais preferências de produto.
Não pergunte consumo de produtos ou horas de serviço; calcule automaticamente.`,
};

export function detectarCategoriaPergunta(descricaoCategoria: string): PerguntaCategoria | null {
  const normalizado = descricaoCategoria
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (normalizado.match(/churrasc|evento|festa/)) return PerguntaCategoria.CHURRASCO_EVENTOS;
  if (normalizado.match(/pintur|pintor/)) return PerguntaCategoria.PINTURA;
  if (normalizado.match(/limpez|faxin|pos[- ]obra/)) return PerguntaCategoria.LIMPEZA;

  return null;
}
