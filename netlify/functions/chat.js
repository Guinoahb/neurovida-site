exports.handler = async function(event, context) {
  // 1. Bloqueia requisições que não sejam POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ erro: "Método não permitido. Use POST." })
    };
  }

  try {
    // 2. Faz o parse do corpo da requisição enviada pelo front-end
    const body = JSON.parse(event.body);
    const pergunta = body.pergunta;
    const contexto = body.contexto || "";
    const perfil = body.perfil || "geral";

    // 3. Puxa a chave da API das variáveis de ambiente do Netlify
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ erro: "Chave OPENROUTER_API_KEY não configurada no Netlify." })
      };
    }

    // 4. Monta o prompt do sistema orientando a IA
    const systemMessage = `Você é o Neuro I.A, um assistente especialista em neurodivergências (TDAH, TEA, Dislexia, etc). O usuário atual tem o perfil/condição: ${perfil}. Responda de forma acolhedora, clara, com parágrafos curtos. Baseie-se estritamente nos documentos fornecidos abaixo para responder. Se a resposta não estiver nos documentos, avise.
    
Documentos fornecidos:
${contexto}`;

    // 5. Faz a requisição para o OpenRouter (Usando Gemini 2.0 Flash gratuito)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://benevolent-daifuku-43fe48.netlify.app",
        "X-Title": "NeuroVida"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: pergunta }
        ]
      })
    });

    // 6. Trata erros caso o OpenRouter recuse a requisição
    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          erro: `Erro na API OpenRouter: ${response.status}`, 
          detalhes: errorText 
        })
      };
    }

    // 7. Extrai a resposta e devolve para o front-end
    const data = await response.json();
    const textoResposta = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ texto: textoResposta })
    };

  } catch (error) {
    // 8. Captura erros de sintaxe no JSON ou falhas no servidor
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        erro: "Erro interno no servidor (Netlify Function)", 
        detalhes: error.message 
      })
    };
  }
};