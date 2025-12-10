import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IaPrompt, IaModels } from './types/ia-types';
import { IA_ERRORS } from './types/ia-errors';

@Injectable()
export class IaService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
    this.model = IaModels.GPT4O;
  }

  async perguntar(prompt: IaPrompt, contexto: string[]): Promise<string> {
    const mensagens = [
      { role: 'system' as const, content: prompt.system },
      ...contexto.map((c) => ({ role: 'user' as const, content: c })),
    ];
    const resposta = await this.client.chat.completions.create({
      model: this.model,
      messages: mensagens,
      max_tokens: 200,
    });
    const output = resposta.choices[0]?.message?.content;
    if (!output) throw new Error(IA_ERRORS.RESPOSTA_VAZIA);
    return output;
  }

  async gerarPerguntaInteligente(categoria: string, historico: string[]) {
    const prompt: IaPrompt = {
      system:
        'Você é um assistente que coleta informações de orçamento. Faça apenas uma pergunta objetiva de cada vez.',
    };
    return this.perguntar(prompt, [`Categoria: ${categoria}`, ...historico]);
  }

  async separarServicos(descricao: string) {
    const prompt: IaPrompt = {
      system:
        'Identifique serviços separados na descrição e devolva uma lista em linhas contendo titulo e breve descrição.',
    };
    const texto = await this.perguntar(prompt, [descricao]);
    return texto.split('\n').filter(Boolean).map((linha) => {
      const [titulo, ...resto] = linha.split('-');
      return { titulo: titulo.trim(), descricao: resto.join('-').trim() };
    });
  }

  async resumirOrcamento(orcamento: any) {
    const prompt: IaPrompt = {
      system:
        'Crie um resumo humanizado do orçamento, destacando valor, prazo e próximos passos de forma cordial.',
    };
    const contexto = [
      `Profissional: ${orcamento.profissional.nome}`,
      `Serviços: ${orcamento.servicos.map((s: any) => `${s.titulo} (${s.preco})`).join(', ')}`,
      `Respostas fixas: ${orcamento.respostasFixas.map((r: any) => `${r.campo}: ${r.resposta}`).join('; ')}`,
    ];
    return this.perguntar(prompt, contexto);
  }

  async suporte(pergunta: string, historico: string[] = []) {
    const prompt: IaPrompt = {
      system:
        'Atue como suporte técnico do OrçaZap. Responda de forma breve e útil sem inventar funcionalidades.',
    };
    return this.perguntar(prompt, [...historico, pergunta]);
  }
}
