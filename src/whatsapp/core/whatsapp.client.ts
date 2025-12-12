import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappClient {
  private readonly logger = new Logger(WhatsappClient.name);
  private client: Client | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly clientId = 'orcazap';
  private readonly dataPath =
    process.env.WHATSAPP_AUTH_PATH || join(process.cwd(), 'storage', 'whatsapp-auth');

  constructor() {
    const sessionPath = join(this.dataPath, `session-${this.clientId}`);

    if (!existsSync(this.dataPath)) {
      mkdirSync(this.dataPath, { recursive: true });
    }

    if (existsSync(sessionPath)) {
      this.logger.log('Reutilizando sessão existente do WhatsApp.');
    } else {
      this.logger.log('Nenhuma sessão local encontrada, será necessário escanear o QR Code.');
    }

    this.createClient();
  }

  private createClient() {
    if (this.client) {
      this.logger.log('Finalizando instância anterior do cliente WhatsApp.');
      this.client.destroy();
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: this.clientId, dataPath: this.dataPath }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    });

    this.client = client;
    this.registerEvents(client);
    this.initPromise = client.initialize().catch((err) => {
      this.logger.error('Erro ao inicializar o cliente WhatsApp.', err);
      throw err;
    });
  }

  private registerEvents(client: Client) {
    client.on('qr', (qr) => {
      this.logger.log('QR Code gerado para autenticação');
      qrcode.generate(qr, { small: true });
    });
    client.on('ready', () => this.logger.log('Cliente WhatsApp conectado'));
    client.on('authenticated', () =>
      this.logger.log('Sessão do WhatsApp autenticada e salva localmente.'),
    );
    client.on('auth_failure', () => {
      this.logger.warn(
        'Falha de autenticação. Limpando sessão e recriando cliente para forçar novo QR Code.',
      );
      this.limparSessao();
      this.createClient();
    });
    client.on('disconnected', (reason) => {
      this.logger.warn(`Cliente desconectado (${reason}). Tentando reconectar com sessão salva.`);
      this.createClient();
    });
  }

  private limparSessao() {
    const sessionFolder = join(this.dataPath, `session-${this.clientId}`);
    if (existsSync(sessionFolder)) {
      rmSync(sessionFolder, { recursive: true, force: true });
      this.logger.log(`Sessão removida em ${sessionFolder}`);
    }
  }

  private async ensureInitialized() {
    if (!this.initPromise) {
      this.createClient();
    }

    try {
      await this.initPromise;
    } catch (err) {
      this.logger.warn('Inicialização do cliente falhou, recriando instância.', err as Error);
      this.createClient();
      await this.initPromise;
    }
  }

  async sendText(chatId: string, message: string) {
    await this.ensureInitialized();
    await this.client?.sendMessage(chatId, message);
  }

  async sendPdf(chatId: string, base64: string, filename: string) {
    await this.ensureInitialized();
    const media = new MessageMedia('application/pdf', base64, filename);
    await this.client?.sendMessage(chatId, media);
  }

  async sendAudio(
    chatId: string,
    base64Audio: string,
    mimeType = 'audio/ogg; codecs=opus',
    filename = 'audio.ogg',
    sendAsVoice = true,
  ) {
    await this.ensureInitialized();
    const media = new MessageMedia(mimeType, base64Audio, filename);
    const options = sendAsVoice ? { sendAudioAsVoice: true } : undefined;
    await this.client?.sendMessage(chatId, media, options);
  }

  onMessage(callback: (msg: any) => void) {
    this.client?.on('message', callback);
  }
}
