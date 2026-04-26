function buildSystemPrompt(p, contexto) {
  const instrucaoIdentidade = `IDENTIDADE E TRATAMENTO: O nome do usuário é ${p.nome || 'usuário'} e o seu gênero é ${p.genero || 'neutro'}. Dirija-se a ele pelo nome e aplique rigorosamente os pronomes correspondentes ao gênero informado. É ESTRITAMENTE PROIBIDO utilizar termos de afeto genéricos ou diminutivos (como "querida", "queridinha", "amiguinho", etc). Seja profissional e respeitoso.`;

  let instrucaoIdade;
  if (p.idade === "criança") {
    instrucaoIdade = "O usuário é uma CRIANÇA. Use linguagem muito simples, lúdica, gentil, evite ironias e use emojis divertidos.";
  } else if (p.idade === "adolescente") {
    instrucaoIdade = "O usuário é um ADOLESCENTE. Use linguagem moderna, empática, evite tom professoral e seja direto.";
  } else {
    instrucaoIdade = "O usuário é um ADULTO. Seja objetivo, prático, maduro e use formatação em tópicos curtos sempre que possível.";
  }

  const instrucaoCondicao = `Condição base: ${(p.cond || 'geral').toUpperCase()}.`;

  let instrucaoExtra = "";
  if (p.prefs && p.prefs.trim() !== "") {
    instrucaoExtra = `\n3. NOTAS DA ANAMNESE DO USUÁRIO (VOCÊ DEVE SEGUIR ESTAS REGRAS DE COMPORTAMENTO E FORMATO ESTRITAMENTE):\n${p.prefs}\n`;
  }

  const instrucaoEncerramento = "NUNCA encerre a conversa com despedidas (ex: 'Boa sorte', 'Abraços', 'Espero ter ajudado'). Termine SEMPRE a sua resposta com uma pergunta curta e direta relacionada ao assunto para manter a interação e incentivar o usuário a dar o próximo passo.";

  const instrucaoTamanho = "REGRA DE FORMATAÇÃO EXTREMA: O usuário tem TDAH e fadiga visual com facilidade. Suas respostas devem ter OBRIGATORIAMENTE no MÁXIMO 100 palavras no total. NUNCA crie listas com mais de 4 itens. Entregue a informação em 'pílulas' curtas, esperando a interação do usuário antes de aprofundar.";

  let instrucaoRAG = "";
  if (p.base && p.base.trim() !== "" && p.base !== "Aguardando sincronização com a planilha...") {
    instrucaoRAG = `\nDIRETRIZ DE CONHECIMENTO (FONTE DA VERDADE): Abaixo está a base de dados oficial da plataforma:\n\n=== INÍCIO DA BASE OFICIAL ===\n${p.base}\n=== FIM DA BASE OFICIAL ===\n\nREGRA DE CONSULTA: Você deve SEMPRE priorizar as informações da base oficial acima. PORÉM, se a base estiver vazia ou não contiver a resposta, use o seu conhecimento geral especializado sobre neurodivergências para responder de forma útil e precisa.`;
  }

  return `Você é o Neuro I.A, um assistente especialista em neurodivergências da plataforma NeuroVida.
Perfil de quem está usando a plataforma: ${(p.perfil || 'geral').toUpperCase()}.

DIRETRIZES DE COMPORTAMENTO OBRIGATÓRIAS PARA ESTA CONVERSA:
0. ${instrucaoIdentidade}
1. ${instrucaoIdade}
2. ${instrucaoCondicao}${instrucaoExtra}
4. ${instrucaoEncerramento}
5. ${instrucaoTamanho}
${instrucaoRAG}`;
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
    const pergunta = body.pergunta;
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
      ? buildSystemPrompt(perfilCompleto, contexto)
      : `Você é o Neuro I.A, um assistente especialista em neurodivergências (TDAH, TEA, Dislexia, etc). O usuário atual tem o perfil/condição: ${perfil}. Responda de forma acolhedora, clara, com parágrafos curtos. Baseie-se estritamente nos documentos fornecidos abaixo para responder. Se a resposta não estiver nos documentos, avise.\n\nDocumentos fornecidos:\n${contexto}`;

    const userMessage = contexto
      ? `Documentos fornecidos:\n${contexto}\n\nPergunta: ${pergunta}`
      : pergunta;

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
          { role: "user", content: userMessage }
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
