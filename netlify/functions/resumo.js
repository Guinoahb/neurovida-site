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
    const contexto = body.contexto || "";
    const perfil = body.perfil || "geral";

    // 3. Puxa a chave da API
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ erro: "Chave OPENROUTER_API_KEY não configurada no Netlify." })
      };
    }

    // 4. Monta o prompt do sistema para o Resumo
    const systemMessage = `Você é um especialista em neurodivergências. Crie um resumo claro, acessível e organizado dos documentos enviados. Adapte a linguagem para o perfil: ${perfil}. Inclua: os pontos principais, recomendações práticas encontradas no texto e uma breve conclusão. Use parágrafos curtos e linguagem simples.`;

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
          { role: "user", content: `Documentos para resumir:\n\n${contexto}` }
        ]
      })
    });

    // 6. Trata erros do OpenRouter
    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ erro: `Erro na API OpenRouter: ${response.status}`, detalhes: errorText })
      };
    }

    // 7. Extrai e devolve a resposta
    const data = await response.json();
    const textoResposta = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ texto: textoResposta })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: "Erro interno no servidor", detalhes: error.message })
    };
  }
};