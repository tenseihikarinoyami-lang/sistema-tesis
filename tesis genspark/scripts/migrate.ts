/**
 * ThesisForge AI - Script de Migración de Base de Datos
 * Ejecutar con: npx tsx scripts/migrate.ts
 * Requiere: POSTGRES_URL en variables de entorno
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function runMigration() {
  console.log('🚀 ThesisForge AI - Iniciando migración de base de datos...')
  console.log('📋 Platform: Neon PostgreSQL (Vercel)')

  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (!postgresUrl) {
    console.error('❌ Error: Variable de entorno POSTGRES_URL no configurada')
    console.error('   Ve a Vercel Dashboard → Storage → Create Database (Neon Postgres)')
    console.error('   Las variables se importan automáticamente en tu proyecto')
    process.exit(1)
  }

  const sql = neon(postgresUrl)

  try {
    const migrationPath = join(__dirname, '..', 'migrations', '0001_init.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Ejecutando: migrations/0001_init.sql')

    // Dividir el SQL en statements individuales
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let executed = 0
    let skipped = 0
    let errors = 0

    for (const statement of statements) {
      if (!statement.trim()) continue
      try {
        // Neon usa template literals, para SQL raw necesitamos el método query
        await sql.transaction(async (tx) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (tx as any).query(statement)
        })
        executed++
        console.log('  ✅ ' + statement.substring(0, 80).replace(/\s+/g, ' ') + '...')
      } catch (err: unknown) {
        const error = err as Error
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log('  ⏭️  Ya existe: ' + statement.substring(0, 60).replace(/\s+/g, ' ') + '...')
          skipped++
        } else {
          console.error('  ❌ Error:', error.message)
          errors++
        }
      }
    }

    console.log('\n✅ Migración completada:')
    console.log('   Ejecutados: ' + executed)
    console.log('   Saltados (ya existen): ' + skipped)
    console.log('   Errores: ' + errors)

    if (errors > 0) {
      console.warn('\n⚠️  Algunos statements fallaron. Revisa los errores arriba.')
    }

    console.log('\n🎉 Base de datos lista para ThesisForge AI v2.0')
    console.log('   Próximo paso: npx tsx scripts/seed.ts')

  } catch (err) {
    console.error('❌ Error fatal durante la migración:', err)
    process.exit(1)
  }
}

runMigration()
