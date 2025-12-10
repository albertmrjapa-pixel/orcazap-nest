export interface WhatsappContext {
  profissionalId: string;
  chatId: string;
  step: string;
  orcamentoId?: string;
  payload?: Record<string, any>;
}
