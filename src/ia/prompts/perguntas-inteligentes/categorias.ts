export enum PerguntaCategoria {
  CHURRASCO_EVENTOS = 'churrasco-eventos',
  PINTURA = 'pintura',
  LIMPEZA = 'limpeza',
}

export const categoriaPrompts: Record<PerguntaCategoria, string> = {
  [PerguntaCategoria.CHURRASCO_EVENTOS]: `— CHURRASCO / EVENTOS —
Pergunte por etapas, mas somente se faltar:
1) Quantidade de pessoas (se não estiver).
2) Cidade + Estado.
3) Local: casa, salão, sítio (e bairro).
4) Duração do evento em horas.
5) O cliente fornece carnes?
6) Se o profissional leva carnes → quais cortes?
7) Quantidade aproximada (kg, kg por pessoa).
8) Acompanhamentos.
9) Bebidas inclusas?
10) Cliente fornece carvão, gelo e descartáveis?
11) Necessita churrasqueira?
12) Necessita ajudante?
13) O profissional apenas assa ou também serve?`,
  [PerguntaCategoria.PINTURA]: `— PINTURA —
Pergunte se faltar:
1) Cidade + Estado.
2) Tipo do serviço (interna, externa, teto).
3) Área em m².
4) Altura das paredes.
5) Necessita massa corrida?
6) Quantos cômodos?
7) Estado atual (descascando, mofo etc.).
8) Cliente fornece tinta?
9) Se o profissional levar tinta → qual cor e acabamento?`,
  [PerguntaCategoria.LIMPEZA]: `— LIMPEZA —
Pergunte se faltar:
1) Cidade + Estado.
2) Tipo de limpeza (residencial, pós-obra, pesada).
3) Tamanho em m².
4) Quantidade de cômodos.
5) Imóvel com móveis?
6) Cliente fornece produtos?
7) Se o profissional levar → quais produtos?`,
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
