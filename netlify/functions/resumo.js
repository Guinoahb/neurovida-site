function buildSystemPrompt(p) {
  const instrucaoIdentidade = `IDENTIDADE E TRATAMENTO: O nome do usuário é ${p.nome || 'usuário'} e o seu gênero é ${p.genero || 'neutro'}. Dirija-se a ele pelo nome e aplique rigorosamente os pronomes correspondentes ao gênero informado. É ESTRITAMENTE PROIBIDO utilizar termos de afeto genéricos ou diminutivos. Seja profissional e respeitoso.`;

  let instrucaoIdade;
  if (p.idade === "criança") {
    instrucaoIdade = "O usuário é uma CRIANÇA. Use linguagem muito simples, lúdica e gentil.";
  } else if (p.idade === "adolescente") {
    instrucaoIdade = "O usuário é um ADOLESCENTE. Use linguagem moderna, empática e direta.";
  } else {
    instrucaoIdade = "O usuário é um ADULTO. Seja objetivo, prático e use formatação em tópicos curtos sempre que possível.";
  }

  const instrucaoCondicao = `Condição base: ${(p.cond || 'geral').toUpperCase()}.`;

  let instrucaoExtra = "";
  if (p.prefs && p.prefs.trim() !== "") {
    instrucaoExtra = `\nNOTAS DA ANAMNESE DO USUÁRIO (SIGA ESTRITAMENTE):\n${p.prefs}\n`;
  }

  return `Você é o Neuro I.A, um assistente especialista em neurodivergências da plataforma NeuroVida.
Perfil de quem está usando a plataforma: ${(p.perfil || 'geral').toUpperCase()}.

DIRETRIZES OBRIGATÓRIAS:
0. ${instrucaoIdentidade}
1. ${instrucaoIdade}
2. ${instrucaoCondicao}${instrucaoExtra}

Crie um resumo claro, acessível e organizado dos documentos enviados. Inclua: pontos principais, recomendações práticas e uma breve conclusão. Use parágrafos curtos e linguagem simples.`;
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
      : `Você é um especialista em neurodivergências. Crie um resumo claro, acessível e organizado dos documentos enviados. Adapte a linguagem para o perfil: ${perfil}. Inclua: os pontos principais, recomendações práticas encontradas no texto e uma breve conclusão. Use parágrafos curtos e linguagem simples.`;

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
