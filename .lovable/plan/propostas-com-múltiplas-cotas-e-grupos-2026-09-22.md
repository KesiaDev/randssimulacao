# Propostas com múltiplas cotas e grupos

## Objetivo
Evoluir a simulação individual para uma composição comercial com vários “Itens da proposta”. Cada item representa uma configuração exata já calculada pelo motor atual e uma quantidade inteira de cotas.

## Fluxo do consultor
1. Manter o fluxo atual: grupo → crédito → taxa → modalidade → seguro.
2. No resultado, informar a quantidade de cotas, começando em 1.
3. Exibir lado a lado os valores por cota e os totais daquele item.
4. Usar “Adicionar à proposta” para guardar o item sem finalizar a negociação.
5. Na revisão, permitir “Adicionar outro grupo”, editar um item, alterar sua quantidade ou removê-lo.
6. Mostrar totais consolidados de cotas, crédito e parcela mensal.
7. Gerar a proposta final somente após a revisão da composição.

## Regras preservadas
- O motor `calculate()` e todas as fórmulas atuais permanecerão inalterados.
- Cada item será calculado isoladamente com grupo, faixa, taxa, modalidade, fundo, prazo e seguro próprios.
- Somente após o cálculo individual serão aplicados:
  - crédito total do item = crédito individual × quantidade;
  - parcela total do item = parcela individual × quantidade;
  - seguro total do item = seguro individual × quantidade.
- Os totais gerais serão a soma dos itens, sem arredondamento intermediário; a formatação em reais continuará apenas na exibição.
- Nenhum valor genérico será compartilhado entre grupos.

## Dados e segurança
- Criar uma proposta principal vinculada ao consultor e seus respectivos itens.
- Persistir em cada item a quantidade e o retrato completo da configuração escolhida e dos resultados individuais, preservando a proposta mesmo se regras futuras mudarem.
- Aplicar as mesmas restrições atuais: vendedor acessa apenas suas propostas; administrador acessa a equipe.
- Manter as simulações antigas acessíveis e compatíveis durante a transição.
- Preparar a estrutura para receber os próximos grupos pela administração, sem fixar o Grupo 920 no código.

## Telas
- **Simulador:** quantidade de cotas, valores individuais, totais do item e ação “Adicionar à proposta”.
- **Revisão da proposta:** lista clara de itens, grupos e planos; edição, remoção, ajuste de quantidade e inclusão de outro grupo.
- **Proposta/PDF:** um bloco visual por item/grupo e um fechamento destacado com total de cotas, crédito total e parcela total mensal.
- **Compartilhamento:** resumo textual consolidado adequado para WhatsApp.
- **Histórico e painéis:** representar propostas compostas sem perder os registros individuais já existentes.

## Edição
- Alterar quantidade diretamente na revisão e recalcular imediatamente.
- Editar grupo, crédito, taxa, modalidade ou seguro reabrindo o configurador daquele item com os dados atuais preenchidos.
- Confirmar a edição antes de substituir o item, evitando perda acidental da composição.

## Validação
- Manter os 29 testes atuais do Grupo 920 sem qualquer alteração de resultado.
- Adicionar testes de quantidade, múltiplos itens, múltiplos grupos, edição, remoção e consolidação.
- Verificar que quantidade 1 reproduz exatamente a simulação atual.
- Validar o fluxo completo, compartilhamento e PDF em celular, tablet, notebook e computador.

## Detalhes técnicos
- Usar tabelas relacionadas de propostas e itens, com permissões de acesso por proprietário e administrador.
- Centralizar multiplicação e consolidação em funções puras separadas do motor de cálculo individual.
- Gerar os totais a partir dos itens, evitando valores divergentes entre revisão, histórico, compartilhamento e PDF.
- Fazer a migração sem apagar nem reinterpretar simulações existentes.
