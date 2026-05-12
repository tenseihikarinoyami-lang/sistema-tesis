
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function testGroq() {
  console.log("\n--- Testing Groq ---");
  if (!GROQ_API_KEY) return console.log("No Groq key found in .env");
  try {
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Hola, responde solo 'OK' si recibes esto." }],
    });
    console.log("Groq Status: SUCCESS");
    console.log("Groq Response:", completion.choices[0]?.message?.content);
  } catch (e) {
    console.error("Groq Error:", e.message);
    if (e.message.includes("403")) {
      console.log("Note: 403 usually means Regional Block (e.g. Venezuela).");
    }
  }
}

async function testOpenRouter() {
  console.log("\n--- Testing OpenRouter ---");
  if (!OPENROUTER_API_KEY) return console.log("No OpenRouter key found in .env");
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://obelisco.ai',
        'X-Title': 'Obelisco Academic'
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [{ role: 'user', content: "Hola, responde solo 'OK' si recibes esto." }],
      })
    });
    const data = await res.json();
    if (!res.ok) {
        console.error("OpenRouter Status: FAILED");
        console.error("OpenRouter Error Details:", JSON.stringify(data, null, 2));
    } else {
        console.log("OpenRouter Status: SUCCESS");
        console.log("OpenRouter Response:", data.choices?.[0]?.message?.content);
    }
  } catch (e) {
    console.error("OpenRouter Fetch Error:", e.message);
  }
}

async function testGemini() {
  console.log("\n--- Testing Gemini ---");
  if (!GEMINI_API_KEY) return console.log("No Gemini key found in .env");
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hola, responde solo 'OK' si recibes esto.");
    console.log("Gemini Status: SUCCESS");
    console.log("Gemini Response:", result.response.text());
  } catch (e) {
    console.error("Gemini Error:", e.message);
    if (e.message.includes("429") || e.message.includes("quota")) {
      console.log("Note: Gemini Quota Exceeded as expected.");
    }
  }
}

async function run() {
  console.log("Starting API Diagnosis...");
  console.log("Current NODE_ENV:", process.env.NODE_ENV);
  await testGroq();
  await testOpenRouter();
  await testGemini();
}

run();
