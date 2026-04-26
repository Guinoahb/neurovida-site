function buildSystemPrompt(p) {
  const instrucaoCondicao = `Condição base do usuário: ${(p.cond || 'geral').toUpperCase()}.`;

  let instrucaoExtra = "";
  if (p.prefs && p.prefs.trim() !== "") {
    instrucaoExtra = `\nPreferências da anamnese (adapte as sugestões a estas preferências):\n${p.prefs}\n`;
  }

  return `Você é o Neuro I.A, um assistente especialista em neurodivergências da plataforma NeuroVida.
${instrucaoCondicao}${instrucaoExtra}
Leia o documento e gere 4 sugestões práticas adaptadas ao perfil do usuário.
Você DEVE retornar APENAS um JSON válido, sem nenhum texto antes ou depois.
Use exatamente esta estrutura:
{"s":[{"e":"emoji","t":"título curto","d":"descrição breve e prática"}]}`;
}

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
    const perfilCompleto = body.perfilCompleto || null;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ erro: "Chave OPENROUTER_API_KEY não configurada no Netlify." })
      };
    }

    const systemMessage = perfilCompleto
      ? buildSystemPrompt(perfilCompleto)
      : `Você é um especialista em neurodivergências. Leia o documento e gere 4 sugestões práticas baseadas nele para o perfil: ${perfil}. \nVocê DEVE retornar APENAS um JSON válido, sem nenhum texto antes ou depois. \nUse exatamente esta estrutura:\n{"s":[{"e":"emoji","t":"título curto","d":"descrição breve e prática"}]}`;

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
      const start = textoResposta.indexOf('{');
      const end = textoResposta.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        textoResposta = textoResposta.substring(start, end + 1);
      }
      sugestoesArray = JSON.parse(textoResposta).s || [];
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
