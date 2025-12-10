import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappClient {
  private readonly logger = new Logger(WhatsappClient.name);
  private client: Client;

  constructor() {
    const clientId = 'orcazap';
    const dataPath = join(process.cwd(), '.wwebjs_auth');
    const sessionPath = join(dataPath, `session-${clientId}`);

    if (!existsSync(dataPath)) {
      mkdirSync(dataPath, { recursive: true });
    }

    if (existsSync(sessionPath)) {
      this.logger.log('Reutilizando sessão existente do WhatsApp.');
    } else {
      this.logger.log('Nenhuma sessão local encontrada, será necessário escanear o QR Code.');
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ clientId, dataPath }),
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

  async sendAudio(
    chatId: string,
    base64Audio: string,
    mimeType = 'audio/ogg; codecs=opus',
    filename = 'audio.ogg',
    sendAsVoice = true,
  ) {
    const media = new MessageMedia(mimeType, base64Audio, filename);
    const options = sendAsVoice ? { sendAudioAsVoice: true } : undefined;
    await this.client.sendMessage(chatId, media, options);
  }

  onMessage(callback: (msg: any) => void) {
    this.client.on('message', callback);
  }
}
