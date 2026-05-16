import 'dotenv/config'
/**
 * ThesisForge AI - Script de Migración de Base de Datos
 * Ejecutar con: npx tsx scripts/migrate.ts
 * Requiere: POSTGRES_URL en variables de entorno
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@neondatabase/serverless'

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

  try {
    const migrationPath = join(__dirname, '..', 'migrations', '0001_init.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    const client = new Client(postgresUrl)
    
    try {
      await client.connect()
      console.log('📄 Ejecutando: migrations/0001_init.sql')
      await client.query(migrationSQL)
      await client.end()
      console.log('✅ Migración completada exitosamente.')
    } catch (err: unknown) {
      const error = err as Error
      console.error('❌ Error durante la ejecución del SQL:', error.message)
      try { await client.end() } catch {}
      throw error
    }

    console.log('\n🎉 Base de datos lista para ThesisForge AI v2.0')
    console.log('   Próximo paso: npx tsx scripts/seed.ts')

  } catch (err) {
    console.error('❌ Error fatal durante la migración:', err)
    process.exit(1)
  }
}

runMigration()
