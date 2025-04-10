// index.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

// Configurações – idealmente, estas variáveis devem vir de variáveis de ambiente
const PORT = process.env.PORT || 3000;
const HIPER_API_ENDPOINT = process.env.HIPER_API_ENDPOINT || 'https://api.hiper.com.br/v1/pedidos';
const HIPER_API_KEY = process.env.HIPER_API_KEY || 'SUA_CHAVE_DE_API_HIPER';
const MERCUS_API_KEY = process.env.MERCUS_API_KEY || 'SUA_CHAVE_DE_API_MERCUS';

// Configura o body-parser para interpretar JSON
app.use(bodyParser.json());

/**
 * Endpoint para receber o webhook do Mercus com os dados do pedido
 * Exemplo de URL: http://seuservidor.com/webhook/mercus-order
 */
app.post('/webhook/mercus-order', async (req, res) => {
  console.log('===> Novo pedido recebido do Mercus:');
  console.log(JSON.stringify(req.body, null, 2));
  
  try {
    // Validação básica – ajuste conforme necessário
    if (!req.body.id_pedido) {
      return res.status(400).json({ error: 'O campo "id_pedido" é obrigatório.' });
    }

    // Mapeia os dados do pedido do formato Mercus para o formato esperado pelo Hiper
    const hiperOrder = mapMercusToHiper(req.body);

    // Envia o pedido para o Hiper
    const response = await sendOrderToHiper(hiperOrder);
    console.log('Resposta do Hiper:', response.data);

    // Retorna sucesso na integração
    return res.json({ status: 'sucesso', hiperResponse: response.data });
  } catch (error) {
    console.error('Erro na integração:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Erro ao processar integração', details: error.message });
  }
});

/**
 * Função para mapear os dados do pedido do Mercus para o formato da API do Hiper.
 * Adapte os nomes dos campos conforme a documentação real.
 */
function mapMercusToHiper(mercusOrder) {
  const hiperOrder = {
    pedido_id: mercusOrder.id_pedido,
    data_pedido: mercusOrder.data, // Ex: "2025-04-10T14:30:00Z"
    cliente: {
      codigo: mercusOrder.cliente.id,
      nome: mercusOrder.cliente.nome,
      endereco: mercusOrder.cliente.endereco,
      telefone: mercusOrder.cliente.telefone,
      email: mercusOrder.cliente.email
    },
    itens: mercusOrder.produtos.map(prod => ({
      codigo_produto: prod.id_produto,
      descricao_produto: prod.descricao,
      quantidade: prod.quantidade,
      valor_unitario: prod.preco_unitario,
      gtin: prod.gtin
    })),
    total_valor: mercusOrder.total,
    forma_pagamento: mercusOrder.condicao_pagamento,
    impostos: {
      icms: mercusOrder.impostos ? mercusOrder.impostos.ICMS : 0,
      ipi: mercusOrder.impostos ? mercusOrder.impostos.IPI : 0
    }
  };

  return hiperOrder;
}

/**
 * Função para enviar o pedido para a API do Hiper.
 */
async function sendOrderToHiper(hiperOrder) {
  // Configura os headers – a forma de autenticação pode variar
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${HIPER_API_KEY}`
  };

  // Chama a API do Hiper para inserir o pedido
  return axios.post(HIPER_API_ENDPOINT, hiperOrder, { headers });
}

/**
 * Endpoint simples para verificação de funcionamento
 */
app.get('/health', (req, res) => {
  res.send('API de integração funcionando.');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor de integração rodando na porta ${PORT}`);
});

