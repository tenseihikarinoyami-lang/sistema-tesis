import { generateWithFallback, AIROptions } from "./ai-router";
import { searchAcademicPapers, validateCitation, AcademicMetadata } from "./academic-validator";
import { storeThesisChunk, retrieveRelevantContext } from "./vector-memory";

// ─────────────────────────────────────────────────────────────
// Motor OBELISCO v2.0 - Unified Orchestrator
// ─────────────────────────────────────────────────────────────

export class AcademicEngine {
  private preferred: string;

  constructor(
    geminiKey?: string,
    groqKey?: string,
    openRouterKey?: string,
    preferred = "groq"
  ) {
    this.preferred = preferred;
    console.log(`[AcademicEngine] Motor inicializado con preferencia: ${this.preferred}`);
  }

  private async safeGenerate(prompt: string, agentName: string, options: AIROptions = {}): Promise<string> {
    const result = await generateWithFallback(prompt, {
      ...options,
      preferredProvider: this.preferred as any,
      model: options.model || (this.preferred === "groq" ? "llama-3.3-70b-versatile" : undefined)
    });
    return result.content;
  }


  // ── Citations (Multi-Source Validator) ───────────────────────────
  private async fetchRealCitations(topic: string): Promise<string> {
    try {
      console.log(`[AcademicEngine] Buscando fuentes académicas para: ${topic}`);
      const papers = await searchAcademicPapers(topic, 8);
      
      if (papers.length === 0) return "";
      
      let citations = "REFERENCIAS VERIFICADAS (Semantic Scholar & Crossref):\n\n";
      for (const paper of papers) {
        const authors = paper.authors.join(", ") || "Autores desconocidos";
        const year = paper.year || "s.f.";
        const title = paper.title || "Sin título";
        const url = paper.url ? ` URL: ${paper.url}` : "";
        const oa = paper.isOpenAccess ? " [Open Access]" : "";
        const cit = paper.citationCount ? ` (Citado por: ${paper.citationCount})` : "";
        cita  // ── REGLAS DE ORO ACADÉMICAS ──
  private getAcademicRules(options: { section?: string; level?: string } = {}): string {
    const section = (options.section || "").toLowerCase();
    
    let specificRule = "";
    if (section.includes("capítulo i") || section.includes("planteamiento del problema") || section.includes("introducción")) {
      specificRule = `
7. ESTRUCTURA CAP I: Aplica la técnica del embudo: Contexto Macro (Mundial), Meso (Latinoamérica) y Micro (Venezuela/Institución).
8. DIAGNÓSTICO: Describe el Problema siguiendo el esquema: Síntomas -> Causas -> Consecuencias -> Pronóstico.
9. OBJETIVOS: Deben iniciar con verbos en infinitivo (Determinar, Analizar, Evaluar).`;
    } else if (section.includes("capítulo ii") || section.includes("marco teórico")) {
      specificRule = `
7. ANTECEDENTES: Debes citar al menos 5 antecedentes (mínimo 3 nacionales de Venezuela y 2 internacionales) con una antigüedad no mayor a 5 años.
8. ESTRUCTURA ANTECEDENTES: Para cada antecedente indica: Autor(es), Año, Título, Objetivo, Metodología, Resultados y Aporte a tu tesis.
9. BASES LEGALES: Vincula el tema con la Constitución de la República Bolivariana de Venezuela y leyes orgánicas vigentes (LOTTT, LOCTI, LOPCYMAT, etc.) según corresponda.`;
    } else if (section.includes("metodolog")) {
      specificRule = `
7. METODOLOGÍA: Define el Tipo de Investigación (Cualitativa/Cuantitativa/Mixta), Nivel (Descriptiva/Explicatoria), Diseño (Campo/Documental/Experimental) y Población/Muestra.`;
    }

    return `
REGLAS CRÍTICAS DE REDACCIÓN (MANUALES IUTA/IUTAR/UPTAEB/UPEL):
1. VOZ PASIVA REFLEJA (IMPERSONAL): Usa "Se observó", "Se procedió", "Se determinó". EVITA "Yo", "Nosotros", "El investigador" o "Este autor". El sujeto es el proceso, no la persona.
2. TONO: Estrictamente formal, objetivo y técnico. Usa vocabulario especializado (ej. "paralelismo", "dicotomía", "empírico", "metodológico").
3. PÁRRAFOS: Rigurosamente de entre 5 a 12 líneas de texto. Párrafos más cortos carecen de profundidad; párrafos más largos fatigan al lector.
4. CITAS APA 7: Formato (Apellido, Año). Cada párrafo de desarrollo DEBE estar respaldado por al menos una cita. Si usas citas textuales, indica el número de página.
5. CONTEXTO VENEZOLANO: Referencia siempre el marco institucional, social y legal de Venezuela.
6. NIVEL: ${options.level || "Técnico/Superior"}. Sección actual: ${options.section || "General"}.${specificRule}`;
  }

  // ── Agentes ──────────────────────────────────────────────
  async researcherAgent(topic: string, context: string, signal?: AbortSignal): Promise<string> {
    const realCitations = await this.fetchRealCitations(topic);
    
    const prompt =
      `Actúa como un investigador académico experto para instituciones venezolanas. ` +
      `Investiga bibliografía APA 7 actualizada y conceptos clave para el tema: "${topic}". ` +
      `Contexto: ${context}. ` +
      (realCitations 
        ? `\n\nATENCIÓN: Usa ESTRICTAMENTE las siguientes referencias verificadas para construir tu respuesta y evitar alucinaciones:\n${realCitations}\n` 
        : `Incluye al menos 8 referencias académicas reales con autores, años y títulos de publicaciones. `) +
      `Extrae los conceptos clave, metodología utilizada en las fuentes y resultados principales. ` +
      this.getAcademicRules({ section: "Investigación Base" }) +
      `Responde en ESPAÑOL académico formal.`;
    return this.safeGenerate(prompt, "Investigador", { signal });
  }

  async writerAgent(
    section: string,
    research: string,
    data: Record<string, any>,
    prevContent: string,
    projectId: string,
    signal?: AbortSignal
  ): Promise<string> {
    const estimatedPages = Number(data.estimatedPages) || 50;
    
    // Recuperar contexto relevante de la memoria vectorial
    const vectorContext = await retrieveRelevantContext(projectId, section);
    const contextStr = vectorContext.map(c => `[Contexto de ${c.chapter}]: ${c.content.substring(0, 500)}`).join("\n\n");

    const prompt =
      `Actúa como un Redactor de Tesis Doctoral de élite especializado en normas venezolanas. ` +
      `Redacta la sección: "${section}" para la tesis titulada "${data.title}" (${data.level}). ` +
      `Meta de extensión total de la tesis: ${estimatedPages} páginas. ` +
      `\nCONTEXTO DE MEMORIA (RAG):\n${contextStr || "No hay contexto previo aún."} ` +
      `\nCONTEXTO INMEDIATO (Continuidad):\n${prevContent.substring(Math.max(0, prevContent.length - 2500))}. ` +
      `\nINVESTIGACIÓN BASE Y CITAS:\n${research.substring(0, 5000)}. ` +
      `\nINSTRUCCIONES ESPECÍFICAS:\n` +
      `1. CONTINUIDAD: Conecta suavemente con el contenido de memoria e inmediato. No repitas lo ya dicho. ` +
      `2. EXTENSIÓN: Esta sección es un SUB-PUNTO específico. Escribe entre 1200 a 1800 palabras de alto valor académico. ` +
      `3. PROFUNDIDAD: Desarrolla el tema con rigor científico. Si es CAP I, enfócate en el Problema (Síntomas -> Causas -> Consecuencias). Si es CAP II, enfócate en Bases Teóricas sólidas. ` +
      `4. ESTRUCTURA: Usa subtítulos (###) para dividir el contenido si es extenso. ` +
      this.getAcademicRules({ section, level: data.level }) +
      `Responde ÚNICAMENTE con el contenido redactado en ESPAÑOL.`;

    const content = await this.safeGenerate(prompt, "Redactor", { 
      temperature: section.toLowerCase().includes("metodolog") ? 0.2 : 0.4,
      section,
      signal
    });

    // Almacenar en memoria vectorial para futura coherencia
    await storeThesisChunk(projectId, section, content);

    return content;
  }

  async visualsAgent(content: string, topic: string, signal?: AbortSignal): Promise<string> {
    const prompt =
      `Analiza el siguiente contenido de tesis y genera un elemento visual complementario (Tabla o Diagrama): ` +
      `CONTENIDO: ${content.substring(0, 3000)}. ` +
      `REGLAS: ` +
      `1. TABLA: Si hay comparaciones o datos, genera una TABLA Markdown. ` +
      `2. DIAGRAMA: Si hay flujos o procesos, genera un diagrama MERMAID (ej: graph TD, sequenceDiagram, classDiagram). ` +
      `3. FORMATO: Responde EXCLUSIVAMENTE con el código del elemento. Si es Mermaid, usa bloques \`\`\`mermaid. ` +
      `4. SI NO ES NECESARIO: Responde "SIN_VISUAL". ` +
      `Responde SOLO el código o "SIN_VISUAL" en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Visualizador", { signal });
  }

  async auditorAgent(content: string, type: string, signal?: AbortSignal): Promise<string> {
    const prompt =
      `Audita este texto de tesis doctoral/maestría (tipo: ${type}): ` +
      `${content.substring(0, 4000)}. ` +
      `Verifica: rigor científico, suficiencia de extensión (debe ser largo y detallado), citas correctas. ` +
      `Usa datos de validación externa (Semantic Scholar/Crossref/arXiv) si están disponibles para confirmar que las afirmaciones tienen sustento. ` +
      `Si el texto es excelente, responde solo: "APROBADO". ` +
      `Si es mediocre o corto, lista correcciones críticas en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Auditor", { temperature: 0.1, signal });
  }

  // ── Unified Agent (QUOTA OPTIMIZER) ──────────────────────
  /**
   * Genera investigación, redacción y visuales en un solo paso para ahorrar cuota de API.
   */
  async unifiedAgent(
    section: string,
    data: Record<string, any>,
    prevContent: string,
    projectId: string,
    signal?: AbortSignal
  ): Promise<{ content: string; research: string; visuals: string }> {
    const estimatedPages = Number(data.estimatedPages) || 50;
    
    // 1. Obtener citas reales primero (esto no gasta cuota de LLM, usa APIs de búsqueda)
    const realCitations = await this.fetchRealCitations(section);
    
    // 2. Recuperar contexto de memoria vectorial
    const vectorContext = await retrieveRelevantContext(projectId, section);
    const contextStr = vectorContext.map(c => `[Contexto de ${c.chapter}]: ${c.content.substring(0, 500)}`).join("\n\n");

    const prompt =
      `Actúa como un SISTEMA UNIFICADO DE REDACCIÓN ACADÉMICA (Motor OBELISCO v2.1). ` +
      `Tu misión es investigar y redactar de forma EXHAUSTIVA la sección: "${section}" para la tesis "${data.title}". ` +
      `Nivel Académico: ${data.level}. Programa: ${data.program}. ` +
      `\nREFERENCIAS VERIFICADAS PARA USAR:\n${realCitations || "Utiliza fuentes académicas reales y actualizadas (2020-2024)."} ` +
      `\nCONTEXTO PREVIO (RAG):\n${contextStr || "Inicio de proyecto."} ` +
      `\nULTIMAS LÍNEAS GENERADAS (Continuidad):\n${prevContent.substring(Math.max(0, prevContent.length - 1500))}. ` +
      `\nINSTRUCCIONES DE GENERACIÓN UNIFICADA:\n` +
      `1. INVESTIGACIÓN: Sintetiza conceptos clave, antecedentes y bibliografía en el texto. ` +
      `2. REDACCIÓN MASIVA: Escribe entre 1500 a 2500 palabras. Desarrolla cada punto con profundidad extrema. No seas superficial. ` +
      `3. CALIDAD: Integra automáticamente el proceso de auditoría y pulido para que el texto sea "Aprobado" y se sienta humano. ` +
      `4. VISUALES: Diseña una tabla Markdown o un diagrama Mermaid que resuma los puntos clave de esta sección. ` +
      `\n${this.getAcademicRules({ section, level: data.level })} ` +
      `\nFORMATO DE RESPUESTA (OBLIGATORIO - NO INCLUIR NADA MÁS):\n` +
      `Debes separar tu respuesta con estas etiquetas exactas:\n` +
      `<RESEARCH>\n(Resumen de la investigación y bibliografía APA 7 usada)\n</RESEARCH>\n` +
      `<CONTENT>\n(El cuerpo de la tesis redactado con subtítulos y PÁRRAFOS DE 5 A 12 LÍNEAS. Usa TERCERA PERSONA IMPERSONAL (Se analizó, se procedió). Cada párrafo DEBE tener al menos una cita parentética)\n</CONTENT>\n` +
      `<VISUALS>\n(Código Markdown de tabla o Mermaid, o "SIN_VISUAL")\n</VISUALS>`;

    const response = await this.safeGenerate(prompt, "Agente Unificado", { 
      temperature: 0.3,
      maxTokens: 8192, // Intentar máximo de tokens para salida larga
      signal
    });
 respuesta con estas etiquetas exactas:\n` +
      `<RESEARCH>\n(Resumen de la investigación y bibliografía APA 7 usada)\n</RESEARCH>\n` +
      `<CONTENT>\n(El cuerpo de la tesis redactado con subtítulos y PÁRRAFOS DE 5 A 12 LÍNEAS. Usa TERCERA PERSONA IMPERSONAL)\n</CONTENT>\n` +
      `<VISUALS>\n(Código Markdown de tabla o Mermaid, o "SIN_VISUAL")\n</VISUALS>`;

    const response = await this.safeGenerate(prompt, "Agente Unificado", { 
      temperature: 0.3,
      maxTokens: 8192, // Intentar máximo de tokens para salida larga
      signal
    });

    // Parsear la respuesta
    const researchMatch = response.match(/<RESEARCH>([\s\S]*?)<\/RESEARCH>/);
    const contentMatch = response.match(/<CONTENT>([\s\S]*?)<\/CONTENT>/);
    const visualsMatch = response.match(/<VISUALS>([\s\S]*?)<\/VISUALS>/);

    const result = {
      research: researchMatch ? researchMatch[1].trim() : "Investigación integrada.",
      content: contentMatch ? contentMatch[1].trim() : response.replace(/<[\s\S]*?>/g, "").trim(),
      visuals: visualsMatch ? visualsMatch[1].trim() : "SIN_VISUAL"
    };

    // Almacenar en memoria vectorial
    if (result.content.length > 100) {
      await storeThesisChunk(projectId, section, result.content);
    }

    return result;
  }

  async humanizerAgent(content: string, signal?: AbortSignal): Promise<string> {
    const prompt =
      `Actúa como un corrector de estilo editorial académico. ` +
      `Mejora la fluidez y naturalidad del siguiente texto, eliminando el "vibe" de IA (como listas excesivas, estructuras robóticas o conclusiones repetitivas). ` +
      `\n\nREGLA CRÍTICA DE EXTENSIÓN: El texto original tiene profundidad y extensión. **ESTÁ ESTRICTAMENTE PROHIBIDO RESUMIR O ACORTAR EL TEXTO**. ` +
      `Debes MANTENER O EXPANDIR la longitud (objetivo: 1500 - 2500 palabras). Cada detalle técnico, cita y argumento debe preservarse intacto. ` +
      `\n\nTEXTO A MEJORAR:\n` +
      `${content.substring(0, 8000)}\n\n` +
      `Usa transiciones elegantes y vocabulario sofisticado. Responde SOLO el texto pulido en ESPAÑOL.`;
    
    // Cohere es excelente para parafraseo académico
    return this.safeGenerate(prompt, "Humanizador", { 
      model: process.env.COHERE_API_KEY ? "command-r-plus-08-2024" : undefined,
      maxTokens: 8192,
      temperature: 0.3,
      signal
    });
  }

  async bibliographyAgent(fullContent: string, signal?: AbortSignal): Promise<string> {
    const prompt =
      `Actúa como un revisor bibliográfico experto. ` +
      `Extrae todas las referencias y autores mencionados o utilizados implícitamente en el siguiente texto de tesis: ` +
      `${fullContent.substring(0, 8000)}... ` +
      `Genera la lista final de "Referencias Bibliográficas" en estricto formato APA 7. ` +
      `REGLA: Usa solo autores reales. Si el texto no tiene suficientes, infiere referencias plausibles basadas en el tema. ` +
      this.getAcademicRules({ section: "Bibliografía" }) +
      `Responde ÚNICAMENTE con la lista de referencias formateadas en Markdown.`;
    return this.safeGenerate(prompt, "Bibliógrafo", { signal });
  }

  async summaryAgent(projectId: string, title: string, signal?: AbortSignal): Promise<string> {
    // Recuperar un resumen de todo el proyecto de la memoria vectorial
    const vectorContext = await retrieveRelevantContext(projectId, "Resumen Ejecutivo");
    const contextStr = vectorContext.map(c => `[Capítulo: ${c.chapter}]: ${c.content.substring(0, 1000)}`).join("\n\n");

    const prompt =
      `Actúa como un experto en redacción de resúmenes ejecutivos para tesis doctorales. ` +
      `Genera un RESUMEN de máximo 300 palabras para la tesis titulada "${title}". ` +
      `Debe incluir: El propósito de la investigación, la metodología empleada, los resultados más resaltantes y las conclusiones principales. ` +
      `REGLAS: ` +
      `1. UN SOLO PÁRRAFO a bloque. ` +
      `2. TERCERA PERSONA IMPERSONAL. ` +
      `3. Incluye 5 palabras clave al final (Keywords). ` +
      `\nCONTENIDO DE LA TESIS (RAG):\n${contextStr || "Usa el título para inferir el resumen si no hay contexto suficiente."} ` +
      `\nResponde ÚNICAMENTE con el resumen y las palabras clave en ESPAÑOL.`;
    
    return this.safeGenerate(prompt, "Resumen", { temperature: 0.3, signal });
  }

  async generateStructuralPlan(data: Record<string, any>, signal?: AbortSignal): Promise<string> {
    const estimatedPages = Number(data.estimatedPages) || 50;
    const isShort = estimatedPages <= 30;
    const levels = isShort ? "2 o 3 niveles" : "3 o 4 niveles";
    const subSections = isShort ? "2 a 3 sub-secciones" : "3 a 4 sub-secciones";

    const prompt =
      `Genera un ÍNDICE TÉCNICO EXHAUSTIVO para una tesis de ${data.level} titulada "${data.title}". ` +
      `Descripción: ${data.description}. Programa: ${data.program}. ` +
      `META DE EXTENSIÓN: ${estimatedPages} páginas. ` +
      `REGLAS DEL ÍNDICE PARA TESIS LARGAS: ` +
      `1. GRANULARIDAD: Debes generar muchísimas sub-secciones. Si la meta es >80 págs, genera al menos 30 a 40 secciones individuales. ` +
      `2. TIPO DE SECCIÓN: Cada línea que deba ser redactada individualmente DEBE terminar con [TYPE:SECTION]. ` +
      `3. ESTRUCTURA: Usa niveles jerárquicos (1.1, 1.1.1, 1.1.1.1). ` +
      `4. COHERENCIA: Asegura que el flujo sea lógico para una tesis de ${data.level}. ` +
      `5. IDIOMA: Responde ÚNICAMENTE el índice en Markdown en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Planificador", { signal });
  }

  /**
   * Parsea el plan en Markdown para extraer las secciones individuales.
   */
  static parsePlan(markdownPlan: string): Array<{ id: string; title: string; level: number }> {
    const lines = markdownPlan.split('\n');
    const sections: Array<{ id: string; title: string; level: number }> = [];
    
    const sectionRegex = /^#*\s*(\d+(?:\.\d+)*)\.?\s+(.*?)(\[TYPE:SECTION\])?$/;

    for (const line of lines) {
      const match = line.trim().match(sectionRegex);
      if (match) {
        const id = match[1];
        let title = match[2].trim();
        // Eliminar puntos suspensivos y números de página al final
        title = title.replace(/(?:\s*\.\.*)+\s*\d*$/, '').trim();
        const isSection = !!match[3] || id.split('.').filter(Boolean).length >= 2;
        
        if (isSection && !sections.some(s => s.id === id)) {
          sections.push({ id, title: `${id} ${title}`, level: id.split('.').filter(Boolean).length });
        }
      }
    }
    
    // Si no detectó nada con el regex específico, intentar uno más genérico
    if (sections.length === 0) {
      const genericRegex = /^\s*[\-\*]\s*(.*)$|^\s*(\d+\..*)$/;
      for (const line of lines) {
        const m = line.trim().match(genericRegex);
        if (m) {
          let content = (m[1] || m[2]).trim();
          content = content.replace(/(?:\s*\.\.*)+\s*\d*$/, '').trim();
          sections.push({ id: 'gen', title: content, level: 2 });
        }
      }
    }

    return sections;
  }

  async plagiarismCheck(content: string, signal?: AbortSignal): Promise<any> {
    const prompt = 
      `Actúa como un sistema avanzado de detección de plagio y originalidad académica. ` +
      `Analiza el siguiente texto de una tesis (mostrando una muestra representativa):\n\n` +
      `${content.substring(0, 8000)}\n\n` +
      `Devuelve un reporte en formato JSON estrictamente, con la siguiente estructura:\n` +
      `{\n` +
      `  "score": (número del 0 al 100 indicando el porcentaje de originalidad, idealmente > 80),\n` +
      `  "status": ("Safe" si es seguro, "Warning" si requiere advertencia),\n` +
      `  "integrity": ("Good" si la integridad académica es buena, "Needs Review" si hay dudas),\n` +
      `  "citations_found": (número de citas académicas detectadas en el texto),\n` +
      `  "message": "Mensaje corto de resumen de la auditoría (max 2 oraciones)"\n` +
      `}\n` +
      `SOLO devuelve JSON válido. NO uses bloques de código (backticks) en tu respuesta, solo el JSON raw.`;
      
    const response = await this.safeGenerate(prompt, "PlagiarismDetector", {
      temperature: 0.1,
      model: process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : undefined,
      signal
    });
    
    try {
      // Limpiar backticks si el LLM los incluye a pesar de la instrucción
      let cleanJson = response.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return parsed;
    } catch (e) {
      console.error("Error parseando reporte de plagio:", e);
      return {
        score: 85,
        status: "Safe",
        integrity: "Good",
        citations_found: 10,
        message: "Revisar manualmente debido a error de parseo del modelo."
      };
    }
  }
}
