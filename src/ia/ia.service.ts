import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { perguntasBasePrompt } from './prompts/perguntas-inteligentes/base.prompt';
import { categoriaPrompts, detectarCategoriaPergunta } from './prompts/perguntas-inteligentes/categorias';
import { precificacaoPorRegiaoPrompt } from './prompts/precificacao-por-regiao.prompt';
import { IaItemPrecificado } from './types/ia-precificacao.type';
import { IA_ERRORS } from './types/ia-errors';
import { IaPrompt, IaModels } from './types/ia-types';

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
      max_tokens: 500,
      temperature: 0.2,
    });
    const output = resposta.choices[0]?.message?.content;
    if (!output) throw new Error(IA_ERRORS.RESPOSTA_VAZIA);
    return output.trim();
  }

  async gerarPerguntaInteligente(
    categoria: string,
    historico: string[],
  ): Promise<{ pergunta: string; finalizado: boolean }> {
    const categoriaDetectada = detectarCategoriaPergunta(categoria);
    const prompt: IaPrompt = {
      system: [perguntasBasePrompt, categoriaDetectada ? categoriaPrompts[categoriaDetectada] : '']
        .filter(Boolean)
        .join('\n\n'),
    };

    const resposta = await this.perguntar(prompt, [`Categoria: ${categoria}`, ...historico]);

    try {
      const parsed = this.parsePerguntaJson(resposta);
      return { pergunta: parsed.pergunta, finalizado: parsed.finalizado };
    } catch (error) {
      throw new Error(IA_ERRORS.FORMATO_INVALIDO);
    }
  }

  private parsePerguntaJson(resposta: string): { pergunta: string; finalizado: boolean } {
    const limpar = resposta
      .replace(/^```json\s*/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    const trechoJson = this.extrairPrimeiroObjetoJson(limpar);
    const parsed = JSON.parse(trechoJson) as { pergunta?: string; finalizado?: boolean };

    if (!parsed.pergunta || typeof parsed.finalizado !== 'boolean') {
      throw new Error(IA_ERRORS.FORMATO_INVALIDO);
    }

    return { pergunta: parsed.pergunta, finalizado: parsed.finalizado };
  }

  private extrairPrimeiroObjetoJson(texto: string): string {
    const match = texto.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return texto;
  }

  async separarServicos(descricao: string) {
    const prompt: IaPrompt = {
      system:
        'Identifique apenas os serviços explicitamente solicitados na descrição e devolva uma lista em linhas contendo título e breve descrição. Não invente novos serviços, não inclua planejamento genérico e mantenha apenas o que o cliente pediu. Se houver um único serviço, devolva só uma linha.',
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

  async precificarPorRegiao(
    regiao: string,
    itens: { titulo: string; descricao?: string; quantidade?: number }[],
  ): Promise<IaItemPrecificado[]> {
    const prompt: IaPrompt = { system: precificacaoPorRegiaoPrompt };
    const resposta = await this.perguntar(prompt, [
      `Região do cliente: ${regiao}`,
      `Itens do orçamento: ${JSON.stringify(itens)}`,
    ]);

    try {
      const itensPrecificados = JSON.parse(resposta) as IaItemPrecificado[];
      if (!Array.isArray(itensPrecificados)) throw new Error(IA_ERRORS.FORMATO_INVALIDO);
      return itensPrecificados;
    } catch {
      throw new Error(IA_ERRORS.FORMATO_INVALIDO);
    }
  }

  async suporte(pergunta: string, historico: string[] = []) {
    const prompt: IaPrompt = {
      system:
        'Atue como suporte técnico do OrçaZap. Responda de forma breve e útil sem inventar funcionalidades.',
    };
    return this.perguntar(prompt, [...historico, pergunta]);
  }
}
