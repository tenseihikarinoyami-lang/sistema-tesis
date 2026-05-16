/**
 * ThesisForge AI - Script de Datos Iniciales (Seed)
 * Ejecutar con: npx tsx scripts/seed.ts
 * Crea el usuario administrador con contraseña segura
 */
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
if (!DATABASE_URL) throw new Error('POSTGRES_URL no configurada')
const sql = neon(DATABASE_URL)

async function hashPassword(password: string): Promise<string> {
  const salt = process.env.PASSWORD_SALT || 'ThesisForge_Salt_2024'
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function runSeed() {
  console.log('🌱 ThesisForge AI - Iniciando seed de datos...')

  const postgresUrl = process.env.POSTGRES_URL
  if (!postgresUrl) {
    console.error('❌ Error: Variable de entorno POSTGRES_URL no configurada')
    process.exit(1)
  }

  try {
    // ── Admin User ──────────────────────────────────────────────────────────
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2024!'
    const adminHash = await hashPassword(adminPassword)

    console.log('👤 Creando/actualizando usuario administrador...')
    await sql`
      INSERT INTO users (username, email, password, full_name, institution, plan, is_active, is_admin)
      VALUES (
        'admin',
        'admin@thesisforge.ai',
        ${adminHash},
        'Administrador del Sistema',
        'ThesisForge AI',
        'admin',
        TRUE,
        TRUE
      )
      ON CONFLICT (username) DO UPDATE SET
        password = ${adminHash},
        is_admin = TRUE,
        is_active = TRUE,
        plan = 'admin',
        updated_at = NOW()
    `
    console.log('  ✅ Admin creado: admin / ' + adminPassword)

    // ── Demo User ───────────────────────────────────────────────────────────
    const demoPassword = 'Demo@2024!'
    const demoHash = await hashPassword(demoPassword)

    console.log('👤 Creando usuario demo...')
    await sql`
      INSERT INTO users (username, email, password, full_name, institution, plan, is_active, is_admin)
      VALUES (
        'demo',
        'demo@thesisforge.ai',
        ${demoHash},
        'Usuario Demo',
        'IUTA - Instituto Universitario de Tecnología',
        'premium',
        TRUE,
        FALSE
      )
      ON CONFLICT (username) DO NOTHING
    `
    console.log('  ✅ Demo creado: demo / ' + demoPassword)

    // ── Config del sistema ──────────────────────────────────────────────────
    console.log('⚙️  Configurando sistema...')
    const configs = [
      ['max_projects_free', '2', 'Máximo de proyectos para plan free'],
      ['max_projects_basic', '10', 'Máximo de proyectos para plan basic'],
      ['max_projects_premium', '999', 'Máximo de proyectos para plan premium'],
      ['app_version', '2.0.0', 'Versión de la aplicación'],
      ['maintenance_mode', 'false', 'Modo mantenimiento'],
      ['default_ai_provider', 'gemini', 'Proveedor de IA por defecto'],
      ['platform', 'vercel', 'Plataforma de deployment']
    ]

    for (const [key, value, description] of configs) {
      await sql`
        INSERT INTO system_config (key, value, description)
        VALUES (${key}, ${value}, ${description})
        ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
      `
    }
    console.log('  ✅ Configuración del sistema establecida')

    // ── Proyecto Demo ───────────────────────────────────────────────────────
    console.log('📄 Creando proyecto de tesis demo...')
    const { rows: demoUser } = await sql`SELECT id FROM users WHERE username = 'demo' LIMIT 1`
    
    if (demoUser.length > 0) {
      const userId = demoUser[0].id
      
      const { rows: existingProject } = await sql`
        SELECT id FROM thesis_projects WHERE user_id = ${userId} LIMIT 1
      `

      if (existingProject.length === 0) {
        const { rows: projectRows } = await sql`
          INSERT INTO thesis_projects
            (user_id, title, institution, normative, research_type, modality,
             general_objective, specific_objectives, justification, keywords,
             status, ai_provider, ai_model)
          VALUES
            (${userId},
             'Sistema de Gestión Académica Basado en Inteligencia Artificial para el IUTA',
             'Instituto Universitario de Tecnología Antonio Ricaurte (IUTA)',
             'IUTA',
             'cuantitativa',
             'Proyecto Especial de Grado',
             'Desarrollar un sistema de gestión académica basado en inteligencia artificial que automatice los procesos administrativos y mejore la experiencia educativa en el Instituto Universitario de Tecnología Antonio Ricaurte (IUTA).',
             '1. Diagnosticar la situación actual de los procesos académicos en el IUTA.
2. Diseñar la arquitectura del sistema de gestión con módulos de IA.
3. Implementar los componentes principales del sistema propuesto.
4. Evaluar el impacto del sistema en la eficiencia administrativa.',
             'La investigación se justifica por la necesidad imperante de modernizar los sistemas educativos venezolanos mediante el uso de tecnologías emergentes, específicamente la Inteligencia Artificial, para optimizar los procesos académicos y administrativos.',
             'inteligencia artificial, gestión académica, automatización, educación superior, Venezuela',
             'draft',
             'gemini',
             'gemini-1.5-flash')
          RETURNING id
        `

        if (projectRows.length > 0) {
          const projectId = projectRows[0].id
          const chapterTitles = [
            'El Problema',
            'Marco Teórico',
            'Marco Metodológico',
            'Análisis e Interpretación de Resultados',
            'Conclusiones y Recomendaciones'
          ]
          
          for (let i = 0; i < 5; i++) {
            await sql`
              INSERT INTO thesis_chapters (project_id, chapter_number, title, status)
              VALUES (${projectId}, ${i + 1}, ${chapterTitles[i]}, 'pending')
              ON CONFLICT (project_id, chapter_number) DO NOTHING
            `
          }
          console.log('  ✅ Proyecto demo creado con ID: ' + projectId)
        }
      } else {
        console.log('  ⏭️  Proyecto demo ya existe')
      }
    }

    console.log('\n🎉 Seed completado exitosamente!')
    console.log('\n📋 Credenciales de acceso:')
    console.log('   Admin:  admin / ' + adminPassword)
    console.log('   Demo:   demo  / Demo@2024!')
    console.log('\n🚀 La aplicación está lista para usar en Vercel')

  } catch (err) {
    console.error('❌ Error durante el seed:', err)
    process.exit(1)
  }
}

runSeed()
