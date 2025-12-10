import { Injectable } from '@nestjs/common';
import { ProfissionalService } from '../../profissional/profissional.service';
import { WhatsappContextStore } from '../core/whatsapp.context';

@Injectable()
export class MeuPerfilFlow {
  constructor(
    private readonly profissionalService: ProfissionalService,
    private readonly context: WhatsappContextStore,
  ) {}

  async exibir(chatId: string) {
    const ctx = this.context.get(chatId);
    if (!ctx?.profissionalId) throw new Error('Profissional não identificado');
    const profissional = await this.profissionalService.obter(ctx.profissionalId);
    return `Perfil:\nNome: ${profissional?.nome}\nTelefone: ${profissional?.telefone}\nSaldo: ${profissional?.saldo}`;
  }
}
