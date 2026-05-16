/**
 * ThesisForge AI - Middleware de autenticación para Hono
 * Compatible con Vercel Serverless + Neon Postgres
 */
import type { Context, Next } from 'hono'
import { getSql } from './db.js'
import type { User } from './db.js'

declare module 'hono' {
  interface ContextVariableMap {
    user: User
    sessionToken: string
  }
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return c.json({ error: 'Token de autenticación requerido' }, 401)
  }

  try {
    const sql = getSql()
    const rows = await sql`
      SELECT u.id, u.username, u.email, u.password, u.full_name, u.institution,
             u.plan, u.is_active, u.is_admin, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
    `

    if (rows.length === 0) {
      return c.json({ error: 'Sesión inválida o expirada' }, 401)
    }

    c.set('user', rows[0] as User)
    c.set('sessionToken', token)
    return next()
  } catch (err) {
    console.error('[auth-middleware] Error:', err)
    return c.json({ error: 'Error de autenticación' }, 500)
  }
}

export async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return c.json({ error: 'Token de autenticación requerido' }, 401)
  }

  try {
    const sql = getSql()
    const rows = await sql`
      SELECT u.id, u.username, u.email, u.password, u.full_name, u.institution,
             u.plan, u.is_active, u.is_admin, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
    `

    if (rows.length === 0) {
      return c.json({ error: 'Sesión inválida o expirada' }, 401)
    }

    const user = rows[0] as User
    if (!user.is_admin) {
      return c.json({ error: 'Acceso denegado: se requieren permisos de administrador' }, 403)
    }

    c.set('user', user)
    c.set('sessionToken', token)
    return next()
  } catch (err) {
    console.error('[requireAdmin] Error:', err)
    return c.json({ error: 'Error de autenticación' }, 500)
  }
}
