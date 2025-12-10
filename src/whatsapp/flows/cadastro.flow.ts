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
    const telefone = this.normalizarTelefone(dados.telefone);
    const existente = await this.profissionalService.obterPorTelefone(telefone);

    const profissional = await this.profissionalService.criarOuAtualizar(
      {
        id: existente?.id,
        nome: dados.nome,
        telefone,
        email: dados.email ?? existente?.email,
      },
      existente ? undefined : { saldoInicial: 1000 },
    );

    const ctx: WhatsappContext = { profissionalId: profissional.id, chatId, step: 'menu' };
    this.context.set(chatId, ctx);

    const bonusMsg = existente ? '' : ' Você recebeu 1000 créditos para seu primeiro orçamento!';
    return `Cadastro concluído! Bem-vindo, ${profissional.nome}.${bonusMsg}`;
  }

  private normalizarTelefone(telefone: string) {
    return telefone.replace('@c.us', '');
  }
}
