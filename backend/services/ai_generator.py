import os
import random
import asyncio
from typing import List, Dict, Any
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv()

async def invoke_with_retry(chain, inputs: dict, max_retries: int = 4, base_delay: float = 10.0):
    """Invoke a LangChain chain with exponential backoff on rate-limit errors."""
    for attempt in range(max_retries):
        try:
            return await chain.ainvoke(inputs)
        except Exception as e:
            error_str = str(e)
            is_rate_limit = ('RESOURCE_EXHAUSTED' in error_str or '429' in error_str or
                             'quota' in error_str.lower() or 'rate' in error_str.lower())
            if is_rate_limit and attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)  # 10s, 20s, 40s, 80s
                print(f"[OBELISCO] Rate limit hit. Retrying in {delay:.0f}s... (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(delay)
            else:
                raise

class AcademicEngine:
    def __init__(self, provider: str = "gemini"):
        self.provider = provider
        self.llm = self._setup_llm()

    def _setup_llm(self):
        if self.provider == "gemini":
            return ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",          # Stable fast model available with this API key
                google_api_key=os.getenv("GEMINI_API_KEY"),
                temperature=0.4
            )
        elif self.provider == "groq":
            return ChatGroq(
                model="llama-3.3-70b-versatile",           # Updated to supported model
                api_key=os.getenv("GROQ_API_KEY"),
                temperature=0.4
            )
        elif self.provider == "openrouter":
            return ChatOpenAI(
                model="anthropic/claude-3-haiku",  # More cost-effective on OpenRouter
                api_key=os.getenv("OPENROUTER_API_KEY"),
                base_url="https://openrouter.ai/api/v1",
                temperature=0.4
            )
        # Fallback to Gemini if provider unknown
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.4
        )

    async def researcher_agent(self, topic: str, context: str) -> List[str]:
        """Agente Investigador: Simula la búsqueda de fuentes reales y hechos académicos."""
        prompt = ChatPromptTemplate.from_template("""
        Rol: Investigador Académico Senior (Experto en RAG).
        Tarea: Identificar 3 fuentes bibliográficas reales (libros o artículos científicos) y 3 conceptos clave necesarios para investigar: {topic}
        Contexto Institucional: {context}
        
        Retorna una lista de hallazgos bibliográficos simulados en formato APA 7 y los conceptos clave.
        Mantén las respuestas en ESPAÑOL y con rigor académico.
        """)
        chain = prompt | self.llm
        response = await invoke_with_retry(chain, {"topic": topic, "context": context})
        return response.content

    async def writer_agent(self, section: str, research_data: str, data: Dict[str, Any], context: str) -> str:
        """Agente Redactor: Genera la prosa académica basada en la investigación."""
        tono = data.get('tone', data.get('tono', 'Académico Formal'))
        programa = data.get('program', data.get('disciplina', 'Investigación Científica'))
        
        system_prompt = f"""
        Eres el Agente Redactor de OBELISCO. Tu objetivo es transformar datos de investigación en prosa académica impecable.
        REGLAS:
        - Tercera persona impersonal (NUNCA 'nosotros' o 'yo').
        - Integrar las fuentes de investigación proporcionadas de forma fluida.
        - Tono: {tono}. Disciplina: {programa}.
        - Máximo rigor sintáctico.
        - Escribe siempre en ESPAÑOL académico.
        - Mínimo 300 palabras por sección.
        """
        
        human_prompt = f"""
        Sección: {section}
        Datos de Investigación: {research_data}
        Contexto del Proyecto: {data.get('description', data.get('descripcion', ''))}
        Título de la Tesis: {data.get('title', data.get('titulo', ''))}
        Contenido Previo (para coherencia): {context if context else 'N/A'}
        
        Redacta el contenido exhaustivo y académico para esta sección.
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = await invoke_with_retry(self.llm, messages)
        return response.content

    async def auditor_agent(self, content: str, thesis_type: str) -> Dict[str, Any]:
        """Agente Metodólogo: Verifica el cumplimiento de normas institucionales."""
        prompt = ChatPromptTemplate.from_template("""
        Rol: Auditor Metodológico (Especialista en {thesis_type}).
        Tarea: Evaluar el siguiente contenido académico en ESPAÑOL.
        Contenido: {content}
        
        Busca:
        1. Uso de primera persona (Prohibido).
        2. Falta de citas.
        3. Coherencia con el título.
        
        Retorna una breve crítica y sugerencias de corrección. Si todo está perfecto, indica 'APROBADO'.
        """)
        chain = prompt | self.llm
        response = await invoke_with_retry(chain, {"content": content, "thesis_type": thesis_type})
        return response.content

    async def humanizer_agent(self, content: str) -> str:
        """Agente Humanizador: Elimina patrones de IA y mejora la fluidez."""
        prompt = ChatPromptTemplate.from_template("""
        Rol: Editor de Estilo Humano.
        Tarea: Refinar el texto para que sea indistinguible de un humano experto.
        - Elimina muletillas de IA ('en conclusión', 'es importante destacar', 'cabe señalar').
        - Varía la longitud de las oraciones.
        - Mejora los conectores lógicos.
        - Mantén el idioma ESPAÑOL y el tono académico formal.
        - NO acortes el texto; solo mejóralo.
        
        Texto Original: {content}
        """)
        chain = prompt | self.llm
        response = await invoke_with_retry(chain, {"content": content})
        return response.content

    async def generate_structural_plan(self, data: Dict[str, Any]):
        """Paso 1: Generar índice jerárquico basado en nivel académico y requisitos."""
        # Support both camelCase (frontend) and snake_case field names
        nivel = data.get("level", data.get("nivel", "TEG")).upper()
        
        if "PNF" in nivel:
            thesis_type = "PNF"
            base_structure = """
            - Páginas Preliminares (Portada, Índice, Resumen)
            - Introducción
            - Capítulo I: Descripción del Proyecto (Diagnóstico, Metodología, Alternativas, Justificación)
            - Capítulo II: Planificación del Proyecto (Cronograma)
            - Capítulo III: Conclusiones y Recomendaciones
            - Capítulo IV: Propuesta (Productos/Servicios, Fundamentación, Plan de Acción)
            - Referencias y Anexos
            """
        else:
            thesis_type = data.get("level", "TEG")
            base_structure = """
            - Páginas Preliminares (Portada, Dedicatoria, Agradecimiento, Índice, Resumen)
            - Introducción
            - Capítulo I: El Problema (Planteamiento, Justificación, Objetivos, Variables)
            - Capítulo II: Marco Teórico (Antecedentes, Bases Teóricas, Bases Legales, Términos)
            - Capítulo III: Marco Metodológico (Diseño, Nivel, Población, Muestra, Instrumentos, Validez)
            - Capítulo IV: Resultados de la Investigación
            - Conclusiones y Recomendaciones
            - Referencias y Anexos
            """

        # Normalize field names for template
        institucion = data.get("university", data.get("institucion", ""))
        facultad = data.get("faculty", data.get("facultad", ""))
        carrera = data.get("program", data.get("carrera", ""))
        titulo = data.get("title", data.get("titulo", ""))
        descripcion = data.get("description", data.get("descripcion", ""))

        prompt = ChatPromptTemplate.from_template("""
        Rol: Arquitecto de Investigaciones Académicas Senior (Normativa UPEL/IUTAR).
        Institución: {institucion}, {facultad}.
        Tarea: Diseñar el índice detallado para un trabajo de tipo {thesis_type} en {carrera}.
        Título: {titulo}
        Tema: {descripcion}
        
        Estructura base obligatoria: {base_structure}
        Retorna el índice detallado en formato Markdown. Escribe en ESPAÑOL.
        """)
        
        chain = prompt | self.llm
        response = await invoke_with_retry(chain, {
            "institucion": institucion,
            "facultad": facultad,
            "thesis_type": thesis_type,
            "carrera": carrera,
            "titulo": titulo,
            "descripcion": descripcion,
            "base_structure": base_structure,
        })
        return response.content


class ThesisForgePipeline:
    def __init__(self, provider: str = "gemini"):
        self.engine = AcademicEngine(provider)

    def _update_db(self, project_id: str, updates: Dict[str, Any]):
        from firebase_admin import firestore
        db = firestore.client()
        db.collection("projects").document(project_id).update(updates)

    async def run(self, data: Dict[str, Any], project_id: str):
        try:
            # 1. Planificación Estructural
            self._update_db(project_id, {"current_phase": "Planificación Estructural", "progress": 15})
            plan = await self.engine.generate_structural_plan(data)
            
            chapters = data.get("chapters", ["Introducción", "Capítulo I: El Problema"])
            full_content = {"Plan de Investigación": plan}
            context = ""
            
            for i, ch in enumerate(chapters):
                progress = 20 + int((i / len(chapters)) * 70)
                self._update_db(project_id, {
                    "current_phase": f"Generando: {ch}",
                    "progress": progress
                })
                
                title = data.get("title", data.get("titulo", "Investigación Académica"))
                university = data.get("university", data.get("institucion", ""))
                
                # Flujo Multi-Agente
                research = await self.engine.researcher_agent(f"{ch} sobre: {title}", university)
                draft = await self.engine.writer_agent(ch, research, data, context)
                audit = await self.engine.auditor_agent(draft, data.get("level", "TEG"))
                final_version = await self.engine.humanizer_agent(
                    draft if "APROBADO" in audit else f"{draft}\n\nNota de Auditoría: {audit}"
                )
                
                full_content[ch] = final_version
                context = final_version[-800:]  # Wider context window for coherence

            # Finalizar
            self._update_db(project_id, {
                "status": "completed",
                "progress": 100,
                "current_phase": "Tesis Finalizada",
                "content": full_content
            })
            
            return full_content
        except Exception as e:
            self._update_db(project_id, {
                "status": "error",
                "current_phase": f"Error: {str(e)[:150]}"
            })
            raise e
