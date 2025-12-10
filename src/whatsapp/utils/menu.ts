import { MENU_OPCOES } from './constants';

export function gerarMenuPrincipal(): string {
  return [
    'OrçaZap 3.0 - escolha uma opção:',
    `${MENU_OPCOES.CRIAR_ORCAMENTO} - Criar orçamento`,
    `${MENU_OPCOES.COMPRAR_CREDITOS} - Comprar créditos`,
    `${MENU_OPCOES.MEUS_ORCAMENTOS} - Meus orçamentos`,
    `${MENU_OPCOES.MEU_PERFIL} - Meu perfil`,
    `${MENU_OPCOES.ORCAR_MATERIAIS} - Orçar materiais`,
    `${MENU_OPCOES.SUPORTE_IA} - Suporte IA`,
  ].join('\n');
}
