/**
 * ThesisForge AI - Rutas de Tesis y Generación IA
 * Migrado de Cloudflare D1 → Neon PostgreSQL
 * Soporta: Gemini, Groq, OpenRouter, Cohere
 */
import { Hono } from 'hono'
import { getSql } from '../lib/db.js'
import { requireAuth } from '../lib/auth-middleware.js'
import type { ThesisProject, ThesisChapter } from '../lib/db.js'

const thesis = new Hono()
thesis.use('/*', requireAuth)

// ─── Límites por plan ────────────────────────────────────────────────────────
const PLAN_LIMITS: Record<string, number> = {
  free: 2, basic: 10, premium: 999, admin: 999
}

// ─── Sistema Multi-Proveedor de IA ───────────────────────────────────────────
interface AIMessage { role: 'user' | 'assistant' | 'system'; content: string }

async function callAI(provider: string, model: string, messages: AIMessage[], systemPrompt?: string): Promise<string> {
  const GEMINI_KEY    = process.env.GEMINI_API_KEY || ''
  const GROQ_KEY      = process.env.GROQ_API_KEY || ''
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || ''
  const COHERE_KEY    = process.env.COHERE_API_KEY || ''

  switch (provider.toLowerCase()) {
    // ── Gemini ──────────────────────────────────────────────────────────────
    case 'gemini': {
      const geminiModel = model || 'gemini-1.5-flash'
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
      if (systemPrompt) {
        contents.unshift({ role: 'user', parts: [{ text: systemPrompt }] })
      }
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 8192, topP: 0.9 } }) }
      )
      if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`)
      const data = await resp.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }
      return data.candidates[0]?.content?.parts[0]?.text || ''
    }

    // ── Groq ─────────────────────────────────────────────────────────────────
    case 'groq': {
      const groqModel = model || 'llama-3.1-70b-versatile'
      const msgs: Array<{ role: string; content: string }> = []
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt })
      msgs.push(...messages.map(m => ({ role: m.role, content: m.content })))
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: groqModel, messages: msgs, temperature: 0.7, max_tokens: 8192 })
      })
      if (!resp.ok) throw new Error(`Groq ${resp.status}: ${await resp.text()}`)
      const data = await resp.json() as { choices: Array<{ message: { content: string } }> }
      return data.choices[0]?.message?.content || ''
    }

    // ── OpenRouter ───────────────────────────────────────────────────────────
    case 'openrouter': {
      const orModel = model || 'meta-llama/llama-3.1-70b-instruct'
      const msgs: Array<{ role: string; content: string }> = []
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt })
      msgs.push(...messages.map(m => ({ role: m.role, content: m.content })))
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'https://thesisforge.ai',
          'X-Title': 'ThesisForge AI'
        },
        body: JSON.stringify({ model: orModel, messages: msgs, temperature: 0.7, max_tokens: 8192 })
      })
      if (!resp.ok) throw new Error(`OpenRouter ${resp.status}: ${await resp.text()}`)
      const data = await resp.json() as { choices: Array<{ message: { content: string } }> }
      return data.choices[0]?.message?.content || ''
    }

    // ── Cohere ───────────────────────────────────────────────────────────────
    case 'cohere': {
      const cohereModel = model || 'command-r-plus'
      const chatHistory = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'USER' : 'CHATBOT',
        message: m.content
      }))
      const lastMsg = messages[messages.length - 1]
      const resp = await fetch('https://api.cohere.com/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${COHERE_KEY}` },
        body: JSON.stringify({ model: cohereModel, message: lastMsg?.content || '', chat_history: chatHistory, preamble: systemPrompt || '', temperature: 0.7, max_tokens: 4096 })
      })
      if (!resp.ok) throw new Error(`Cohere ${resp.status}: ${await resp.text()}`)
      const data = await resp.json() as { text: string }
      return data.text || ''
    }

    default:
      throw new Error(`Proveedor de IA no soportado: ${provider}`)
  }
}

// ─── Prompts por capítulo ────────────────────────────────────────────────────
function buildSystemPrompt(project: ThesisProject): string {
  return `Eres un experto académico venezolano especializado en tesis y trabajos de investigación.
Genera contenido académico riguroso, formal y en español, siguiendo las normas ${project.normative}.

DATOS DEL PROYECTO:
- Título: ${project.title}
- Institución: ${project.institution || 'No especificada'}
- Normativa: ${project.normative}
- Tipo de investigación: ${project.research_type}
- Modalidad: ${project.modality}
- Objetivo general: ${project.general_objective}
- Objetivos específicos: ${project.specific_objectives}
- Justificación: ${project.justification}
- Palabras clave: ${project.keywords}

INSTRUCCIONES IMPORTANTES:
1. Contenido académico, formal, en español universitario venezolano
2. Mínimo 800 palabras por sección
3. Subtítulos claros con numeración (1.1, 1.2, etc.)
4. Texto plano sin markdown con asteriscos
5. Coherente con los objetivos definidos
6. Citas APA 7 donde corresponda`
}

const CHAPTER_PROMPTS: Record<number, (p: ThesisProject) => string> = {
  1: (p) => `Genera el CAPÍTULO I: EL PROBLEMA para la tesis "${p.title}".
Secciones requeridas (contenido extenso, mínimo 800 palabras cada una):
1.1 Planteamiento del Problema (contexto internacional, nacional y local, síntomas del problema)
1.2 Formulación del Problema (pregunta central de investigación)
1.3 Objetivos de la Investigación (Objetivo General y Específicos)
1.4 Justificación e Importancia (perspectivas teórica, práctica y metodológica)
1.5 Delimitación de la Investigación (espacial, temporal y temática)
1.6 Limitaciones de la Investigación`,

  2: (p) => `Genera el CAPÍTULO II: MARCO TEÓRICO para la tesis "${p.title}".
Secciones requeridas:
2.1 Antecedentes de la Investigación (6-8 estudios previos nacionales e internacionales con citas APA 7)
2.2 Bases Teóricas (teorías y modelos que sustentan la investigación, mínimo 1500 palabras)
2.3 Bases Legales (legislación venezolana aplicable: Constitución, Leyes Orgánicas, Decretos)
2.4 Definición de Términos Básicos (glosario alfabético de 10-15 conceptos clave)
2.5 Sistema de Variables o Categorías de Análisis`,

  3: (p) => `Genera el CAPÍTULO III: MARCO METODOLÓGICO para la tesis "${p.title}".
Investigación ${p.research_type}, modalidad: ${p.modality}.
Secciones requeridas:
3.1 Naturaleza y Paradigma de la Investigación
3.2 Tipo de Investigación (con justificación amplia)
3.3 Diseño de la Investigación
3.4 Modalidad de Investigación: ${p.modality}
3.5 Población y Muestra (definición, criterios, técnica de muestreo, cálculo)
3.6 Técnicas e Instrumentos de Recolección de Datos
3.7 Validez y Confiabilidad de los Instrumentos
3.8 Técnicas de Procesamiento y Análisis de Datos
3.9 Procedimiento de la Investigación (fases detalladas)`,

  4: (p) => `Genera el CAPÍTULO IV: ANÁLISIS E INTERPRETACIÓN DE RESULTADOS para la tesis "${p.title}".
Objetivo general: ${p.general_objective}
Secciones requeridas:
4.1 Presentación de Resultados (análisis por objetivo específico)
4.2 Interpretación y Discusión de los Resultados (relacionando con el marco teórico)
4.3 Análisis Comparativo con Estudios Previos
4.4 Hallazgos Significativos
4.5 Propuesta (si aplica para la modalidad ${p.modality})`,

  5: (p) => `Genera el CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES para la tesis "${p.title}".
Objetivos específicos: ${p.specific_objectives}
Secciones requeridas:
5.1 Conclusiones (una conclusión por cada objetivo específico + conclusión general)
5.2 Recomendaciones (a la institución, a futuros investigadores, a la comunidad académica)
5.3 Líneas Futuras de Investigación
5.4 Reflexión Final sobre el aporte académico de la investigación`
}

// ─── CRUD Proyectos ──────────────────────────────────────────────────────────

thesis.get('/projects', async (c) => {
  try {
    const user = c.get('user')
    const sql = getSql()
    const rows = await sql`
      SELECT tp.*,
        COUNT(tc.id)::int AS chapter_count,
        COUNT(tc.id) FILTER (WHERE tc.status = 'completed')::int AS completed_chapters
      FROM thesis_projects tp
      LEFT JOIN thesis_chapters tc ON tc.project_id = tp.id
      WHERE tp.user_id = ${user.id}
      GROUP BY tp.id
      ORDER BY tp.updated_at DESC
    `
    return c.json({ projects: rows })
  } catch (err) {
    console.error('[thesis/projects GET]', err)
    return c.json({ error: 'Error al obtener proyectos' }, 500)
  }
})

thesis.post('/projects', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const sql = getSql()

    const maxProjects = PLAN_LIMITS[user.plan] ?? 2
    const countRows = await sql`SELECT COUNT(*)::int AS total FROM thesis_projects WHERE user_id = ${user.id}`
    if (Number(countRows[0].total) >= maxProjects) {
      return c.json({ error: `Límite de ${maxProjects} proyectos para el plan ${user.plan}. Actualiza tu plan.` }, 403)
    }

    const {
      title, institution = '', normative = 'APA7', research_type = 'cuantitativa',
      modality = '', general_objective = '', specific_objectives = '',
      justification = '', keywords = '', ai_provider = 'gemini', ai_model = 'gemini-1.5-flash'
    } = body

    if (!title || title.trim().length < 10) {
      return c.json({ error: 'El título debe tener al menos 10 caracteres' }, 400)
    }

    const rows = await sql`
      INSERT INTO thesis_projects
        (user_id, title, institution, normative, research_type, modality,
         general_objective, specific_objectives, justification, keywords, status, ai_provider, ai_model)
      VALUES
        (${user.id}, ${title.trim()}, ${institution}, ${normative}, ${research_type},
         ${modality}, ${general_objective}, ${specific_objectives}, ${justification},
         ${keywords}, 'draft', ${ai_provider}, ${ai_model})
      RETURNING *
    `

    const project = rows[0] as ThesisProject
    const chapterTitles = ['El Problema', 'Marco Teórico', 'Marco Metodológico', 'Análisis e Interpretación de Resultados', 'Conclusiones y Recomendaciones']

    for (let i = 0; i < 5; i++) {
      await sql`
        INSERT INTO thesis_chapters (project_id, chapter_number, title, status)
        VALUES (${project.id}, ${i + 1}, ${chapterTitles[i]}, 'pending')
        ON CONFLICT (project_id, chapter_number) DO NOTHING
      `
    }

    await sql`
      INSERT INTO activity_log (user_id, action, details)
      VALUES (${user.id}, 'create_project', ${'Proyecto creado: ' + title})
    `

    return c.json({ success: true, project }, 201)
  } catch (err) {
    console.error('[thesis/projects POST]', err)
    return c.json({ error: 'Error al crear proyecto' }, 500)
  }
})

thesis.get('/projects/:id', async (c) => {
  try {
    const user = c.get('user')
    const id = parseInt(c.req.param('id'))
    const sql = getSql()

    const projectRows = await sql`
      SELECT * FROM thesis_projects
      WHERE id = ${id} AND (user_id = ${user.id} OR ${user.is_admin} = TRUE)
    `
    if (projectRows.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    const [chapterRows, citationRows] = await Promise.all([
      sql`SELECT * FROM thesis_chapters WHERE project_id = ${id} ORDER BY chapter_number ASC`,
      sql`SELECT * FROM citations WHERE project_id = ${id} ORDER BY authors ASC`
    ])

    return c.json({ project: projectRows[0], chapters: chapterRows, citations: citationRows })
  } catch (err) {
    console.error('[thesis/projects/:id GET]', err)
    return c.json({ error: 'Error al obtener proyecto' }, 500)
  }
})

thesis.put('/projects/:id', async (c) => {
  try {
    const user = c.get('user')
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const sql = getSql()

    const existing = await sql`SELECT id FROM thesis_projects WHERE id = ${id} AND user_id = ${user.id}`
    if (existing.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    const { title, institution, normative, research_type, modality,
      general_objective, specific_objectives, justification, keywords, ai_provider, ai_model } = body

    await sql`
      UPDATE thesis_projects SET
        title               = COALESCE(${title ?? null}, title),
        institution         = COALESCE(${institution ?? null}, institution),
        normative           = COALESCE(${normative ?? null}, normative),
        research_type       = COALESCE(${research_type ?? null}, research_type),
        modality            = COALESCE(${modality ?? null}, modality),
        general_objective   = COALESCE(${general_objective ?? null}, general_objective),
        specific_objectives = COALESCE(${specific_objectives ?? null}, specific_objectives),
        justification       = COALESCE(${justification ?? null}, justification),
        keywords            = COALESCE(${keywords ?? null}, keywords),
        ai_provider         = COALESCE(${ai_provider ?? null}, ai_provider),
        ai_model            = COALESCE(${ai_model ?? null}, ai_model),
        updated_at          = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
    `
    return c.json({ success: true, message: 'Proyecto actualizado' })
  } catch (err) {
    console.error('[thesis/projects/:id PUT]', err)
    return c.json({ error: 'Error al actualizar proyecto' }, 500)
  }
})

thesis.delete('/projects/:id', async (c) => {
  try {
    const user = c.get('user')
    const id = parseInt(c.req.param('id'))
    const sql = getSql()

    const rows = await sql`SELECT title FROM thesis_projects WHERE id = ${id} AND user_id = ${user.id}`
    if (rows.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    await sql`DELETE FROM thesis_projects WHERE id = ${id} AND user_id = ${user.id}`
    await sql`INSERT INTO activity_log (user_id, action, details) VALUES (${user.id}, 'delete_project', ${'Eliminado: ' + rows[0].title})`

    return c.json({ success: true, message: 'Proyecto eliminado' })
  } catch (err) {
    console.error('[thesis/projects DELETE]', err)
    return c.json({ error: 'Error al eliminar proyecto' }, 500)
  }
})

// ─── Generación de Capítulos ─────────────────────────────────────────────────
thesis.post('/projects/:id/generate/:chapter', async (c) => {
  try {
    const user = c.get('user')
    const projectId = parseInt(c.req.param('id'))
    const chapterNum = parseInt(c.req.param('chapter'))
    const sql = getSql()

    if (chapterNum < 1 || chapterNum > 5) return c.json({ error: 'Capítulo inválido (1-5)' }, 400)

    const projectRows = await sql`
      SELECT * FROM thesis_projects WHERE id = ${projectId} AND user_id = ${user.id}
    `
    if (projectRows.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    const project = projectRows[0] as ThesisProject

    if (!project.general_objective || project.general_objective.trim().length < 10) {
      return c.json({ error: 'Define el objetivo general antes de generar capítulos' }, 400)
    }

    // Marcar como generando
    await sql`
      UPDATE thesis_chapters SET status = 'generating', updated_at = NOW()
      WHERE project_id = ${projectId} AND chapter_number = ${chapterNum}
    `
    await sql`UPDATE thesis_projects SET status = 'in_progress', updated_at = NOW() WHERE id = ${projectId}`

    const systemPrompt = buildSystemPrompt(project)
    const chapterPromptFn = CHAPTER_PROMPTS[chapterNum]
    if (!chapterPromptFn) return c.json({ error: 'Capítulo no soportado' }, 400)

    let content = ''
    try {
      content = await callAI(
        project.ai_provider, project.ai_model,
        [{ role: 'user', content: chapterPromptFn(project) }],
        systemPrompt
      )
    } catch (aiError) {
      await sql`
        UPDATE thesis_chapters SET status = 'error', updated_at = NOW()
        WHERE project_id = ${projectId} AND chapter_number = ${chapterNum}
      `
      console.error('[thesis/generate] AI Error:', aiError)
      return c.json({ error: `Error IA: ${String(aiError)}` }, 502)
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length
    const chapterTitles: Record<number, string> = {
      1: 'El Problema', 2: 'Marco Teórico', 3: 'Marco Metodológico',
      4: 'Análisis e Interpretación de Resultados', 5: 'Conclusiones y Recomendaciones'
    }

    await sql`
      UPDATE thesis_chapters SET
        title = ${'Capítulo ' + chapterNum + ': ' + chapterTitles[chapterNum]},
        content = ${content}, word_count = ${wordCount},
        status = 'completed', generated_at = NOW(), updated_at = NOW()
      WHERE project_id = ${projectId} AND chapter_number = ${chapterNum}
    `

    // Verificar si todos los capítulos están completos
    const statusRows = await sql`
      SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
      FROM thesis_chapters WHERE project_id = ${projectId}
    `

    if (Number(statusRows[0].completed) === Number(statusRows[0].total)) {
      await sql`UPDATE thesis_projects SET status = 'completed', updated_at = NOW() WHERE id = ${projectId}`
    }

    await sql`
      INSERT INTO activity_log (user_id, action, details)
      VALUES (${user.id}, 'generate_chapter',
        ${'Capítulo ' + chapterNum + ' con ' + project.ai_provider + ' (' + wordCount + ' palabras)'})
    `

    return c.json({
      success: true,
      chapter: {
        chapter_number: chapterNum,
        title: `Capítulo ${chapterNum}: ${chapterTitles[chapterNum]}`,
        content, word_count: wordCount, status: 'completed'
      }
    })
  } catch (err) {
    console.error('[thesis/generate]', err)
    return c.json({ error: 'Error al generar capítulo' }, 500)
  }
})

// ─── Capítulos ───────────────────────────────────────────────────────────────
thesis.get('/projects/:id/chapters/:chapter', async (c) => {
  try {
    const user = c.get('user')
    const projectId = parseInt(c.req.param('id'))
    const chapterNum = parseInt(c.req.param('chapter'))
    const sql = getSql()

    const proj = await sql`SELECT id FROM thesis_projects WHERE id = ${projectId} AND user_id = ${user.id}`
    if (proj.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    const rows = await sql`
      SELECT * FROM thesis_chapters WHERE project_id = ${projectId} AND chapter_number = ${chapterNum}
    `
    if (rows.length === 0) return c.json({ error: 'Capítulo no encontrado' }, 404)

    return c.json({ chapter: rows[0] })
  } catch (err) {
    console.error('[thesis/chapters GET]', err)
    return c.json({ error: 'Error al obtener capítulo' }, 500)
  }
})

thesis.put('/projects/:id/chapters/:chapter', async (c) => {
  try {
    const user = c.get('user')
    const projectId = parseInt(c.req.param('id'))
    const chapterNum = parseInt(c.req.param('chapter'))
    const { content } = await c.req.json()
    const sql = getSql()

    if (!content) return c.json({ error: 'Contenido requerido' }, 400)

    const proj = await sql`SELECT id FROM thesis_projects WHERE id = ${projectId} AND user_id = ${user.id}`
    if (proj.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    const wordCount = content.split(/\s+/).filter(Boolean).length
    await sql`
      UPDATE thesis_chapters SET content = ${content}, word_count = ${wordCount}, updated_at = NOW()
      WHERE project_id = ${projectId} AND chapter_number = ${chapterNum}
    `

    return c.json({ success: true, word_count: wordCount })
  } catch (err) {
    console.error('[thesis/chapters PUT]', err)
    return c.json({ error: 'Error al actualizar capítulo' }, 500)
  }
})

// ─── Citas ───────────────────────────────────────────────────────────────────
thesis.get('/projects/:id/citations', async (c) => {
  try {
    const user = c.get('user')
    const projectId = parseInt(c.req.param('id'))
    const sql = getSql()

    const proj = await sql`SELECT id FROM thesis_projects WHERE id = ${projectId} AND user_id = ${user.id}`
    if (proj.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    const rows = await sql`SELECT * FROM citations WHERE project_id = ${projectId} ORDER BY authors ASC`
    return c.json({ citations: rows })
  } catch (err) {
    console.error('[thesis/citations GET]', err)
    return c.json({ error: 'Error al obtener citas' }, 500)
  }
})

thesis.post('/projects/:id/citations', async (c) => {
  try {
    const user = c.get('user')
    const projectId = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const sql = getSql()

    const proj = await sql`SELECT id FROM thesis_projects WHERE id = ${projectId} AND user_id = ${user.id}`
    if (proj.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    const { authors, title, year, source = '', url = '', doi = '', citation_type = 'article', apa_format = '' } = body
    if (!authors || !title) return c.json({ error: 'Autores y título son requeridos' }, 400)

    const autoApa = apa_format || generateAPAFormat({ authors, title, year, source, url, doi, citation_type })

    const rows = await sql`
      INSERT INTO citations (project_id, authors, title, year, source, url, doi, citation_type, apa_format)
      VALUES (${projectId}, ${authors}, ${title}, ${year || null}, ${source}, ${url}, ${doi}, ${citation_type}, ${autoApa})
      RETURNING *
    `
    return c.json({ success: true, citation: rows[0] }, 201)
  } catch (err) {
    console.error('[thesis/citations POST]', err)
    return c.json({ error: 'Error al agregar cita' }, 500)
  }
})

thesis.delete('/projects/:id/citations/:citationId', async (c) => {
  try {
    const user = c.get('user')
    const projectId = parseInt(c.req.param('id'))
    const citationId = parseInt(c.req.param('citationId'))
    const sql = getSql()

    const proj = await sql`SELECT id FROM thesis_projects WHERE id = ${projectId} AND user_id = ${user.id}`
    if (proj.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    await sql`DELETE FROM citations WHERE id = ${citationId} AND project_id = ${projectId}`
    return c.json({ success: true })
  } catch (err) {
    console.error('[thesis/citations DELETE]', err)
    return c.json({ error: 'Error al eliminar cita' }, 500)
  }
})

// ─── Búsqueda de Citas con IA ────────────────────────────────────────────────
thesis.post('/search-citations', async (c) => {
  try {
    const user = c.get('user')
    const { query, project_id } = await c.req.json()

    if (!query || query.trim().length < 3) {
      return c.json({ error: 'La consulta debe tener al menos 3 caracteres' }, 400)
    }

    let aiProvider = 'gemini'
    let aiModel = 'gemini-1.5-flash'

    if (project_id) {
      const sql = getSql()
      const rows = await sql`
        SELECT ai_provider, ai_model FROM thesis_projects WHERE id = ${project_id} AND user_id = ${user.id}
      `
      if (rows.length > 0) {
        aiProvider = rows[0].ai_provider as string
        aiModel = rows[0].ai_model as string
      }
    }

    const systemPrompt = `Eres un experto en bibliografía académica venezolana con normas APA 7.
Genera 5 referencias bibliográficas académicas PLAUSIBLES en formato APA 7.
RESPONDE ÚNICAMENTE con JSON válido, sin texto adicional:
{"citations":[{"authors":"Apellido, N. y Apellido2, N.","title":"Título del trabajo","year":2022,"source":"Nombre Revista","url":"","doi":"10.xxxx/xxxxx","citation_type":"article","apa_format":"Referencia completa APA 7"}]}`

    const content = await callAI(aiProvider, aiModel,
      [{ role: 'user', content: `Genera 5 referencias APA 7 sobre: ${query}` }],
      systemPrompt
    )

    let citations = []
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        citations = parsed.citations || []
      }
    } catch { citations = [] }

    return c.json({ citations })
  } catch (err) {
    console.error('[thesis/search-citations]', err)
    return c.json({ error: 'Error al buscar citas' }, 500)
  }
})

// ─── Exportación HTML ────────────────────────────────────────────────────────
thesis.get('/projects/:id/export/html', async (c) => {
  try {
    const user = c.get('user')
    const projectId = parseInt(c.req.param('id'))
    const sql = getSql()

    const projectRows = await sql`SELECT * FROM thesis_projects WHERE id = ${projectId} AND user_id = ${user.id}`
    if (projectRows.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404)

    const project = projectRows[0] as ThesisProject

    const [chapters, citations] = await Promise.all([
      sql`SELECT * FROM thesis_chapters WHERE project_id = ${projectId} AND status = 'completed' ORDER BY chapter_number ASC`,
      sql`SELECT * FROM citations WHERE project_id = ${projectId} ORDER BY authors ASC`
    ])

    const html = generateHTMLExport(project, chapters as ThesisChapter[], citations as Array<{ apa_format: string; authors: string; title: string }>)

    await sql`
      INSERT INTO activity_log (user_id, action, details)
      VALUES (${user.id}, 'export_html', ${'Exportado: ' + project.title})
    `

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="tesis_${projectId}.html"`
      }
    })
  } catch (err) {
    console.error('[thesis/export/html]', err)
    return c.json({ error: 'Error al exportar' }, 500)
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateAPAFormat(data: { authors: string; title: string; year?: number; source?: string; url?: string; doi?: string; citation_type: string }): string {
  const year = data.year ? `(${data.year})` : '(s.f.)'
  switch (data.citation_type) {
    case 'book':
      return `${data.authors} ${year}. *${data.title}*. ${data.source || 'Editorial'}.`
    case 'website':
      return `${data.authors} ${year}. ${data.title}. ${data.url || ''}`
    default:
      return `${data.authors} ${year}. ${data.title}. *${data.source || 'Revista Académica'}*. ${data.doi ? `https://doi.org/${data.doi}` : ''}`
  }
}

function generateHTMLExport(project: ThesisProject, chapters: ThesisChapter[], citations: Array<{ apa_format: string; authors: string; title: string }>): string {
  const chaptersHTML = chapters.map(ch => `
    <section class="chapter" id="cap-${ch.chapter_number}">
      <h2>${ch.title}</h2>
      ${ch.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n')}
    </section>`).join('\n')

  const citationsHTML = citations.length > 0 ? `
    <section class="references">
      <h2>REFERENCIAS BIBLIOGRÁFICAS</h2>
      <ul>${citations.map(c => `<li>${c.apa_format || `${c.authors}. ${c.title}.`}</li>`).join('\n')}</ul>
    </section>` : ''

  const date = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${project.title}</title>
  <style>
    body{font-family:'Times New Roman',serif;font-size:12pt;line-height:2;margin:0;padding:0;color:#000}
    .cover{text-align:center;padding:80px 40px;page-break-after:always}
    .cover h1{font-size:16pt;font-weight:bold;margin:40px 0}
    .chapter{padding:40px;page-break-before:always}
    .chapter h2{font-size:14pt;font-weight:bold;text-align:center;text-transform:uppercase;margin-bottom:30px}
    p{margin:0 0 12pt 0;text-indent:1.27cm;text-align:justify}
    .references{padding:40px;page-break-before:always}
    .references h2{font-size:14pt;font-weight:bold;text-align:center;text-transform:uppercase}
    .references ul{list-style:none;padding:0}
    .references li{margin-bottom:12pt;text-indent:-1.27cm;padding-left:1.27cm}
    @media print{body{margin:2.54cm}}
  </style>
</head>
<body>
  <div class="cover">
    <p>REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
    <p>${project.institution || 'INSTITUCIÓN UNIVERSITARIA'}</p>
    <br><br>
    <h1>${project.title.toUpperCase()}</h1>
    <br><br>
    <p>Normativa: ${project.normative} &nbsp;·&nbsp; Tipo: ${project.research_type}</p>
    <br><br>
    <p>${date}</p>
  </div>
  ${chaptersHTML}
  ${citationsHTML}
</body>
</html>`
}

export default thesis
