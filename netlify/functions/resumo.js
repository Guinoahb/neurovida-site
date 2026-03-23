exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ erro: "Método não permitido. Use POST." })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const contexto = body.contexto || "";
    const perfil = body.perfil || "geral";

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ erro: "Chave OPENROUTER_API_KEY não configurada no Netlify." })
      };
    }

    const systemMessage = `Você é um especialista em neurodivergências. Crie um resumo claro, acessível e organizado dos documentos enviados. Adapte a linguagem para o perfil: ${perfil}. Inclua: os pontos principais, recomendações práticas encontradas no texto e uma breve conclusão. Use parágrafos curtos e linguagem simples.`;

    // Roteador automático do OpenRouter para modelos gratuitos
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://benevolent-daifuku-43fe48.netlify.app",
        "X-Title": "NeuroVida"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: `Documentos para resumir:\n\n${contexto}` }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ erro: `Erro na API OpenRouter: ${response.status}`, detalhes: errorText })
      };
    }

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