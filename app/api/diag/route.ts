import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const keys = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? `✅ Configurada (Inicia con ${process.env.OPENROUTER_API_KEY.substring(0, 7)}...)` : '❌ NO CONFIGURADA',
    GROQ_API_KEY: process.env.GROQ_API_KEY ? `✅ Configurada (Inicia con ${process.env.GROQ_API_KEY.substring(0, 7)}...)` : '❌ NO CONFIGURADA',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `✅ Configurada (Inicia con ${process.env.GEMINI_API_KEY.substring(0, 7)}...)` : '❌ NO CONFIGURADA',
    FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT ? '✅ Configurada (JSON)' : '❌ NO CONFIGURADA',
  };

  const env = process.env.NODE_ENV;

  return NextResponse.json({
    status: 'System Diagnostics',
    environment: env,
    timestamp: new Date().toISOString(),
    api_keys: keys,
    instructions: "Si ves '❌ NO CONFIGURADA', debes ir a Vercel Dashboard -> Settings -> Environment Variables y añadir la clave faltante."
  });
}
