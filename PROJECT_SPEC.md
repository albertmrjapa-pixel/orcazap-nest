🚀 1. OBJETIVO DO PROJETO

Criar um sistema completo chamado OrçaZap 3.0, capaz de gerar orçamentos inteligentes via WhatsApp, utilizando:

IA (OpenAI) para perguntas inteligentes

Fluxos dinâmicos que fazem uma pergunta por vez

Cobrança de créditos por pergunta da IA

Perguntas fixas no final

Separação automática de múltiplos serviços

Estimativa automática de materiais (não exibida ao profissional)

Geração de PDF profissional

Sistema de Perfil

Sistema de Pagamentos PIX

Suporte via IA

Histórico de orçamentos e conversas

Treinamento de IA por categoria

O projeto deve ser criado do zero, seguindo todas as regras deste documento.

🧱 2. STACK OBRIGATÓRIA
Backend

Node.js 20+

NestJS 10

@nestjs/common

@nestjs/core

@nestjs/platform-express

@nestjs/config

ORM

Prisma

prisma

@prisma/client

Banco obrigatório: PostgreSQL

WhatsApp

Biblioteca: whatsapp-web.js

QR opcional: qrcode-terminal

IA (Texto)

Biblioteca: openai

Modelo padrão: gpt-4.1 ou gpt-4o

IA (Áudio)

Biblioteca: @google-cloud/text-to-speech

Áudios opcionais enviados ao WhatsApp

PDF

Biblioteca: puppeteer

O PDF deve ser gerado a partir de HTML.

Outras libs essenciais

class-validator

class-transformer

axios

🌱 3. ESTRUTURA COMPLETA DO PROJETO

O Codegen deve gerar exatamente a seguinte estrutura:

src/
├── main.ts
├── app.module.ts

├── whatsapp/
│   ├── whatsapp.module.ts
│   ├── whatsapp.service.ts
│   ├── whatsapp.gateway.ts
│   ├── core/
│   │   ├── whatsapp.client.ts
│   │   ├── whatsapp.sender.ts
│   │   ├── whatsapp.context.ts
│   │   ├── audio-player.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── menu.ts
│   │   ├── formatters.ts
│   ├── types/
│   │   ├── whatsapp-context.type.ts
│   │   ├── ia-intents.type.ts
│   │   ├── coleta.types.ts
│   ├── flows/
│       ├── cadastro.flow.ts
│       ├── coleta.flow.ts
│       ├── perguntas-ia.flow.ts
│       ├── perguntas-fixas.flow.ts
│       ├── confirmacao.flow.ts
│       ├── pagamento.flow.ts
│       ├── ajuste-precos.flow.ts
│       ├── materiais.flow.ts
│       ├── meu-perfil.flow.ts
│       ├── suporte-ia.flow.ts

├── orcamentos/
│   ├── orcamentos.module.ts
│   ├── orcamentos.service.ts
│   ├── orcamentos.controller.ts
│   ├── builders/
│   │   ├── pdf-builder.ts
│   │   ├── materiais-builder.ts
│   ├── utils/
│   │   ├── calculadora-orcamento.ts
│   │   ├── formatadores.ts

├── pix/
│   ├── pix.module.ts
│   ├── pix.service.ts
│   ├── pix.controller.ts

├── profissional/
│   ├── profissional.module.ts
│   ├── profissional.service.ts
│   ├── profissional.controller.ts

├── ia/
│   ├── ia.module.ts
│   ├── ia.service.ts
│   ├── prompts/
│   │   ├── separacao-servicos.prompt.txt
│   │   ├── perguntas-inteligentes.prompt.txt
│   │   ├── resumo-orcamento.prompt.txt
│   │   ├── treinamento-categoria.prompt.txt
│   ├── types/
│       ├── ia-types.ts
│       ├── ia-enums.ts
│       ├── ia-errors.ts

├── pdf/
│   ├── pdf.module.ts
│   ├── pdf.service.ts

└── prisma/
    ├── schema.prisma
    ├── seeds/
    │   ├── categorias.seed.ts
    │   ├── preco-pergunta.seed.ts
    │   ├── treinamento.seed.ts

🧬 4. SCHEMA PRISMA COMPLETO (VERSÃO FINAL)

Aqui está o schema completo e validado:

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Profissional {
  id           String      @id @default(uuid())
  nome         String
  email        String?
  telefone     String
  logoUrl      String?
  saldo        Int          @default(0)
  criadoEm     DateTime     @default(now())
  atualizadoEm DateTime     @updatedAt

  orcamentos   Orcamento[]
  conversas    LogConversa[]
  treinamentos TreinamentoIaCategoria[]
}

model Categoria {
  id        String          @id @default(uuid())
  nome      String
  criadoEm  DateTime        @default(now())

  perguntas PerguntaIa[]
  treinamentos TreinamentoIaCategoria[]
}

model PerguntaIa {
  id          String     @id @default(uuid())
  categoriaId String
  texto       String
  ordem       Int
  custo       Int         @default(1)

  categoria   Categoria  @relation(fields: [categoriaId], references: [id])
}

model Orcamento {
  id              String                @id @default(uuid())
  codigo          Int                   @default(autoincrement())
  profissionalId  String
  clienteNome     String?
  clienteTelefone String?
  status          String                @default("coletando")
  criadoEm        DateTime              @default(now())
  atualizadoEm    DateTime              @updatedAt

  profissional    Profissional          @relation(fields: [profissionalId], references: [id])
  servicos        ServicoOrcamento[]
  respostas       PerguntaRespondida[]
  respostasFixas  RespostasFixas[]
  materiais       MaterialEstimado[]
}

model PerguntaRespondida {
  id          String   @id @default(uuid())
  orcamentoId String
  pergunta    String
  resposta    String
  criadoEm    DateTime @default(now())

  orcamento   Orcamento @relation(fields: [orcamentoId], references: [id])
}

model RespostasFixas {
  id          String   @id @default(uuid())
  orcamentoId String
  campo       String
  resposta    String
  criadoEm    DateTime @default(now())

  orcamento   Orcamento @relation(fields: [orcamentoId], references: [id])
}

model ServicoOrcamento {
  id          String   @id @default(uuid())
  orcamentoId String
  titulo      String
  descricao   String?
  quantidade  Int      @default(1)
  preco       Float    @default(0)

  orcamento   Orcamento @relation(fields: [orcamentoId], references: [id])
}

model MaterialEstimado {
  id          String  @id @default(uuid())
  orcamentoId String
  nome        String
  unidade     String
  quantidade  Float
  precoMedio  Float

  orcamento   Orcamento @relation(fields: [orcamentoId], references: [id])
}

model LogConversa {
  id             String      @id @default(uuid())
  profissionalId String
  mensagem       String
  respostaIA     String?
  criadoEm       DateTime     @default(now())

  profissional   Profissional @relation(fields: [profissionalId], references: [id])
}

model TreinamentoIaCategoria {
  id          String     @id @default(uuid())
  categoriaId String
  profissionalId String?
  conteudo    String

  categoria   Categoria    @relation(fields: [categoriaId], references: [id])
  profissional Profissional? @relation(fields: [profissionalId], references: [id])
}

🤖 5. REGRAS DA IA
Perguntas Inteligentes

IA faz uma pergunta por vez

Cada pergunta debita saldo

IA usa:

histórico

respostas anteriores

treinamento da categoria

Salvar todas as respostas em PerguntaRespondida

Perguntas Fixas

Não debitam saldo.
Campos obrigatórios:

Prazo

Forma de pagamento

Validade

Observações

Estimativa de Materiais (oculta)

IA gera materiais automaticamente

Salvar em MaterialEstimado

Nunca mostrar ao profissional

Resumo final no PDF

IA gera um texto humanizado para finalizar o PDF

🔄 6. FLUXOS DO WHATSAPP

O projeto deve conter fluxos completos:

Cadastro

Coleta inteligente

Perguntas da IA

Perguntas fixas

Ajuste de preços

Geração de PDF

Cotação de materiais

Meu perfil

Suporte IA

📞 7. MENU WHATSAPP
1 - Criar orçamento
2 - Comprar créditos
3 - Meus orçamentos
4 - Meu perfil
5 - Orçar materiais
6 - Suporte IA

💰 8. REGRAS DE COBRANÇA
Ação	Cobra saldo?
Perguntas IA	✔ SIM
Perguntas fixas	❌ NÃO
Ajuste de preço	❌ NÃO
Suporte IA	Opcional
PDF	❌ NÃO
📤 9. PDF (HTML → Puppeteer)

PDF deve conter:

Nome + Logo do profissional

Serviços + preços

Total

Respostas fixas

Texto final IA

💳 10. MÓDULO PIX

Pix em modo mock

Webhook de confirmação

Atualiza saldo

🧨 11. REGRAS PARA O CODEGEN

O gerador deve:

✔ Criar todos os módulos, services, controllers e flows
✔ Criar todos os arquivos conforme a árvore de diretórios
✔ Implementar WhatsApp WebJS
✔ Implementar IA (OpenAI)
✔ Gerar PDF com Puppeteer
✔ Criar Prisma schema + migrations + seeds
✔ Código sem TODO, sem placeholders, sem partes faltando
✔ Código NestJS totalmente válido e funcional

Cada arquivo deve ser entregue assim:

// path: src/whatsapp/whatsapp.service.ts
<conteúdo completo aqui>

🏁 FIM DO PROJECT_SPEC.md — VERSÃO FINAL
