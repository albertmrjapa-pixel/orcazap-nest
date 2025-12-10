import { Injectable, Logger } from '@nestjs/common';
import { WhatsappClient } from './core/whatsapp.client';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class WhatsappGateway {
  private readonly logger = new Logger(WhatsappGateway.name);

  constructor(private readonly client: WhatsappClient, private readonly service: WhatsappService) {
    this.client.onMessage((message) => this.handleMessage(message));
  }

  private async handleMessage(message: any) {
    try {
      await this.service.processarMensagem(message.from, message.body);
    } catch (error) {
      this.logger.error('Erro ao processar mensagem', error as Error);
    }
  }
}
