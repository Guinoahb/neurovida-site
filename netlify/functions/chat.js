exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ erro: "Método não permitido. Use POST." })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const pergunta = body.pergunta;
    const contexto = body.contexto || "";
    const perfil = body.perfil || "geral";

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ erro: "Chave OPENROUTER_API_KEY não configurada no Netlify." })
      };
    }

    const systemMessage = `Você é o Neuro I.A, um assistente especialista em neurodivergências (TDAH, TEA, Dislexia, etc). O usuário atual tem o perfil/condição: ${perfil}. Responda de forma acolhedora, clara, com parágrafos curtos. Baseie-se estritamente nos documentos fornecidos abaixo para responder. Se a resposta não estiver nos documentos, avise.
    
Documentos fornecidos:
${contexto}`;

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
          { role: "user", content: pergunta }
        ]
      })
    });

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

    const data = await response.json();
    const textoResposta = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ texto: textoResposta })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        erro: "Erro interno no servidor (Netlify Function)", 
        detalhes: error.message 
      })
    };
  }
};