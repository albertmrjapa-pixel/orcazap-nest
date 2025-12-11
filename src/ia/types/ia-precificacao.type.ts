export interface IaItemPrecificado {
  titulo: string;
  descricao?: string;
  quantidade?: number;
  precoMinimo: number;
  precoMaximo: number;
  precoSugerido: number;
  observacoes?: string;
  incluir?: boolean;
}
