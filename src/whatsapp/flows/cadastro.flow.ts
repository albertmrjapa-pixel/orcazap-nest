import { Injectable } from '@nestjs/common';
import { ProfissionalService } from '../../profissional/profissional.service';
import { WhatsappContextStore } from '../core/whatsapp.context';
import { WhatsappContext } from '../types/whatsapp-context.type';

@Injectable()
export class CadastroFlow {
  constructor(
    private readonly profissionalService: ProfissionalService,
    private readonly context: WhatsappContextStore,
  ) {}

  async executar(chatId: string, dados: { nome: string; telefone: string; email?: string }) {
    const profissional = await this.profissionalService.criarOuAtualizar({
      nome: dados.nome,
      telefone: dados.telefone,
      email: dados.email,
    });
    const ctx: WhatsappContext = { profissionalId: profissional.id, chatId, step: 'menu' };
    this.context.set(chatId, ctx);
    return `Cadastro concluído! Bem-vindo, ${profissional.nome}.`;
  }
}
