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
    preferred = "gemini"
  ) {
    this.preferred = preferred;
    console.log(`[AcademicEngine] Motor inicializado con preferencia: ${this.preferred}`);
  }

  private async safeGenerate(prompt: string, agentName: string, options: AIROptions = {}): Promise<string> {
    const result = await generateWithFallback(prompt, {
      ...options,
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
        citations += `- ${authors} (${year}). ${title}.${oa}${cit} Venue: ${paper.journal || "N/A"}. Abstract: ${paper.abstract?.substring(0, 300) || "N/A"}.${url}\n`;
      }
      return citations;
    } catch (e) {
      console.error("[AcademicEngine] Error fetching citations:", e);
      return "";
    }
  }

  // ── Agentes ──────────────────────────────────────────────
  async researcherAgent(topic: string, context: string): Promise<string> {
    const realCitations = await this.fetchRealCitations(topic);
    
    const prompt =
      `Actúa como un investigador académico experto. ` +
      `Investiga bibliografía APA 7 actualizada y conceptos clave para el tema: "${topic}". ` +
      `Contexto institucional: ${context}. ` +
      (realCitations 
        ? `\n\nATENCIÓN: Usa ESTRICTAMENTE las siguientes referencias verificadas para construir tu respuesta y evitar alucinaciones:\n${realCitations}\n` 
        : `Incluye al menos 8 referencias académicas reales con autores, años y títulos de publicaciones. `) +
      `Asegúrate de citar adecuadamente las fuentes y extraer los conceptos clave del abstract. ` +
      `Responde en ESPAÑOL académico formal.`;
    return this.safeGenerate(prompt, "Investigador");
  }

  async writerAgent(
    section: string,
    research: string,
    data: Record<string, any>,
    prevContent: string,
    projectId: string
  ): Promise<string> {
    const estimatedPages = Number(data.estimatedPages) || 50;
    
    // Recuperar contexto relevante de la memoria vectorial
    const vectorContext = await retrieveRelevantContext(projectId, section);
    const contextStr = vectorContext.map(c => `[Contexto de ${c.chapter}]: ${c.content.substring(0, 500)}`).join("\n\n");

    const prompt =
      `Actúa como un Redactor de Tesis Doctoral de élite. ` +
      `Redacta la sección: "${section}" ` +
      `para la tesis titulada "${data.title}" (${data.level}). ` +
      `meta total: ${estimatedPages} páginas. ` +
      `CONTEXTO DE MEMORIA (RAG): ${contextStr || "No hay contexto previo aún."} ` +
      `CONTEXTO INMEDIATO (Secciones anteriores): ${prevContent.substring(Math.max(0, prevContent.length - 2000))}. ` +
      `INVESTIGACIÓN BASE: ${research.substring(0, 4000)}. ` +
      `REGLAS DE ORO: ` +
      `1. CONTINUIDAD: Conecta suavemente con el contexto de memoria e inmediato. No repitas lo ya dicho. ` +
      `2. EXTENSIÓN: Esta sección es un SUB-PUNTO específico. Escribe entre 800 a 1200 palabras de alto valor académico. ` +
      `3. PROFUNDIDAD: Desarrolla el tema con rigor científico. Cita fuentes de la investigación base. ` +
      `4. ESTRUCTURA: Usa subtítulos (###) para dividir el contenido si es extenso. ` +
      `5. TONO: ${data.tone || 'Académico formal'}. Norma: ${data.norm || 'APA 7'}. ` +
      `Responde ÚNICAMENTE con el contenido redactado en ESPAÑOL.`;

    const content = await this.safeGenerate(prompt, "Redactor", { 
      temperature: section.toLowerCase().includes("metodolog") ? 0.2 : 0.4,
      section 
    });

    // Almacenar en memoria vectorial para futura coherencia
    await storeThesisChunk(projectId, section, content);

    return content;
  }

  async visualsAgent(content: string, topic: string): Promise<string> {
    const prompt =
      `Analiza el siguiente contenido de tesis y genera un elemento visual complementario (Tabla o Diagrama): ` +
      `CONTENIDO: ${content.substring(0, 3000)}. ` +
      `REGLAS: ` +
      `1. TABLA: Si hay comparaciones o datos, genera una TABLA Markdown. ` +
      `2. DIAGRAMA: Si hay flujos o procesos, genera un diagrama MERMAID (ej: graph TD, sequenceDiagram, classDiagram). ` +
      `3. FORMATO: Responde EXCLUSIVAMENTE con el código del elemento. Si es Mermaid, usa bloques \`\`\`mermaid. ` +
      `4. SI NO ES NECESARIO: Responde "SIN_VISUAL". ` +
      `Responde SOLO el código o "SIN_VISUAL" en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Visualizador");
  }

  async auditorAgent(content: string, type: string): Promise<string> {
    const prompt =
      `Audita este texto de tesis doctoral/maestría (tipo: ${type}): ` +
      `${content.substring(0, 4000)}. ` +
      `Verifica: rigor científico, suficiencia de extensión (debe ser largo y detallado), citas correctas. ` +
      `Usa datos de validación externa (Semantic Scholar/Crossref/arXiv) si están disponibles para confirmar que las afirmaciones tienen sustento. ` +
      `Si el texto es excelente, responde solo: "APROBADO". ` +
      `Si es mediocre o corto, lista correcciones críticas en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Auditor", { temperature: 0.1 });
  }

  async humanizerAgent(content: string): Promise<string> {
    const prompt =
      `Actúa como un corrector de estilo editorial académico. ` +
      `Mejora la fluidez y naturalidad de este texto, eliminando el "vibe" de IA (como listas excesivas o conclusiones repetitivas), ` +
      `pero MANTÉN TODA LA EXTENSIÓN Y DETALLE TÉCNICO: ` +
      `${content.substring(0, 5000)}. ` +
      `Usa transiciones elegantes y vocabulario sofisticado. ` +
      `Responde SOLO el texto pulido en ESPAÑOL.`;
    
    // Cohere es excelente para parafraseo académico
    return this.safeGenerate(prompt, "Humanizador", { 
      model: process.env.COHERE_API_KEY ? "command-r-plus" : undefined,
      temperature: 0.3 
    });
  }

  async bibliographyAgent(fullContent: string): Promise<string> {
    const prompt =
      `Actúa como un revisor bibliográfico experto. ` +
      `Extrae todas las referencias y autores mencionados o utilizados implícitamente en el siguiente texto de tesis: ` +
      `${fullContent.substring(0, 8000)}... ` +
      `Genera la lista final de "Referencias Bibliográficas" en estricto formato APA 7. ` +
      `Inventa URLs plausibles (como DOIs) solo si son necesarias y parecen reales. ` +
      `Responde ÚNICAMENTE con la lista de referencias formateadas en Markdown.`;
    return this.safeGenerate(prompt, "Bibliógrafo");
  }

  async generateStructuralPlan(data: Record<string, any>): Promise<string> {
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
    return this.safeGenerate(prompt, "Planificador");
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
}
