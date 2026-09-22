# Paginação do histórico

## Objetivo
Manter a página leve, buscando somente uma quantidade limitada de registros por vez.

## Implementação
- Exibir 10 registros por página no histórico.
- Buscar no banco apenas os registros da página atual, em vez de carregar até 500 de uma vez.
- Adicionar navegação numerada `1, 2, 3, 4...`, com botões anterior e próximo.
- Manter propostas compostas e simulações individuais organizadas no mesmo histórico paginado.
- Fazer os filtros voltarem à primeira página e aplicá-los na busca sempre que possível.
- Preservar edição, abertura e exclusão existentes.

## Validação
- Conferir troca de páginas, filtros, edição e exclusão no celular e computador.
- Confirmar que apenas os registros necessários são carregados em cada página.
