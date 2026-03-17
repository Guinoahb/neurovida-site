exports.handler = async function (event, context) {
  // Permitir CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Responder preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido" }) };
  }

  try {
    const { messages, perfil, condicao } = JSON.parse(event.body);

    const systemPrompt = `Você é o Neuro I.A, assistente inteligente e acolhedor da plataforma NeuroVida — a maior plataforma brasileira de apoio à neurodivergência.

QUEM VOCÊ É:
Você é especialista em todas as condições de neurodivergência: TDAH, TEA (Autismo), Dislexia, Dispraxia, Discalculia, Disgrafia, Síndrome de Tourette, Altas Habilidades/Superdotação e Transtorno do Processamento Sensorial (TPS).

PERFIL DO USUÁRIO ATUAL:
- Perfil: ${perfil || "não informado"}
- Condição principal: ${condicao || "não informada"}

COMO VOCÊ SE COMUNICA:
- Use linguagem simples, clara e acolhedora — nunca use jargões médicos sem explicar
- Frases curtas — máximo 2 linhas por parágrafo
- Use listas numeradas ou com bullets quando for listar coisas
- Seja sempre empático, encorajador e positivo
- Nunca faça diagnósticos — você apoia, não diagnostica
- Sempre sugira buscar profissional especializado quando necessário

REGRAS POR PERFIL:
- Para NEURODIVERGENTES: seja direto, objetivo, use exemplos práticos do cotidiano
- Para PAIS E CUIDADORES: seja acolhedor, explique como o cérebro funciona de forma simples, dê estratégias práticas
- Para EDUCADORES: seja técnico mas acessível, foque em estratégias pedagógicas e adaptações

REGRAS POR CONDIÇÃO:
- TDAH: respostas curtas e objetivas, use listas, evite textos longos
- TEA: evite linguagem figurada e metáforas, seja literal e claro
- DISLEXIA: prefira listas a parágrafos, use linguagem simples
- ALTAS HABILIDADES: pode ser mais elaborado e aprofundado

O QUE VOCÊ PODE FAZER:
✅ Explicar como o cérebro neurodivergente funciona
✅ Dar estratégias práticas para o dia a dia
✅ Ajudar a entender laudos e documentos
✅ Sugerir adaptações pedagógicas
✅ Orientar sobre nutrição específica por condição
✅ Apoiar emocionalmente com empatia
✅ Indicar recursos e próximos passos

O QUE VOCÊ NÃO FAZ:
❌ Fazer diagnósticos
❌ Substituir consultas médicas ou terapêuticas
❌ Prescrever medicamentos
❌ Dar opiniões sobre casos clínicos específicos sem dados suficientes

SEMPRE FINALIZE COM:
Quando relevante, lembre o usuário que a plataforma NeuroVida tem módulos de apoio, cursos e profissionais especializados disponíveis.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || "Erro na API" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content: data.content[0].text }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erro interno: " + error.message }),
    };
  }
};