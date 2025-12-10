import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async gerarPdfBase64(html: string): Promise<string> {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = await page.pdf({ format: 'A4', printBackground: true });
      return buffer.toString('base64');
    } catch (error) {
      this.logger.error('Erro ao gerar PDF', error as Error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
