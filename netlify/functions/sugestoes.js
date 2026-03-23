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

    const systemMessage = `Você é um especialista em neurodivergências. Leia o documento e gere 4 sugestões práticas baseadas nele para o perfil: ${perfil}. 
Você DEVE retornar APENAS um JSON válido, sem nenhum texto antes ou depois. 
Use exatamente esta estrutura:
{"s":[{"e":"emoji","t":"título curto","d":"descrição breve e prática"}]}`;

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
          { role: "user", content: `Documentos:\n\n${contexto}` }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ erro: `Erro OpenRouter: ${response.status}`, detalhes: errorText })
      };
    }

    const data = await response.json();
    let textoResposta = data.choices[0].message.content;

    let sugestoesArray = [];
    try {
      textoResposta = textoResposta.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(textoResposta);
      sugestoesArray = parsedData.s || [];
    } catch (parseError) {
      console.log("Falha ao fazer parse do JSON da IA:", textoResposta);
      sugestoesArray = [{ e: "⚠️", t: "Aviso", d: "Não foi possível formatar as sugestões. Tente novamente." }];
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sugestoes: sugestoesArray })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: "Erro interno no servidor", detalhes: error.message })
    };
  }
};