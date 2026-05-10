import { GoogleGenerativeAI } from "@google/generative-ai";

export class AcademicEngine {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.4,
      }
    });
  }

  async researcherAgent(topic: string, context: string): Promise<string> {
    const prompt = `
      Rol: Investigador Académico Senior (Experto en RAG).
      Tarea: Identificar 3 fuentes bibliográficas reales (libros o artículos científicos) y 3 conceptos clave necesarios para investigar: ${topic}
      Contexto Institucional: ${context}
      
      Retorna una lista de hallazgos bibliográficos simulados en formato APA 7 y los conceptos clave.
      Mantén las respuestas en ESPAÑOL y con rigor académico.
    `;
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async writerAgent(section: string, researchData: string, data: any, context: string): Promise<string> {
    const tono = data.tone || 'Académico Formal';
    const programa = data.program || 'Investigación Científica';
    
    const systemPrompt = `
      Eres el Agente Redactor de OBELISCO. Tu objetivo es transformar datos de investigación en prosa académica impecable.
      REGLAS:
      - Tercera persona impersonal (NUNCA 'nosotros' o 'yo').
      - Integrar las fuentes de investigación proporcionadas de forma fluida.
      - Tono: ${tono}. Disciplina: ${programa}.
      - Máximo rigor sintáctico.
      - Escribe siempre en ESPAÑOL académico.
      - Mínimo 300 palabras por sección.
    `;
    
    const humanPrompt = `
      Sección: ${section}
      Datos de Investigación: ${researchData}
      Contexto del Proyecto: ${data.description || ''}
      Título de la Tesis: ${data.title || ''}
      Contenido Previo (para coherencia): ${context || 'N/A'}
      
      Redacta el contenido exhaustivo y académico para esta sección.
    `;
    
    const result = await this.model.generateContent(`${systemPrompt}\n\n${humanPrompt}`);
    return result.response.text();
  }

  async auditorAgent(content: string, thesisType: string): Promise<string> {
    const prompt = `
      Rol: Auditor Metodológico (Especialista en ${thesisType}).
      Tarea: Evaluar el siguiente contenido académico en ESPAÑOL.
      Contenido: ${content}
      
      Busca:
      1. Uso de primera persona (Prohibido).
      2. Falta de citas.
      3. Coherencia con el título.
      
      Retorna una breve crítica y sugerencias de corrección. Si todo está perfecto, indica 'APROBADO'.
    `;
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async humanizerAgent(content: string): Promise<string> {
    const prompt = `
      Rol: Editor de Estilo Humano.
      Tarea: Refinar el texto para que sea indistinguible de un humano experto.
      - Elimina muletillas de IA ('en conclusión', 'es importante destacar', 'cabe señalar').
      - Varía la longitud de las oraciones.
      - Mejora los conectores lógicos.
      - Mantén el idioma ESPAÑOL y el tono académico formal.
      - NO acortes el texto; solo mejóralo.
      
      Texto Original: ${content}
    `;
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async generateStructuralPlan(data: any): Promise<string> {
    const nivel = (data.level || "TEG").toUpperCase();
    let baseStructure = "";
    
    if (nivel.includes("PNF")) {
      baseStructure = `
        - Páginas Preliminares (Portada, Índice, Resumen)
        - Introducción
        - Capítulo I: Descripción del Proyecto (Diagnóstico, Metodología, Alternativas, Justificación)
        - Capítulo II: Planificación del Proyecto (Cronograma)
        - Capítulo III: Conclusiones y Recomendaciones
        - Capítulo IV: Propuesta (Productos/Servicios, Fundamentación, Plan de Acción)
        - Referencias y Anexos
      `;
    } else {
      baseStructure = `
        - Páginas Preliminares (Portada, Dedicatoria, Agradecimiento, Índice, Resumen)
        - Introducción
        - Capítulo I: El Problema (Planteamiento, Justificación, Objetivos, Variables)
        - Capítulo II: Marco Teórico (Antecedentes, Bases Teóricas, Bases Legales, Términos)
        - Capítulo III: Marco Metodológico (Diseño, Nivel, Población, Muestra, Instrumentos, Validez)
        - Capítulo IV: Resultados de la Investigación
        - Conclusiones y Recomendaciones
        - Referencias y Anexos
      `;
    }

    const prompt = `
      Rol: Arquitecto de Investigaciones Académicas Senior (Normativa UPEL/IUTAR).
      Institución: ${data.university}, ${data.faculty}.
      Tarea: Diseñar el índice detallado para un trabajo de tipo ${data.level} en ${data.program}.
      Título: ${data.title}
      Tema: ${data.description}
      
      Estructura base obligatoria: ${baseStructure}
      Retorna el índice detallado en formato Markdown. Escribe en ESPAÑOL.
    `;
    
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}
