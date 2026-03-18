exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
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

  const userMessage = messages[messages.length - 1]?.content || '';

  const geminiBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || 'Erro na API Gemini.' })
      };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';

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