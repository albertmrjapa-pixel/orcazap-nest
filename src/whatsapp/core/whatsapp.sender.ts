import { Injectable } from '@nestjs/common';
import { WhatsappClient } from './whatsapp.client';

@Injectable()
export class WhatsappSender {
  constructor(private readonly client: WhatsappClient) {}

  async enviarTexto(chatId: string, texto: string) {
    await this.client.sendText(chatId, texto);
  }

  async enviarPdf(chatId: string, base64: string, filename: string) {
    await this.client.sendPdf(chatId, base64, filename);
  }

  async enviarAudio(
    chatId: string,
    base64: string,
    mimeType?: string,
    filename?: string,
    enviarComoVoz?: boolean,
  ) {
    await this.client.sendAudio(chatId, base64, mimeType, filename, enviarComoVoz);
  }
}
