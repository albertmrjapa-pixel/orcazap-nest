import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappGateway } from './whatsapp.gateway';
import { WhatsappClient } from './core/whatsapp.client';
import { WhatsappSender } from './core/whatsapp.sender';
import { WhatsappContextStore } from './core/whatsapp.context';
import { TtsService } from './core/tts.service';
import { CadastroFlow } from './flows/cadastro.flow';
import { ColetaFlow } from './flows/coleta.flow';
import { PerguntasIaFlow } from './flows/perguntas-ia.flow';
import { PerguntasFixasFlow } from './flows/perguntas-fixas.flow';
import { ConfirmacaoFlow } from './flows/confirmacao.flow';
import { PagamentoFlow } from './flows/pagamento.flow';
import { AjustePrecosFlow } from './flows/ajuste-precos.flow';
import { MateriaisFlow } from './flows/materiais.flow';
import { MeuPerfilFlow } from './flows/meu-perfil.flow';
import { SuporteIaFlow } from './flows/suporte-ia.flow';
import { OrcamentosModule } from '../orcamentos/orcamentos.module';
import { IaModule } from '../ia/ia.module';
import { PixModule } from '../pix/pix.module';
import { ProfissionalModule } from '../profissional/profissional.module';

@Module({
  imports: [OrcamentosModule, IaModule, forwardRef(() => PixModule), ProfissionalModule],
  providers: [
    WhatsappService,
    WhatsappGateway,
    WhatsappClient,
    WhatsappSender,
    WhatsappContextStore,
    TtsService,
    CadastroFlow,
    ColetaFlow,
    PerguntasIaFlow,
    PerguntasFixasFlow,
    ConfirmacaoFlow,
    PagamentoFlow,
    AjustePrecosFlow,
    MateriaisFlow,
    MeuPerfilFlow,
    SuporteIaFlow,
  ],
  exports: [WhatsappService],
})
export class WhatsappModule {}
