import { Injectable, Logger } from '@nestjs/common';
import textToSpeech from '@google-cloud/text-to-speech';

@Injectable()
export class AudioPlayer {
  private readonly client = new textToSpeech.TextToSpeechClient();
  private readonly logger = new Logger(AudioPlayer.name);

  async sintetizar(texto: string): Promise<string | null> {
    try {
      const [response] = await this.client.synthesizeSpeech({
        input: { text: texto },
        voice: { languageCode: 'pt-BR', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'OGG_OPUS' },
      });
      return response.audioContent ? response.audioContent.toString('base64') : null;
    } catch (error) {
      this.logger.error('Erro ao sintetizar áudio', error as Error);
      return null;
    }
  }
}
