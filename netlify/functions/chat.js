exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Chave da API não configurada.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido.' }) };
  }

  const { messages, userProfile } = body;

  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Mensagens inválidas.' }) };
  }

  const systemPrompt = `Você é o Neuro I.A, assistente especializado da plataforma NeuroVida. Seu público são pessoas com TDAH, TEA, Dislexia, Dispraxia, Discalculia, Disgrafia, Tourette, Altas Habilidades e TPS, além de familiares e educadores. Perfil atual: ${userProfile || 'geral'}. Use linguagem simples e acolhedora. Frases curtas. Nunca faça diagnósticos. Responda sempre em português do Brasil.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://luminous-tiramisu-40c3d6.netlify.app',
        'X-Title': 'NeuroVida'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || 'Erro na API.' })
      };
    }

    const text = data.choices?.[0]?.message?.content || 'Sem resposta.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: text })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno: ' + err.message })
    };
  }
};