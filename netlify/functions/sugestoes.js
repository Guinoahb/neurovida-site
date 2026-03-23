exports.handler = async function(event, context) {
  // 1. Bloqueia requisições que não sejam POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ erro: "Método não permitido. Use POST." })
    };
  }

  try {
    // 2. Faz o parse do corpo da requisição
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

    // 4. Monta o prompt do sistema exigindo JSON
    const systemMessage = `Você é um especialista em neurodivergências. Leia o documento e gere 4 sugestões práticas baseadas nele para o perfil: ${perfil}. 
Você DEVE retornar APENAS um JSON válido, sem nenhum texto antes ou depois. 
Use exatamente esta estrutura:
{"s":[{"e":"emoji","t":"título curto","d":"descrição breve e prática"}]}`;

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

    // 6. Limpeza e Parse do JSON retornado pela IA
    let sugestoesArray = [];
    try {
      // Remove possíveis marcações de código (```json ... ```) que a IA costuma colocar
      textoResposta = textoResposta.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(textoResposta);
      sugestoesArray = parsedData.s || [];
    } catch (parseError) {
      console.log("Falha ao fazer parse do JSON da IA:", textoResposta);
      // Fallback amigável caso a IA não retorne o JSON no formato perfeito
      sugestoesArray = [{ e: "⚠️", t: "Aviso", d: "Não foi possível formatar as sugestões. Tente novamente." }];
    }

    // 7. Retorna o array pronto para o front-end
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