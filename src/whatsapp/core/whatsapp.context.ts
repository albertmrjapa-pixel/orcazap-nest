import { Injectable } from '@nestjs/common';
import { WhatsappContext } from '../types/whatsapp-context.type';

@Injectable()
export class WhatsappContextStore {
  private readonly contexts = new Map<string, WhatsappContext>();

  get(chatId: string): WhatsappContext | undefined {
    return this.contexts.get(chatId);
  }

  set(chatId: string, context: WhatsappContext) {
    this.contexts.set(chatId, context);
  }

  clear(chatId: string) {
    this.contexts.delete(chatId);
  }
}
