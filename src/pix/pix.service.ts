/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ProfissionalService } from '../profissional/profissional.service';
import * as fs from 'fs';
import * as https from 'https';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PixService {
  private baseUrl = 'https://cdpj.partners.bancointer.com.br/pix/v2';

  constructor(
    private prisma: PrismaService,
    private profissionalService: ProfissionalService,
    private eventEmitter: EventEmitter2,
  ) {}

  private httpsAgent = new https.Agent({
    cert: fs.readFileSync(process.env.INTER_CERT_PATH as string),
    key: fs.readFileSync(process.env.INTER_KEY_PATH as string),
    rejectUnauthorized: false,
  });

  private async gerarToken(scope = 'cob.write') {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.INTER_CLIENT_ID as string);
    params.append('client_secret', process.env.INTER_CLIENT_SECRET as string);
    params.append('scope', scope);

    const { data } = await axios.post(
      'https://cdpj.partners.bancointer.com.br/oauth/v2/token',
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: this.httpsAgent,
      },
    );

    return data.access_token as string;
  }

  async gerarCobranca(valor: number, profissionalId: string) {
    const body = {
      calendario: { expiracao: 3600 },
      valor: { original: valor.toFixed(2) },
      chave: process.env.INTER_PIX_CHAVE,
      solicitacaoPagador: 'Recarga de créditos',
    };

    const token = await this.gerarToken('cob.write');

    const { data } = await axios.post(`${this.baseUrl}/cob`, body, {
      httpsAgent: this.httpsAgent,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const txid = data.txid as string;
    const copiaCola = (data.pixCopiaECola || data.loc?.location || '') as string;

    await this.prisma.pagamento.create({
      data: {
        profissionalId,
        valor,
        txid,
        copiaCola,
        status: 'pending',
      },
    });

    return { txid, copiaCola };
  }

  async registrarWebhook(url: string) {
    const token = await this.gerarToken('cob.write');

    const chave = process.env.INTER_PIX_CHAVE;

    const body = { webhookUrl: url };

    const { data } = await axios.put(
      `${this.baseUrl}/webhook/${chave}`,
      body,
      {
        httpsAgent: this.httpsAgent,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return data;
  }

  async confirmarPagamento(txid: string) {
    const pagamento = await this.prisma.pagamento.findUnique({
      where: { txid },
      include: { profissional: true },
    });

    if (!pagamento || pagamento.status === 'paid') return null;

    await this.prisma.pagamento.update({
      where: { txid },
      data: { status: 'paid', pagoEm: new Date() },
    });

    const valor = Number(Number(pagamento.valor).toFixed(2));

    const tabelaCreditos: Record<number, number> = {
      19.9: 100,
      49.9: 500,
      79.9: 1000,
      99.9: 2000,
    };

    const creditos = tabelaCreditos[valor] ?? 0;

    if (creditos === 0) {
      console.warn('⚠ Pagamento com valor inesperado:', valor);
    }

    await this.profissionalService.adicionarSaldo(pagamento.profissionalId, creditos);

    this.eventEmitter.emit('pagamento.confirmado', {
      telefone: pagamento.profissional.telefone,
      creditos,
      valor,
    });

    return pagamento;
  }
}
