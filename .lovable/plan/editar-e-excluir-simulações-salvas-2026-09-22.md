# Editar e excluir simulações salvas

## Objetivo
Permitir que vendedor e administrador editem ou excluam propostas já realizadas, respeitando o acesso atual de cada perfil.

## Alterações
- Adicionar ações **Editar** e **Excluir** nas propostas do histórico.
- Ao editar, abrir a proposta existente no mesmo montador, com cliente, itens, grupos, planos, seguro e quantidades preenchidos.
- Salvar as alterações na mesma proposta, recalculando cada item pelo motor atual e mantendo o mesmo endereço da proposta.
- Ao excluir, pedir confirmação clara e remover a proposta, seus itens e as simulações vinculadas.
- Para simulações antigas de uma única cota, permitir reabrir como uma nova proposta editável; a exclusão remove diretamente o registro antigo.
- Atualizar histórico e painel imediatamente após salvar ou excluir.

## Segurança e consistência
- Vendedores só podem alterar ou excluir os próprios registros; administradores mantêm o acesso permitido pelas regras atuais.
- Não alterar fórmulas, taxas, grupos ou o motor de cálculo.
- Evitar registros parciais caso uma atualização falhe.

## Validação
- Testar edição de cliente, quantidade, grupo/plano e itens.
- Testar exclusão com confirmação e cancelamento.
- Conferir histórico, totais, proposta e PDF em celular e computador.
- Executar os testes existentes do motor e da composição.
