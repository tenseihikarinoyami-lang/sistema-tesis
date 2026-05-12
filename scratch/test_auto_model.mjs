import 'dotenv/config';

async function testAuto() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5
      })
    });
    if (res.ok) {
        const data = await res.json();
        console.log("Auto model used:", data.model);
        return "OK";
    }
    return `Error ${res.status}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

testAuto().then(console.log);
