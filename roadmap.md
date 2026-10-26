# Roadmap
- [ ] Liberar reservas, calendário, gestão comercial e metas/resultados aos consultores Patricia Antunes (Rodan, Rodorib RP, Rodocap e Rodorib SJRP) e Anderson Spiassi (Compasi, Redemil), com escrita restrita, metas da Pasta1.xlsx e meses manuais; preservar Compasi e acesso do Maurício, sem comparativo anual para consultores — confirmar contas antes de conceder acesso.
- [x] Exibir o total em R$ de cada qualificação comercial nos cartões da Administração — RPC devolve credito por situação (crédito × quantidade das propostas + crédito das simulações avulsas); conferido contra o banco (Venda fechada: 7 propostas, R$ 62.284.603,82) e teste de integração passou; compilação OK, falta publicar.
- [x] Substituir "Crédito total proposto" por "Total proposto no mês" no painel da Administração — RPC devolve o crédito somado das propostas do mês civil de São Paulo; cartão conferido contra o banco (R$ 422.941.191,67 em outubro) e teste de integração atualizado.
- [x] Acrescentar na Administração a visão por qualificação comercial (Sem qualificação, Quente, Morno, Frio, Venda fechada, Perdida) com clique abrindo o histórico filtrado do ano — 6 cartões conferidos na prévia e no banco; link valida qualification=hot.
- [x] Adicionar qualificação comercial com seis opções e filtro paginado no histórico — 14 testes passaram; seleção das seis opções, persistência após recarregar e filtros combinados conferidos com proposta autenticada temporária, removida ao concluir; compilação OK, falta publicar.
- [x] Simplificar histórico para cliente, vendedor e período De/Até; incluir propostas mensais, ticket médio do crédito total por proposta e volume por vendedor na Administração — 6 testes passaram, fluxo autenticado conferido, totais independentes confirmaram 128 propostas e ticket R$ 3.479.964,02; compilação OK. Disponível na prévia, falta publicar.
- [x] Corrigir agregação mensal no realizado anual, percentual e saldo da meta em todas as telas comerciais — 15 testes passaram; sessão do Maurício confirmou Compasi R$ 32.232.302,84, 44,7% e saldo R$ 39.907.346,16 após salvar novamente outubro de R$ 330.000 e recarregar; histórico preservado.
- [x] Dar a Luis Santana acesso de gerência restrito à Multieixo: consulta da equipe, propostas/PDFs e resultados comerciais, sem alterar dados dos demais vendedores ou ver outras revendas — conta real validada, 10 membros, filtros do histórico, bloqueio de administração global e revenda externa, proteção de escrita e PDF conferidos.

- [x] Subir a tela automaticamente ao clicar em "Adicionar outro grupo" na montagem de proposta, levando o vendedor de volta à escolha do grupo — conferido em proposta autenticada: rolagem 1399 → 0 e passo "Grupo" visível.


- [x] Destacar o sino de notificações do Maurício com botão azul institucional e ícone branco maior; zerar os dois percentuais em toda abertura da simulação de lance, preservando lances salvos até ação explícita — 41 testes passaram e abertura, cálculo e reabertura conferidos em proposta autenticada sem gravar alterações.

- [x] Retirar a linha que explica a conta da nova parcela (saldo ÷ prazo com carência) da tela de simulação de lance — telas mostram só o resultado, sem expor a fórmula

- [x] Permitir editar percentuais de lance e recalcular automaticamente por Reduzir parcela quando Reduzir prazo estiver bloqueado: saldo devedor ÷ (prazo restante − 2 meses), sem exigir lance em espécie quando não houver — 39 testes passaram; edição autenticada com espécie vazia e 20% conferida, proposta temporária removida.

- [x] Acrescentar filtro por grupo às reservas de cotas — acesso do Maurício validado: Grupo 1061 mostra 2 reservas, busca combinada funciona e Todos os grupos restaura 25 reservas; 32 testes financeiros passaram, sem alterar cálculos ou registros.

- [x] Analisar todas as abas de Propostas_Simulação.xlsx e reproduzir exemplos do Grupo 1075 — Padrão usa crédito de R$ 400 mil e espécie 19%; Planilha2 usa crédito de R$ 200 mil e espécie 20%; 101 testes existentes passaram sem alterações financeiras.
- [x] Corrigir simulação de lance conforme planilha oficial — saldo desconta parcela sem seguro conforme Padrão/Planilha2!S; exemplos separados confirmados; 38 × R$ 3.440 e 39ª de R$ 860; R$ 1.247,84 em 51 meses; 105 testes passaram, proposta real aberta sem gravações e PDF oficial conferido; proposta original, autenticação e banco preservados.

- [x] Modernizar calendário do Maurício com agenda intuitiva, edição, exclusão permanente em todas as telas e avisos de compromissos — fluxo real criado/editado/excluído; ausência confirmada nas telas e no banco, leituras removidas em cascata; avisos na véspera e no dia; 17 testes passaram.

- [x] Incluir comparações mensais/anuais, projeções transparentes e oportunidades de melhoria na gestão comercial, preservando lacunas e histórico — filtros e cenários validados com acesso do Maurício; 11 testes passaram; sem projeção para cobertura incompleta.
- [x] Retirar o programa de indicação de terceiros das telas de gestão comercial, preservando registros históricos — ausência conferida na tela de metas.

- [x] Entregar formulário Word preenchível para Mauricio confirmar regras, exemplos e dados de custo efetivo, modalidades e contemplação — sete páginas, arquivo validado e diagramação revisada

- [ ] Concluir análise de custo efetivo, modalidades prorrogada/diluída e contemplação — Grupo_920.xlsx conferida: parcela usa prazo inicial, sem modalidade diluída nem CET; falta planilha de lance/contrato com exemplos, regra de seguro/carência e aplicação do lance; confirmado lance sobre a carta, pagamentos detalhados e escolha entre reduzir parcela ou prazo; teste inicial somente para administradores

- [x] Exibir o percentual da parcela reduzida escolhido no passo 4 na proposta final e no PDF — validado com proposta salva e PDF contendo Parcela Reduzida 40%; cálculos preservados

- [x] Usar as quatro fotos enviadas (Florestal, Basculante 4 eixos, Tanque preto e Graneleiro KV) no revezamento das propostas e PDFs

- [x] Exibir lance em espécie total por grupo na barra azul da tela e do PDF, multiplicado pela quantidade de cotas; PDF validado com R$ 81.700 × 5

- [x] Preservar integralmente o motor de cálculo individual existente
- [x] Adicionar quantidade de cotas por item
- [x] Permitir vários grupos e planos na mesma proposta
- [x] Criar revisão e edição dos itens da proposta
- [x] Consolidar totais de cotas, crédito e parcela
- [x] Atualizar proposta visual, compartilhamento e PDF
- [x] Manter compatibilidade com simulações e histórico existentes
- [x] Adicionar testes de composição e validar fluxo responsivo
- [x] Reabrir propostas salvas no montador
- [x] Salvar edições na proposta existente
- [x] Excluir propostas e simulações com confirmação
- [x] Validar edição e exclusão em celular e computador
- [x] Atualizar automaticamente o prazo restante dos grupos a cada mês
- [x] Permitir editar simulações individuais antigas no mesmo registro
- [x] Compartilhar a proposta em PDF pelo menu nativo, incluindo WhatsApp e e-mail quando disponíveis
- [x] Adicionar modo noturno institucional com preferência salva
- [x] Garantir que WhatsApp e e-mail recebam o arquivo PDF anexado, nunca somente texto
- [x] Paginar o histórico e carregar somente 10 resultados por vez
- [x] Registrar o crédito de desenvolvimento da NandiDev no rodapé da plataforma
- [x] Corrigir proporção da foto e aperfeiçoar o acabamento do PDF das propostas
- [x] Distribuir fotos Randon e equilibrar o conteúdo em todas as páginas do PDF
- [x] Exibir as fotos completas sem corte e ampliar a legibilidade do PDF
- [x] Igualar a foto do PDF ao modelo online, preenchendo toda a largura sem deformação
- [x] Otimizar o painel administrativo com resumo mensal e carregamento limitado no banco
- [x] Corrigir propostas novas que geravam PDF em branco em alguns leitores
- [x] Adicionar CPF, identificação de cadastro próprio e licenças de vendedores
- [x] Validar permissões e estabilidade da nova estrutura de licenças
- [x] Adicionar campo de cliente e manter filtros de vendedor e data no histórico
- [x] Ativar busca por cliente no banco conectado e validar resultados no histórico — função com _client confirmada no banco; busca parcial sem distinguir maiúsculas validada com proposta salva e filtro combinado de vendedor; proposta temporária removida.
- [x] Sino menor e painel de notificações abrindo no topo da tela, como no celular — sino 36 px; painel encostado no topo (y=0) no computador e no celular, mesmo com a página rolada.
- [x] Modalidade "Reduzir Parcela (sob aprovação)" em vez de apenas "Reduzir Parcela" — rótulo único consumido por tela e PDF; 39 testes do cálculo passaram.
