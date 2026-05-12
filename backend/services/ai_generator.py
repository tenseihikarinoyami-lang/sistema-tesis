import os
import json
import time
import asyncio
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

async def invoke_with_retry(client, messages, retries=3):
    """Utility to retry LLM calls with exponential backoff."""
    for i in range(retries):
        try:
            return await client.ainvoke(messages)
        except Exception as e:
            if i == retries - 1:
                raise e
            wait_time = (2 ** i) + 1
            print(f"[RETRY] Error: {str(e)[:100]}. Retrying in {wait_time}s...")
            await asyncio.sleep(wait_time)

class AcademicEngine:
    def __init__(self, provider: str = "openrouter"):
        self.preferred_provider = provider
        self._setup_clients()

    def _setup_clients(self):
        # Gemini
        self.gemini = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.4
        )
        # Groq
        self.groq = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.4
        )
        # OpenRouter
        self.openrouter = ChatOpenAI(
            model="meta-llama/llama-3.3-70b-instruct",
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
            temperature=0.4
        )

    async def _safe_invoke(self, messages: Any, agent_name: str) -> str:
        if self.preferred_provider == "groq":
            order = [("groq", self.groq), ("openrouter", self.openrouter), ("gemini", self.gemini)]
        elif self.preferred_provider == "gemini":
            order = [("gemini", self.gemini), ("openrouter", self.openrouter), ("groq", self.groq)]
        else:
            order = [("openrouter", self.openrouter), ("groq", self.groq), ("gemini", self.gemini)]

        last_error = None
        for name, client in order:
            if not client: continue
            try:
                print(f"[OBELISCO] Intentando con {name} para {agent_name}...")
                response = await invoke_with_retry(client, messages)
                return response.content
            except Exception as e:
                last_error = e
                print(f"[OBELISCO] Fallo en {name}: {str(e)[:100]}")

        raise last_error or Exception("No hay proveedores disponibles")

    async def researcher_agent(self, topic: str, context: str) -> str:
        """Agente Investigador: Simula la búsqueda de fuentes reales y hechos académicos."""
        prompt = """
        Rol: Investigador Académico Senior (Experto en RAG).
        Tarea: Identificar 3 fuentes bibliográficas reales (libros o artículos científicos) y 3 conceptos clave necesarios para investigar: {topic}
        Contexto Institucional: {context}
        
        Retorna una lista de hallazgos bibliográficos simulados en formato APA 7 y los conceptos clave.
        Mantén las respuestas en ESPAÑOL y con rigor académico.
        """
        messages = [HumanMessage(content=prompt.format(topic=topic, context=context))]
        return await self._safe_invoke(messages, "ResearcherAgent")

    async def writer_agent(self, section: str, research_data: str, data: Dict[str, Any], context: str) -> str:
        """Agente Redactor: Genera la prosa académica basada en la investigación."""
        system_prompt = f"""
        Eres el Redactor Académico Senior del sistema OBELISCO. 
        Tu objetivo es generar prosa de altísimo nivel académico, sin redundancias y con absoluta coherencia.
        - Normativa: {data.get('norm', 'APA 7')}
        - Nivel: {data.get('level', 'Licenciatura')}
        - Tono: {data.get('tone', 'Académico Formal')}
        - Idioma: {data.get('language', 'Español')}
        """
        
        human_prompt = f"""
        INVESTIGACIÓN PREVIA:
        {research_data}
        
        CONTEXTO DEL PROYECTO:
        - Título: {data.get('title')}
        - Descripción: {data.get('description')}
        - Capítulo/Sección Actual: {section}
        - Contenido Previo: {context[:500]}...
        
        INSTRUCCIÓN:
        Redacta el contenido exhaustivo y académico para esta sección.
        """
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        return await self._safe_invoke(messages, "WriterAgent")

    async def auditor_agent(self, content: str, thesis_type: str) -> str:
        """Agente Metodólogo: Verifica el cumplimiento de normas institucionales."""
        prompt = """
        Rol: Auditor Metodológico (Especialista en {thesis_type}).
        Tarea: Evaluar el siguiente contenido académico en ESPAÑOL.
        Contenido: {content}
        
        Busca:
        1. Uso de primera persona (Prohibido).
        2. Falta de citas.
        3. Coherencia con el título.
        
        Retorna una breve crítica y sugerencias de corrección. Si todo está perfecto, indica 'APROBADO'.
        """
        messages = [HumanMessage(content=prompt.format(content=content, thesis_type=thesis_type))]
        return await self._safe_invoke(messages, "AuditorAgent")

    async def humanizer_agent(self, content: str) -> str:
        """Agente Humanizador: Elimina patrones de IA y mejora la fluidez."""
        prompt = """
        Rol: Editor de Estilo Humano.
        Tarea: Refinar el texto para que sea indistinguible de un humano experto.
        - Elimina muletillas de IA ('en conclusión', 'es importante destacar', 'cabe señalar').
        - Varía la longitud de las oraciones.
        - Mejora los conectores lógicos.
        - Mantén el idioma ESPAÑOL y el tono académico formal.
        - NO acortes el texto; solo mejóralo.
        
        Texto Original: {content}
        """
        messages = [HumanMessage(content=prompt.format(content=content))]
        return await self._safe_invoke(messages, "HumanizerAgent")

    async def generate_structural_plan(self, data: Dict[str, Any]):
        """Paso 1: Generar índice jerárquico basado en nivel académico y requisitos."""
        titulo = data.get("title", "Sin título")
        universidad = data.get("university", "Desconocida")
        nivel = data.get("level", "Licenciatura")
        descripcion = data.get("description", "")
        base_structure = ", ".join(data.get("chapters", []))
        
        prompt = """
        Rol: Arquitecto Académico Senior.
        Tarea: Diseñar la estructura lógica (Índice detallado) para una tesis.
        
        DATOS:
        - Título: {title}
        - Universidad: {university}
        - Nivel: {level}
        - Descripción: {description}
        - Estructura Base: {base_structure}
        
        REQUERIMIENTO:
        Genera un índice jerárquico exhaustivo. Para cada capítulo, desglosa al menos 3 sub-puntos.
        Asegura que la estructura cumpla con el rigor del nivel {level}.
        Formato de salida: Texto estructurado con numeración decimal (1., 1.1., 1.1.1.).
        Idioma: ESPAÑOL.
        """
        
        inputs = {
            "title": titulo,
            "university": universidad,
            "level": nivel,
            "description": descripcion,
            "base_structure": base_structure,
        }
        messages = [HumanMessage(content=prompt.format(**inputs))]
        return await self._safe_invoke(messages, "StructuralPlanAgent")


class ThesisForgePipeline:
    def __init__(self, provider: str = "openrouter"):
        self.engine = AcademicEngine(provider=provider)

    async def run_step_by_step(self, data: Dict[str, Any]):
        """Ejecución controlada por pasos para evitar timeouts y permitir supervisión."""
        # Nota: La lógica de persistencia se maneja en el API de Next.js o en un worker aparte.
        pass
