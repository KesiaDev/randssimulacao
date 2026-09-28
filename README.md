# Rands Consórcios Simulator

Crie uma plataforma web moderna, profissional e responsiva para SIMULAÇÃO DE CONSÓRCIOS da Randon Consórcios/Rands.

IMPORTANTE:
Esta plataforma será utilizada por uma equipe comercial. O objetivo é transformar a lógica existente em uma planilha Excel em um sistema de simulação moderno, rápido e simples de usar.

A fonte inicial dos dados é a planilha "Grupo 920.xlsx", que contém as regras e combinações do Grupo 920.

NÃO quero simplesmente importar e exibir a planilha.
Quero que o sistema transforme os dados da planilha em um MOTOR DE CÁLCULO.

==================================================
1. ESTRUTURA DO SISTEMA
==================================================

O sistema deve ser preparado desde o início para trabalhar com VÁRIOS GRUPOS DE CONSÓRCIO.

Neste primeiro momento haverá apenas:

Grupo 920

Porém, a arquitetura do banco de dados deve permitir posteriormente cadastrar:

- Grupo
- Prazo inicial
- Prazo restante
- Faixas de crédito
- Taxas de administração
- Fundo de reserva
- Modalidades de parcela
- Seguro
- Outras regras específicas do grupo

Não criar uma estrutura engessada específica apenas para o Grupo 920.

==================================================
2. DADOS DO GRUPO 920
==================================================

Utilizar os dados da planilha fornecida como fonte de verdade.

Na planilha:

GRUPO = 920

PRAZO INICIAL = 100

PRAZO RESTANTE = 41

As faixas de crédito existentes são:

R$ 293.305,85
R$ 269.841,38
R$ 246.376,92
R$ 222.912,44
R$ 199.447,98
R$ 175.983,51
R$ 146.653,29

Cada faixa possui combinações de:

Taxa de administração:
10%
14%

Fundo de reserva:
1%

Modalidade de parcela:

Integral:
multiplicador 1,00

Reduzida:
multiplicador 0,40

Seguro:
0,04%

IMPORTANTE:
Esses valores devem ser cadastrados no banco/configuração do sistema e não espalhados pelo código.

O sistema deve permitir alterar futuramente essas regras sem precisar reconstruir a aplicação.

==================================================
3. MOTOR DE CÁLCULO
==================================================

Reproduzir exatamente a lógica matemática da planilha.

Na planilha:

CRÉDITO + TXS =
CRÉDITO × (TAXA DE ADMINISTRAÇÃO + FUNDO DE RESERVA) + CRÉDITO

Portanto:

total_base =
credito * (taxa_administracao + fundo_reserva) + credito

A parcela base deve seguir:

parcela_base =
total_base / prazo_inicial

Depois aplicar o multiplicador da modalidade:

parcela =
parcela_base * multiplicador

Onde:

Integral = 1,00
Reduzida = 0,40

Seguro:

seguro =
total_base * 0,04%

Parcela com seguro:

parcela_com_seguro =
parcela + seguro

IMPORTANTE:
Não arredondar durante as etapas intermediárias.
Calcular com precisão e arredondar apenas o resultado final exibido para moeda brasileira.

==================================================
4. FLUXO PRINCIPAL DO VENDEDOR
==================================================

A experiência deve ser extremamente simples.

Tela inicial:

"Simulador de Consórcios"

Subtítulo:
"Monte sua simulação em poucos passos."

Passo 1:

ESCOLHER GRUPO

Exibir cards:

Grupo 920

No futuro, quando houver novos grupos:

Grupo 920
Grupo XXX
Grupo YYY
etc.

Ao selecionar o grupo, carregar dinamicamente todas as configurações daquele grupo.

--------------------------------------------------

Passo 2:

ESCOLHER FAIXA DE CRÉDITO

Exibir as faixas em cards modernos:

R$ 293.305,85
R$ 269.841,38
R$ 246.376,92
R$ 222.912,44
R$ 199.447,98
R$ 175.983,51
R$ 146.653,29

Mostrar os valores de maneira extremamente visual.

Exemplo:

CRÉDITO
R$ 293.305,85

Grupo 920
41 meses restantes

Botão:

"Selecionar"

--------------------------------------------------

Passo 3:

ESCOLHER TAXA DE ADMINISTRAÇÃO

Mostrar as opções disponíveis para aquela faixa:

10%
14%

Cada opção pode ser apresentada como um card/botão.

Exemplo:

Taxa de administração

[ 10% ]

[ 14% ]

Ao selecionar, continuar automaticamente.

--------------------------------------------------

Passo 4:

ESCOLHER TIPO DE PARCELA

Mostrar:

PARCELA INTEGRAL
100% da parcela

PARCELA REDUZIDA
40% da parcela

Utilizar cards grandes e claros.

Não mostrar termos técnicos desnecessários.

--------------------------------------------------

Passo 5:

SEGURO

Mostrar um controle:

Seguro prestamista

[ Não incluir ] [ Incluir ]

Quando o vendedor selecionar "Incluir", calcular automaticamente:

seguro = total_base × 0,04%

E somar ao valor da parcela.

O sistema deve deixar extremamente claro no resumo:

Parcela sem seguro: R$ XXX
Seguro: R$ XX
Parcela final: R$ XXX

Se não houver seguro:

Seguro: Não incluído

==================================================
5. RESULTADO FINAL
==================================================

Depois de todas as escolhas, mostrar uma tela de resultado muito bonita e profissional.

Título:

"Simulação pronta"

Mostrar:

GRUPO
920

CRÉDITO
R$ 293.305,85

TAXA DE ADMINISTRAÇÃO
10%

FUNDO DE RESERVA
1%

MODALIDADE
Parcela Integral

PRAZO INICIAL
100 meses

PRAZO RESTANTE
41 meses

SEGURO
Incluído / Não incluído

--------------------------------

VALOR DA PARCELA

R$ X.XXX,XX

Esse valor deve ter enorme destaque.

Se seguro estiver selecionado:

Parcela: R$ X.XXX,XX
Seguro: R$ XXX,XX

TOTAL MENSAL:

R$ X.XXX,XX

==================================================
6. PERMITIR COMPARAÇÃO
==================================================

Adicionar um botão:

"Comparar opções"

Isso deve permitir ao vendedor comparar rapidamente:

Integral x Reduzida

ou

10% x 14%

ou

Com seguro x Sem seguro

Exemplo:

OPÇÃO 1
Parcela integral
10%
Sem seguro
R$ X.XXX,XX

OPÇÃO 2
Parcela reduzida
10%
Sem seguro
R$ X.XXX,XX

OPÇÃO 3
Parcela integral
14%
Com seguro
R$ X.XXX,XX

Isso será muito útil para apresentação comercial.

==================================================
7. ADMINISTRAÇÃO
==================================================

Criar área administrativa separada.

O administrador principal será:

Mauricio Palma
E-mail:
mauricio.palma@rands.com.br

IMPORTANTE SOBRE SEGURANÇA:

Não deixar a senha administrativa exposta no frontend, código-fonte ou banco público.

Criar o usuário administrativo inicialmente com a senha fornecida pelo solicitante, armazenando-a de forma segura usando autenticação adequada e hash.

O administrador poderá:

- Cadastrar grupos
- Editar grupos
- Ativar/desativar grupos
- Cadastrar faixas de crédito
- Editar valores de crédito
- Cadastrar taxas de administração
- Editar fundo de reserva
- Configurar prazo inicial
- Configurar prazo restante
- Configurar modalidades de parcela
- Configurar multiplicadores
- Configurar seguro
- Ativar/desativar seguro
- Visualizar vendedores
- Criar vendedores
- Editar vendedores
- Desativar vendedores
- Resetar senha de vendedores

==================================================
8. VENDEDORES
==================================================

Mauricio deve possuir uma área:

"Minha equipe"

Dentro dela:

[ + Adicionar vendedor ]

Campos:

Nome
E-mail
Telefone
Senha inicial
Status

O vendedor poderá fazer login individualmente.

Cada vendedor terá acesso ao simulador.

O vendedor NÃO poderá:

- alterar regras
- alterar grupos
- alterar taxas
- alterar fórmulas
- criar administradores

O vendedor poderá:

- fazer simulações
- visualizar suas simulações
- repetir uma simulação
- compartilhar/exportar uma simulação

==================================================
9. HISTÓRICO DE SIMULAÇÕES
==================================================

Criar histórico.

Cada simulação deve armazenar:

ID
Data
Hora
Vendedor
Grupo
Crédito
Taxa
Fundo de reserva
Tipo de parcela
Seguro
Valor da parcela
Valor final

Criar busca e filtros.

Filtros:

Vendedor
Grupo
Data
Faixa de crédito

==================================================
10. GERAR PROPOSTA
==================================================

No resultado final adicionar:

[ GERAR PROPOSTA ]

Ao clicar, gerar uma apresentação/resumo profissional da simulação.

Informações:

Randon Consórcios / Rands

Grupo
Crédito
Prazo
Taxa
Modalidade
Seguro
Parcela final

Nome do vendedor

Data da simulação

Também permitir:

[ Compartilhar ]

[ Baixar PDF ]

O layout da proposta deve ser profissional e adequado para enviar ao cliente pelo WhatsApp.

==================================================
11. DESIGN
==================================================

Pesquisar e seguir a identidade visual atual da Randoncorp/Rands/Randon Consórcios.

Não inventar uma identidade visual completamente diferente.

A Randon Consórcios integra a Rands, vertical de soluções financeiras da Randoncorp.

Utilizar como referência:

- azul institucional
- branco
- tons neutros
- cinza
- elementos discretos de destaque

A identidade deve transmitir:

- confiança
- segurança
- tecnologia
- precisão
- solidez
- inovação

Evitar aparência de fintech genérica ou aplicativo de banco.

Criar uma interface corporativa premium.

Usar:

- cards
- bordas suaves
- bastante espaço em branco
- tipografia moderna
- números grandes
- hierarquia visual clara
- ícones discretos
- microinterações
- transições suaves

Não exagerar em gradientes.

Não usar cores neon.

Não criar um dashboard cheio de informações desnecessárias.

A plataforma deve parecer um sistema corporativo desenvolvido para uma grande empresa.

==================================================
12. DASHBOARD
==================================================

Após login:

Dashboard do vendedor:

"Olá, [Nome]"

Cards:

Simulações hoje
Simulações este mês
Última simulação

Botão principal:

"+ Nova simulação"

Área:

"Simulações recentes"

Tabela:

Data
Cliente
Grupo
Crédito
Parcela
Seguro
Status

==================================================
13. DASHBOARD DO ADMINISTRADOR
==================================================

Dashboard do Mauricio:

Total de vendedores
Vendedores ativos
Simulações hoje
Simulações este mês
Grupos ativos

Gráfico:

Simulações por vendedor

Gráfico:

Simulações por faixa de crédito

Tabela:

Últimas simulações

==================================================
14. ARQUITETURA DO BANCO
==================================================

Criar estrutura preparada para escala.

Tabelas sugeridas:

users
- id
- name
- email
- password_hash
- role
- active
- created_at

groups
- id
- name
- code
- active
- initial_term
- remaining_term

credit_ranges
- id
- group_id
- credit_value
- active

administration_rates
- id
- group_id
- rate
- active

installment_types
- id
- group_id
- name
- multiplier
- active

insurance_rules
- id
- group_id
- rate
- active

simulations
- id
- seller_id
- group_id
- credit_range_id
- administration_rate_id
- installment_type_id
- insurance_included
- base_amount
- installment_amount
- insurance_amount
- final_amount
- created_at

==================================================
15. REGRA MUITO IMPORTANTE
==================================================

O SISTEMA NÃO DEVE CONTER VALORES CALCULADOS FIXOS.

Exemplo:

Não criar:

R$ 3.XXX = determinada opção

Criar:

crédito
+
taxa
+
fundo
+
prazo
+
multiplicador
+
seguro

e calcular dinamicamente.

Assim, quando Mauricio adicionar um novo grupo, uma nova faixa ou uma nova taxa, o sistema automaticamente será capaz de fazer a simulação.

==================================================
16. VALIDAÇÃO COM A PLANILHA
==================================================

Antes de considerar o sistema pronto:

Ler todos os dados do arquivo "Grupo 920.xlsx".

Reproduzir os resultados da planilha usando o motor de cálculo.

Criar testes automáticos comparando:

resultado do sistema
VS
resultado esperado da planilha.

Nenhuma diferença de cálculo deve ser aceita.

A planilha é a fonte de verdade inicial para o Grupo 920.

==================================================
17. EXPERIÊNCIA DO VENDEDOR
==================================================

O fluxo deve ser:

Login

↓

Nova simulação

↓

Escolher grupo

↓

Escolher crédito

↓

Escolher taxa

↓

Escolher parcela integral/reduzida

↓

Escolher seguro

↓

RESULTADO

O vendedor deve conseguir chegar ao resultado em poucos cliques.

Adicionar uma barra de progresso:

1 Grupo
2 Crédito
3 Taxa
4 Parcela
5 Seguro
6 Resultado

Permitir voltar uma etapa sem perder as seleções.

==================================================
18. RESPONSIVIDADE
==================================================

O sistema precisa funcionar perfeitamente em:

Desktop
Notebook
Tablet
Celular

O uso principal provavelmente será desktop/notebook, mas vendedores podem utilizar celular para consulta rápida.

==================================================
19. SEGURANÇA
==================================================

Implementar autenticação real.

Não colocar credenciais no frontend.

Não colocar senhas em arquivos públicos.

Usar controle de acesso por função:

ADMIN
SELLER

Todas as operações administrativas devem exigir autenticação.

Vendedores só podem acessar seus próprios dados/histórico.

Mauricio terá acesso administrativo completo.

==================================================
20. IMPORTANTE SOBRE A MARCA
==================================================

Utilizar a identidade visual oficial como referência, sem inventar logotipos.

Se houver acesso ao logo oficial da Randon/Rands/Randon Consórcios, utilizar o arquivo oficial.

Não criar um logo "parecido".

No rodapé:

"Ferramenta interna de simulação"

e, quando apropriado:

"Valores sujeitos às condições e regras vigentes do grupo."

==================================================
21. PREPARAR PARA FUTURAS EVOLUÇÕES
==================================================

A arquitetura deve permitir futuramente:

- novos grupos
- diferentes prazos
- diferentes taxas
- diferentes fundos
- diferentes seguros
- diferentes modalidades
- veículos
- implementos
- máquinas agrícolas
- imóveis
- regras específicas por grupo
- tabelas de preços
- comissão do vendedor
- geração de proposta
- envio por WhatsApp
- CRM
- relatórios comerciais
- ranking de vendedores
- exportação Excel
- API

NÃO implementar tudo agora.

Mas deixar a arquitetura preparada.

==================================================
22. RESULTADO ESPERADO
==================================================

Entregar uma plataforma com aparência de produto SaaS corporativo premium.

O usuário não deve sentir que está usando uma planilha.

Deve sentir que está usando um sistema profissional de simulação da Randon Consórcios.

Prioridade:

1. Precisão dos cálculos
2. Facilidade de uso
3. Segurança
4. Administração de grupos
5. Administração de vendedores
6. Design profissional
7. Escalabilidade

Começar implementando o Grupo 920 usando integralmente os dados da planilha fornecida e validar todos os cálculos antes de avançar para funcionalidades secundárias.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://randssimulacao.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e8a623b4-8627-44f8-99ea-ff8eb0bb33d8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
