# Otimizar o painel administrativo

## Objetivo
Reduzir o carregamento do painel administrativo, buscando somente os totais, gráficos mensais e as 10 simulações mais recentes já consolidados no banco.

## Alterações
- Aplicar integralmente o SQL enviado: índice por data, função `get_admin_overview` e permissões restritas a usuários autenticados.
- Atualizar o painel administrativo para consumir esse resumo em uma única consulta, em vez de baixar todas as simulações e perfis.
- Preservar os indicadores, gráficos e a tabela existentes, com contagens no fuso de São Paulo.
- Validar permissões, integridade do banco e funcionamento visual do painel.

## Detalhes técnicos
- A função continuará sujeita às regras de acesso do usuário conectado (`SECURITY INVOKER`).
- O índice acelera a ordenação das simulações mais recentes.
- Nenhum cálculo de consórcio ou dado existente será alterado.
