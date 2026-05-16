/**
 * ThesisForge AI - Rutas de Autenticación
 * Migrado de Cloudflare D1 → Neon PostgreSQL
 */
import { Hono } from 'hono'
import {
  getSql,
  generateToken,
  hashPassword,
  verifyPassword,
  sessionExpiry,
  type User
} from '../lib/db.js'
import { requireAuth } from '../lib/auth-middleware.js'

const auth = new Hono()

// ─── POST /api/auth/register ─────────────────────────────────────────────────
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { username, email, password, full_name, institution = '' } = body

    if (!username || !email || !password || !full_name) {
      return c.json({ error: 'Campos requeridos: username, email, password, full_name' }, 400)
    }
    if (password.length < 8) {
      return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
    }
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      return c.json({ error: 'Username inválido (letras, números y _, 3-50 chars)' }, 400)
    }

    const sql = getSql()

    const existing = await sql`
      SELECT id FROM users WHERE username = ${username} OR email = ${email} LIMIT 1
    `
    if (existing.length > 0) {
      return c.json({ error: 'El usuario o email ya está registrado' }, 409)
    }

    const hashedPassword = await hashPassword(password)
    const rows = await sql`
      INSERT INTO users (username, email, password, full_name, institution, plan, is_active, is_admin)
      VALUES (${username}, ${email}, ${hashedPassword}, ${full_name}, ${institution}, 'free', TRUE, FALSE)
      RETURNING id, username, email, full_name, institution, plan, is_active, is_admin, created_at
    `

    const user = rows[0] as User
    const token = generateToken()
    const expiresAt = sessionExpiry()

    await sql`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `

    await sql`
      INSERT INTO activity_log (user_id, action, details, ip_address)
      VALUES (${user.id}, 'register', 'Nuevo usuario registrado', ${c.req.header('x-forwarded-for') || ''})
    `

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        institution: user.institution,
        plan: user.plan,
        is_admin: user.is_admin
      }
    }, 201)
  } catch (err) {
    console.error('[auth/register] Error:', err)
    return c.json({ error: 'Error interno del servidor' }, 500)
  }
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password } = body

    if (!username || !password) {
      return c.json({ error: 'Usuario y contraseña requeridos' }, 400)
    }

    const sql = getSql()
    const rows = await sql`
      SELECT * FROM users
      WHERE (username = ${username} OR email = ${username})
        AND is_active = TRUE
      LIMIT 1
    `

    if (rows.length === 0) {
      return c.json({ error: 'Credenciales incorrectas' }, 401)
    }

    const user = rows[0] as User
    const valid = await verifyPassword(password, user.password)

    if (!valid) {
      await sql`
        INSERT INTO activity_log (user_id, action, details, ip_address)
        VALUES (${user.id}, 'login_failed', 'Intento fallido', ${c.req.header('x-forwarded-for') || ''})
      `
      return c.json({ error: 'Credenciales incorrectas' }, 401)
    }

    const token = generateToken()
    const expiresAt = sessionExpiry()

    await sql`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `

    // Limpiar sesiones expiradas
    await sql`
      DELETE FROM sessions WHERE user_id = ${user.id} AND expires_at < NOW()
    `

    await sql`
      INSERT INTO activity_log (user_id, action, details, ip_address)
      VALUES (${user.id}, 'login', 'Login exitoso', ${c.req.header('x-forwarded-for') || ''})
    `

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        institution: user.institution,
        plan: user.plan,
        is_admin: user.is_admin
      }
    })
  } catch (err) {
    console.error('[auth/login] Error:', err)
    return c.json({ error: 'Error interno del servidor' }, 500)
  }
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
auth.post('/logout', requireAuth, async (c) => {
  try {
    const token = c.get('sessionToken')
    const user = c.get('user')
    const sql = getSql()

    await sql`DELETE FROM sessions WHERE token = ${token}`

    await sql`
      INSERT INTO activity_log (user_id, action, details)
      VALUES (${user.id}, 'logout', 'Sesión cerrada')
    `

    return c.json({ success: true, message: 'Sesión cerrada correctamente' })
  } catch (err) {
    console.error('[auth/logout] Error:', err)
    return c.json({ error: 'Error al cerrar sesión' }, 500)
  }
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const sql = getSql()

  const projectStats = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
    FROM thesis_projects
    WHERE user_id = ${user.id}
  `

  return c.json({
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    institution: user.institution,
    plan: user.plan,
    is_admin: user.is_admin,
    created_at: user.created_at,
    stats: {
      total_projects: Number(projectStats[0]?.total || 0),
      completed_projects: Number(projectStats[0]?.completed || 0)
    }
  })
})

// ─── PUT /api/auth/profile ───────────────────────────────────────────────────
auth.put('/profile', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { full_name, institution, current_password, new_password } = body
    const sql = getSql()

    if (!full_name) {
      return c.json({ error: 'El nombre completo es requerido' }, 400)
    }

    if (new_password) {
      if (!current_password) {
        return c.json({ error: 'Se requiere la contraseña actual' }, 400)
      }
      if (new_password.length < 8) {
        return c.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, 400)
      }

      const rows = await sql`SELECT password FROM users WHERE id = ${user.id}`
      const valid = await verifyPassword(current_password, (rows[0] as User).password)
      if (!valid) {
        return c.json({ error: 'Contraseña actual incorrecta' }, 400)
      }

      const newHash = await hashPassword(new_password)
      await sql`
        UPDATE users
        SET full_name = ${full_name}, institution = ${institution || ''}, password = ${newHash}, updated_at = NOW()
        WHERE id = ${user.id}
      `
    } else {
      await sql`
        UPDATE users
        SET full_name = ${full_name}, institution = ${institution || ''}, updated_at = NOW()
        WHERE id = ${user.id}
      `
    }

    return c.json({ success: true, message: 'Perfil actualizado correctamente' })
  } catch (err) {
    console.error('[auth/profile] Error:', err)
    return c.json({ error: 'Error al actualizar perfil' }, 500)
  }
})

export default auth
