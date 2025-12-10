export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarPrazo(dias: number): string {
  return `${dias} dia${dias > 1 ? 's' : ''}`;
}
