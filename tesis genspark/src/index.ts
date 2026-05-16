/**
 * ThesisForge AI v2.0
 * Migrado de Cloudflare Workers/D1 → Vercel Functions + Vercel Postgres
 *
 * Entry point compatible con:
 *  - Vercel Serverless Functions (Node.js runtime)
 *  - Desarrollo local con @hono/node-server
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import thesisRoutes from './routes/thesis.js'
import { getMainHTML } from './lib/frontend.js'

// ─── App ──────────────────────────────────────────────────────────────────────
const app = new Hono()

// ─── Middleware Global ────────────────────────────────────────────────────────
app.use('*', logger())
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Type', 'Content-Disposition']
}))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    app: 'ThesisForge AI',
    version: '2.0.0',
    platform: 'Vercel + PostgreSQL',
    timestamp: new Date().toISOString()
  })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.route('/api/auth', authRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/thesis', thesisRoutes)

// ─── Frontend SPA ────────────────────────────────────────────────────────────
// Sirve la SPA para todas las rutas no-API
app.get('/*', (c) => {
  return c.html(getMainHTML())
})

export default app

