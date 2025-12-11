/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */

import { Controller, Post, Body } from '@nestjs/common';
import { PixService } from './pix.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Controller('pix')
export class PixController {
  constructor(
    private pixService: PixService,
    private whatsappService: WhatsappService, // ✔ agora aqui, sem circular
  ) {}

  // ==========================================================
  // WEBHOOK DO PIX — CHAMADO PELO BANCO INTER
  // ==========================================================
  @Post('webhook')
  async webhook(@Body() body: any) {
    try {
      console.log('📩 Webhook PIX recebido:', JSON.stringify(body, null, 2));

      // Webhook do Inter envia:
      // body.pix = [{ txid, valor, ... }]
      const txid = body?.pix?.[0]?.txid;

      if (!txid) {
        console.warn('⚠ Webhook recebido sem TXID');
        return { received: true };
      }

      // Confirmar pagamento no PixService
      const pagamento = await this.pixService.confirmarPagamento(txid);

      if (pagamento) {
        console.log('💰 Pagamento confirmado!', pagamento);

        // Enviar mensagem pelo WhatsApp
        await this.whatsappService.enviarMensagem(
          pagamento.profissional.telefone,
          `🎉 *Pagamento PIX Recebido!*\n\nSeu crédito foi liberado com sucesso!`,
        );
      } else {
        console.log('⚠ Pagamento já processado ou inexistente.');
      }

      return { received: true };

    } catch (e) {
      console.error('❌ Erro no webhook PIX:', e);
      return { received: false };
    }
  }

  // ==========================================================
  // REGISTRAR WEBHOOK NO BANCO INTER
  // ==========================================================
  @Post('registrar-webhook')
  async registrarWebhook(@Body('url') url: string) {
    return this.pixService.registrarWebhook(url);
  }
}
