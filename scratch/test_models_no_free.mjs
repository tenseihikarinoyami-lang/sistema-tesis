import 'dotenv/config';

async function testModel(model) {
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
    return res.ok ? "OK" : `Error ${res.status}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function run() {
  const models = ["google/gemma-2-9b-it", "mistralai/mistral-7b-instruct", "meta-llama/llama-3.1-8b-instruct"];
  for (const m of models) {
    console.log(`${m}:`, await testModel(m));
  }
}

run();
