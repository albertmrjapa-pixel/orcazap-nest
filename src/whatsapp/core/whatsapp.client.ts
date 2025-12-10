import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappClient {
  private readonly logger = new Logger(WhatsappClient.name);
  private client: Client;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'orcazap' }),
    });
    this.registerEvents();
    this.client.initialize();
  }

  private registerEvents() {
    this.client.on('qr', (qr) => {
      this.logger.log('QR Code gerado para autenticação');
      qrcode.generate(qr, { small: true });
    });
    this.client.on('ready', () => this.logger.log('Cliente WhatsApp conectado'));
  }

  async sendText(chatId: string, message: string) {
    await this.client.sendMessage(chatId, message);
  }

  async sendPdf(chatId: string, base64: string, filename: string) {
    const media = new MessageMedia('application/pdf', base64, filename);
    await this.client.sendMessage(chatId, media);
  }

  async sendAudio(chatId: string, base64Audio: string) {
    const media = new MessageMedia('audio/ogg; codecs=opus', base64Audio, 'audio.ogg');
    await this.client.sendMessage(chatId, media, { sendAudioAsVoice: true });
  }

  onMessage(callback: (msg: any) => void) {
    this.client.on('message', callback);
  }
}
