🍔 EstuLanches

Sistema de Gestão de Cardápio e Pedidos da Cantina Escolar

O EstuLanches é uma aplicação desenvolvida para facilitar o gerenciamento de cardápios e pedidos de uma cantina escolar, oferecendo uma interface web intuitiva para clientes e funcionalidades para acompanhamento dos pedidos.

🚀 Tecnologias utilizadas
Node.js 22 – Ambiente de execução.
Express – Framework para construção da API.
PostgreSQL 16 – Banco de dados relacional.
Docker – Containerização e implantação da aplicação.
🎥 Demonstração do projeto

Confira o vídeo de apresentação e demonstração do EstuLanches:

▶️ ASSISTIR À DEMONSTRAÇÃO NO YOUTUBE

⚙️ Implantação
Pré-requisitos
Docker
Docker Compose
Como executar

Clone o repositório e execute os comandos abaixo:

bash
cp .env.example .env


Configure a senha do banco de dados no arquivo .env.

Em seguida, execute:

bash
docker compose up -d --build


Para verificar o funcionamento dos serviços:

bash
docker compose ps


Para consultar os logs de inicialização:

bash
docker compose logs


Para verificar a saúde da aplicação:

bash
curl localhost:3000/health


Ou execute tudo de uma vez:

bash
./scripts/validar.sh

💻 Interface web

Após iniciar a aplicação, acesse:

🌐 http://localhost:3000/

Na interface, é possível:

Visualizar o cardápio disponível.
Adicionar produtos ao carrinho.
Finalizar pedidos.
Acompanhar o status dos pedidos.
🔌 API

A aplicação disponibiliza os seguintes endpoints:

Método	Rota	Descrição
GET	/health	Verifica a saúde da aplicação e do banco de dados.
GET	/cardapio	Lista os itens do cardápio.
POST	/cardapio	Adiciona um novo item ao cardápio.
POST	/pedidos	Cria um novo pedido.
GET	/pedidos	Lista os pedidos cadastrados.
PATCH	/pedidos/:id/status	Atualiza o status de um pedido.
Exemplos de requisições

Adicionar item ao cardápio:

json
{
  "nome": "Sanduíche Natural",
  "preco": 5.50
}


Criar um pedido:

json
{
  "cliente": "Ana",
  "itens": [
    {
      "item_id": 1,
      "quantidade": 2
    }
  ]
}


Atualizar status do pedido:

json
{
  "status": "EM_PREPARO"
}

📦 Fluxo de status dos pedidos

O sistema utiliza o seguinte fluxo de acompanhamento:

PENDENTE → EM_PREPARO → PRONTO → ENTREGUE

Também é permitido cancelar pedidos antes de atingirem o status PRONTO.

🧪 Testes

Para instalar as dependências:

bash
npm ci


Testes unitários – Validam as regras de negócio sem necessidade de banco de dados:

bash
npm run test:unit


Testes de integração – Validam a integração com o banco de dados e exigem a aplicação em execução:

bash
docker compose up -d
npm run test:integration

📌 Objetivo do projeto

O EstuLanches tem como objetivo simplificar a gestão de uma cantina escolar, centralizando o gerenciamento do cardápio, a realização de pedidos e o acompanhamento de seus status em uma única aplicação.

🍔 EstuLanches — Mais praticidade na gestão da cantina escolar!
