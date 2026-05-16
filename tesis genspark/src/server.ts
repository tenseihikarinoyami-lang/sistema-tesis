/**
 * ThesisForge AI - Servidor de Desarrollo Local
 * Usa @hono/node-server para servir la app localmente
 * Ejecutar con: npm run dev (npx tsx watch src/server.ts)
 */
import { serve } from '@hono/node-server'
import app from './index.js'

const PORT = parseInt(process.env.PORT || '3000', 10)

console.log('🚀 ThesisForge AI v2.0 - Servidor de Desarrollo')
console.log('📋 Platform: Node.js (Hono + @hono/node-server)')
console.log('🌐 URL: http://localhost:' + PORT)
console.log()

// Verificar variables de entorno críticas
if (!process.env.POSTGRES_URL) {
  console.warn('⚠️  POSTGRES_URL no configurada. Las rutas de DB fallarán.')
  console.warn('   Configura .env.local con tus credenciales de Vercel Postgres')
  console.warn()
}

const providers = {
  'Gemini': process.env.GEMINI_API_KEY,
  'Groq': process.env.GROQ_API_KEY,
  'OpenRouter': process.env.OPENROUTER_API_KEY,
  'Cohere': process.env.COHERE_API_KEY
}

const activeProviders = Object.entries(providers)
  .filter(([, v]) => v)
  .map(([k]) => k)

if (activeProviders.length === 0) {
  console.warn('⚠️  Sin API keys de IA configuradas. La generación de capítulos fallará.')
} else {
  console.log('🤖 Proveedores IA activos: ' + activeProviders.join(', '))
}

console.log()

serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log('✅ Servidor iniciado en: http://localhost:' + info.port)
  console.log('   Health check: http://localhost:' + info.port + '/api/health')
  console.log()
  console.log('⚡ Rutas disponibles:')
  console.log('   GET  /              → SPA Principal')
  console.log('   GET  /api/health    → Estado del sistema')
  console.log('   POST /api/auth/login      → Autenticación')
  console.log('   POST /api/auth/register   → Registro')
  console.log('   GET  /api/thesis/projects → Proyectos')
  console.log('   POST /api/thesis/projects/:id/generate/:ch → Generar capítulo')
  console.log()
})
