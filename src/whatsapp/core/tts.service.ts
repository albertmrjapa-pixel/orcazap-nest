import { Injectable, Logger } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type TtsResult = {
  base64: string;
  mimeType: string;
  filename: string;
  filePath: string;
};

@Injectable()
export class TtsService {
  private readonly logger = new Logger('TtsService');
  private readonly ttsDir = join(process.cwd(), 'tts_output');
  private readonly client: TextToSpeechClient;

  constructor() {
    if (!existsSync(this.ttsDir)) {
      mkdirSync(this.ttsDir, { recursive: true });
    }

    const keyPath = join(process.cwd(), 'orcazap-tts-61ef47dd242f.json');

    this.client = new TextToSpeechClient({
      keyFilename: keyPath,
    });

    this.logger.log('🔑 Google TTS carregado com credenciais JSON.');
  }

  async gerarAudio(texto: string, nomeArquivo: string): Promise<TtsResult> {
    try {
      this.logger.log('🎤 Enviando texto para Google Cloud TTS...');

      const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text: texto },
        voice: {
          languageCode: 'pt-BR',
          name: 'pt-BR-Neural2-B',
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          speakingRate: 1.01,
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('Resposta veio sem áudio!');
      }

      const wavPath = join(this.ttsDir, `${nomeArquivo}.wav`);
      const mp3Path = join(this.ttsDir, `${nomeArquivo}.mp3`);

      writeFileSync(wavPath, response.audioContent as Buffer, 'binary');

      await execAsync(`ffmpeg -y -i "${wavPath}" -acodec libmp3lame "${mp3Path}"`);

      unlinkSync(wavPath);

      const base64 = readFileSync(mp3Path).toString('base64');
      const resultado: TtsResult = {
        base64,
        mimeType: 'audio/mpeg',
        filename: `${nomeArquivo}.mp3`,
        filePath: mp3Path,
      };

      this.logger.log(`🎧 MP3 gerado com sucesso: ${mp3Path}`);
      return resultado;
    } catch (error) {
      this.logger.error('Erro ao gerar áudio:', error as Error);
      throw error;
    }
  }
}
