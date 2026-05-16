/**
 * ThesisForge AI - Rutas de Administración
 * Migrado de Cloudflare D1 → Neon PostgreSQL
 */
import { Hono } from 'hono'
import { getSql, hashPassword } from '../lib/db.js'
import { requireAdmin } from '../lib/auth-middleware.js'

const admin = new Hono()
admin.use('/*', requireAdmin)

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
admin.get('/stats', async (c) => {
  try {
    const sql = getSql()

    const [usersStats, projectsStats, chapterStats, activityStats] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int                                                            AS total_users,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int                           AS active_users,
          COUNT(*) FILTER (WHERE is_admin = TRUE)::int                            AS admin_users,
          COUNT(*) FILTER (WHERE plan = 'free')::int                              AS free_users,
          COUNT(*) FILTER (WHERE plan = 'basic')::int                             AS basic_users,
          COUNT(*) FILTER (WHERE plan = 'premium')::int                           AS premium_users,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int  AS new_users_30d
        FROM users WHERE is_admin = FALSE
      `,
      sql`
        SELECT
          COUNT(*)::int                                                               AS total_projects,
          COUNT(*) FILTER (WHERE status = 'completed')::int                          AS completed_projects,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int                        AS in_progress_projects,
          COUNT(*) FILTER (WHERE status = 'draft')::int                              AS draft_projects,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int      AS new_projects_30d
        FROM thesis_projects
      `,
      sql`
        SELECT COUNT(*)::int AS total_chapters FROM thesis_chapters WHERE status = 'completed'
      `,
      sql`
        SELECT action, COUNT(*)::int AS count
        FROM activity_log
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY action ORDER BY count DESC LIMIT 10
      `
    ])

    return c.json({
      users: usersStats[0],
      projects: projectsStats[0],
      chapters: chapterStats[0],
      recent_activity: activityStats
    })
  } catch (err) {
    console.error('[admin/stats] Error:', err)
    return c.json({ error: 'Error al obtener estadísticas' }, 500)
  }
})

// ─── GET /api/admin/users ────────────────────────────────────────────────────
admin.get('/users', async (c) => {
  try {
    const sql = getSql()
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const search = c.req.query('search') || ''
    const plan = c.req.query('plan') || ''
    const offset = (page - 1) * limit

    let rows
    if (search) {
      const searchPattern = '%' + search + '%'
      rows = await sql`
        SELECT id, username, email, full_name, institution, plan, is_active, is_admin, created_at,
          (SELECT COUNT(*)::int FROM thesis_projects tp WHERE tp.user_id = users.id) AS project_count
        FROM users
        WHERE (username ILIKE ${searchPattern} OR email ILIKE ${searchPattern} OR full_name ILIKE ${searchPattern})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (plan) {
      rows = await sql`
        SELECT id, username, email, full_name, institution, plan, is_active, is_admin, created_at,
          (SELECT COUNT(*)::int FROM thesis_projects tp WHERE tp.user_id = users.id) AS project_count
        FROM users WHERE plan = ${plan}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT id, username, email, full_name, institution, plan, is_active, is_admin, created_at,
          (SELECT COUNT(*)::int FROM thesis_projects tp WHERE tp.user_id = users.id) AS project_count
        FROM users
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `
    }

    const countRows = await sql`SELECT COUNT(*)::int AS total FROM users`

    return c.json({
      users: rows,
      pagination: {
        total: Number(countRows[0].total),
        page, limit,
        pages: Math.ceil(Number(countRows[0].total) / limit)
      }
    })
  } catch (err) {
    console.error('[admin/users] Error:', err)
    return c.json({ error: 'Error al obtener usuarios' }, 500)
  }
})

// ─── GET /api/admin/users/:id ────────────────────────────────────────────────
admin.get('/users/:id', async (c) => {
  try {
    const sql = getSql()
    const id = parseInt(c.req.param('id'))

    const [userResult, projectsResult, activityResult] = await Promise.all([
      sql`SELECT id, username, email, full_name, institution, plan, is_active, is_admin, created_at, updated_at FROM users WHERE id = ${id}`,
      sql`SELECT id, title, status, normative, created_at FROM thesis_projects WHERE user_id = ${id} ORDER BY created_at DESC LIMIT 10`,
      sql`SELECT action, details, ip_address, created_at FROM activity_log WHERE user_id = ${id} ORDER BY created_at DESC LIMIT 20`
    ])

    if (userResult.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    return c.json({ user: userResult[0], projects: projectsResult, activity: activityResult })
  } catch (err) {
    console.error('[admin/users/:id] Error:', err)
    return c.json({ error: 'Error al obtener usuario' }, 500)
  }
})

// ─── PUT /api/admin/users/:id ────────────────────────────────────────────────
admin.put('/users/:id', async (c) => {
  try {
    const sql = getSql()
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const { plan, is_active, is_admin, full_name, institution, new_password } = body

    const existing = await sql`SELECT id FROM users WHERE id = ${id}`
    if (existing.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    if (new_password && new_password.length >= 8) {
      const newHash = await hashPassword(new_password)
      await sql`
        UPDATE users SET
          plan = COALESCE(${plan ?? null}, plan),
          is_active = COALESCE(${is_active ?? null}, is_active),
          is_admin = COALESCE(${is_admin ?? null}, is_admin),
          full_name = COALESCE(${full_name ?? null}, full_name),
          institution = COALESCE(${institution ?? null}, institution),
          password = ${newHash}, updated_at = NOW()
        WHERE id = ${id}
      `
    } else {
      await sql`
        UPDATE users SET
          plan = COALESCE(${plan ?? null}, plan),
          is_active = COALESCE(${is_active ?? null}, is_active),
          is_admin = COALESCE(${is_admin ?? null}, is_admin),
          full_name = COALESCE(${full_name ?? null}, full_name),
          institution = COALESCE(${institution ?? null}, institution),
          updated_at = NOW()
        WHERE id = ${id}
      `
    }

    const currentAdmin = c.get('user')
    await sql`
      INSERT INTO activity_log (user_id, action, details)
      VALUES (${currentAdmin.id}, 'admin_update_user', ${'Admin actualizó usuario ID: ' + id})
    `

    return c.json({ success: true, message: 'Usuario actualizado' })
  } catch (err) {
    console.error('[admin/users/:id PUT] Error:', err)
    return c.json({ error: 'Error al actualizar usuario' }, 500)
  }
})

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
admin.delete('/users/:id', async (c) => {
  try {
    const sql = getSql()
    const id = parseInt(c.req.param('id'))
    const currentAdmin = c.get('user')

    if (id === currentAdmin.id) {
      return c.json({ error: 'No puedes eliminar tu propia cuenta' }, 400)
    }

    const rows = await sql`SELECT username FROM users WHERE id = ${id}`
    if (rows.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    await sql`DELETE FROM users WHERE id = ${id}`

    await sql`
      INSERT INTO activity_log (user_id, action, details)
      VALUES (${currentAdmin.id}, 'admin_delete_user', ${'Eliminó usuario: ' + rows[0].username})
    `

    return c.json({ success: true, message: 'Usuario eliminado' })
  } catch (err) {
    console.error('[admin/users DELETE] Error:', err)
    return c.json({ error: 'Error al eliminar usuario' }, 500)
  }
})

// ─── POST /api/admin/users ───────────────────────────────────────────────────
admin.post('/users', async (c) => {
  try {
    const sql = getSql()
    const body = await c.req.json()
    const { username, email, password, full_name, institution = '', plan = 'free', is_admin = false } = body

    if (!username || !email || !password || !full_name) {
      return c.json({ error: 'Campos requeridos: username, email, password, full_name' }, 400)
    }

    const existing = await sql`SELECT id FROM users WHERE username = ${username} OR email = ${email} LIMIT 1`
    if (existing.length > 0) {
      return c.json({ error: 'El usuario o email ya existe' }, 409)
    }

    const hashedPassword = await hashPassword(password)
    const rows = await sql`
      INSERT INTO users (username, email, password, full_name, institution, plan, is_active, is_admin)
      VALUES (${username}, ${email}, ${hashedPassword}, ${full_name}, ${institution}, ${plan}, TRUE, ${is_admin})
      RETURNING id, username, email, full_name, plan, is_admin, created_at
    `

    const currentAdmin = c.get('user')
    await sql`
      INSERT INTO activity_log (user_id, action, details)
      VALUES (${currentAdmin.id}, 'admin_create_user', ${'Creó usuario: ' + username})
    `

    return c.json({ success: true, user: rows[0] }, 201)
  } catch (err) {
    console.error('[admin/users POST] Error:', err)
    return c.json({ error: 'Error al crear usuario' }, 500)
  }
})

// ─── GET /api/admin/projects ─────────────────────────────────────────────────
admin.get('/projects', async (c) => {
  try {
    const sql = getSql()
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    const rows = await sql`
      SELECT tp.id, tp.title, tp.normative, tp.status, tp.ai_provider, tp.created_at,
        u.username, u.email, u.full_name,
        COUNT(tc.id)::int AS chapter_count
      FROM thesis_projects tp
      JOIN users u ON u.id = tp.user_id
      LEFT JOIN thesis_chapters tc ON tc.project_id = tp.id
      GROUP BY tp.id, u.username, u.email, u.full_name
      ORDER BY tp.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `

    const countRows = await sql`SELECT COUNT(*)::int AS total FROM thesis_projects`

    return c.json({
      projects: rows,
      pagination: {
        total: Number(countRows[0].total),
        page, limit,
        pages: Math.ceil(Number(countRows[0].total) / limit)
      }
    })
  } catch (err) {
    console.error('[admin/projects] Error:', err)
    return c.json({ error: 'Error al obtener proyectos' }, 500)
  }
})

// ─── GET /api/admin/activity ─────────────────────────────────────────────────
admin.get('/activity', async (c) => {
  try {
    const sql = getSql()
    const limit = parseInt(c.req.query('limit') || '50')

    const rows = await sql`
      SELECT al.id, al.action, al.details, al.ip_address, al.created_at, u.username, u.email
      FROM activity_log al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT ${limit}
    `

    return c.json({ activity: rows })
  } catch (err) {
    console.error('[admin/activity] Error:', err)
    return c.json({ error: 'Error al obtener actividad' }, 500)
  }
})

// ─── GET /api/admin/config ───────────────────────────────────────────────────
admin.get('/config', async (c) => {
  try {
    const sql = getSql()
    const rows = await sql`SELECT key, value, description, updated_at FROM system_config ORDER BY key`
    return c.json({ config: rows })
  } catch (err) {
    console.error('[admin/config] Error:', err)
    return c.json({ error: 'Error al obtener configuración' }, 500)
  }
})

// ─── PUT /api/admin/config/:key ──────────────────────────────────────────────
admin.put('/config/:key', async (c) => {
  try {
    const sql = getSql()
    const key = c.req.param('key')
    const { value } = await c.req.json()

    if (value === undefined) {
      return c.json({ error: 'Valor requerido' }, 400)
    }

    await sql`
      INSERT INTO system_config (key, value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
    `

    return c.json({ success: true, message: 'Configuración actualizada' })
  } catch (err) {
    console.error('[admin/config PUT] Error:', err)
    return c.json({ error: 'Error al actualizar configuración' }, 500)
  }
})

export default admin
