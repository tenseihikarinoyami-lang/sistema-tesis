/**
 * ThesisForge AI - Cliente de Base de Datos
 * Usa @neondatabase/serverless (compatible con Vercel + Neon Postgres)
 * Migrado desde Cloudflare D1 (SQLite) → Neon PostgreSQL
 */
import { neon, neonConfig } from '@neondatabase/serverless'

// Habilitar caché de conexiones para mejor rendimiento en serverless
neonConfig.fetchConnectionCache = true

/**
 * Función sql para ejecutar queries con parámetros seguros.
 * Uso: sql\`SELECT * FROM users WHERE id = ${userId}\`
 */
function createSql() {
  const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
  if (!DATABASE_URL) {
    throw new Error('Variable de entorno POSTGRES_URL o DATABASE_URL no configurada')
  }
  return neon(DATABASE_URL)
}

// Exportar función que crea el cliente sql on-demand (evita error en build)
export function getSql() {
  return createSql()
}

// Re-export de neon para uso directo si se necesita
export { neon, neonConfig }

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  username: string
  email: string
  password: string
  full_name: string
  institution: string
  plan: 'free' | 'basic' | 'premium' | 'admin'
  is_active: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Session {
  id: number
  user_id: number
  token: string
  expires_at: string
  created_at: string
}

export interface ThesisProject {
  id: number
  user_id: number
  title: string
  institution: string
  normative: string
  research_type: string
  modality: string
  general_objective: string
  specific_objectives: string
  justification: string
  keywords: string
  status: 'draft' | 'in_progress' | 'completed'
  ai_provider: string
  ai_model: string
  created_at: string
  updated_at: string
  // Campos virtuales del JOIN
  chapter_count?: number
  completed_chapters?: number
}

export interface ThesisChapter {
  id: number
  project_id: number
  chapter_number: number
  title: string
  content: string
  word_count: number
  status: 'pending' | 'generating' | 'completed' | 'error'
  generated_at: string | null
  created_at: string
  updated_at: string
}

export interface Citation {
  id: number
  project_id: number
  authors: string
  title: string
  year: number | null
  source: string
  url: string
  doi: string
  citation_type: string
  apa_format: string
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateToken(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (const v of randomValues) {
    token += chars[v % chars.length]
  }
  return token
}

export async function hashPassword(password: string): Promise<string> {
  const salt = process.env.PASSWORD_SALT || 'ThesisForge_Salt_2024'
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password)
  return computed === hash
}

export function sessionExpiry(days = 7): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}
