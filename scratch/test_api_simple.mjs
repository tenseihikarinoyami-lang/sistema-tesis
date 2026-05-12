import 'dotenv/config';

async function testGroq() {
  if (!process.env.GROQ_API_KEY) return "Faltante";
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5
      })
    });
    return res.ok ? "OK" : `Error ${res.status}: ${await res.text()}`;
  } catch (e) {
    return `Error de conexión: ${e.message}`;
  }
}

async function testOpenRouter() {
  if (!process.env.OPENROUTER_API_KEY) return "Faltante";
  const models = [
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "openrouter/auto"
  ];
  
  let results = [];
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        results.push(`${model}: OK`);
        break; // Stop at first working model
      } else {
        results.push(`${model}: Error ${res.status}`);
      }
    } catch (e) {
      results.push(`${model}: Error ${e.message}`);
    }
  }
  return results.join(" | ");
}

async function run() {
  console.log("Chequeando APIs...");
  const groq = await testGroq();
  const or = await testOpenRouter();
  console.log("Groq:", groq);
  console.log("OpenRouter:", or);
}

run();
