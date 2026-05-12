const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

async function testOpenRouter() {
    console.log("Probando OpenRouter directamente...");
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("Falta OPENROUTER_API_KEY");
        return;
    }

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct',
                messages: [{ role: 'user', content: 'Hola, di test' }]
            })
        });
        const data = await res.json();
        if (res.ok) {
            console.log("✅ OpenRouter OK:", data.choices[0].message.content);
        } else {
            console.error("❌ OpenRouter Error:", data.error || data);
        }
    } catch (e) {
        console.error("❌ Error de red OpenRouter:", e.message);
    }
}

testOpenRouter();
