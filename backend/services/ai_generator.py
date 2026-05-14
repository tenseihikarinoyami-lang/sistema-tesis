import os
import json
import time
import asyncio
import requests
import re
import difflib
from firebase_admin import firestore
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
            temperature=0.4,
            base_url="https://openrouter.ai/api/v1"
        )

    async def _safe_invoke(self, messages, agent_name="Agent"):
        """Invoca al LLM preferido con fallback automático."""
        providers = [self.openrouter, self.gemini, self.groq]
        if self.preferred_provider == "gemini":
            providers = [self.gemini, self.openrouter, self.groq]
        elif self.preferred_provider == "groq":
            providers = [self.groq, self.openrouter, self.gemini]

        for client in providers:
            try:
                print(f"[{agent_name}] Usando {client.__class__.__name__}...")
                response = await invoke_with_retry(client, messages)
                return response.content
            except Exception as e:
                print(f"[{agent_name}] Error con {client.__class__.__name__}: {e}")
                continue
        raise Exception("Todos los proveedores de IA fallaron.")

    async def _fetch_real_papers(self, query: str, limit: int = 5) -> List[Dict]:
        """Busca papers reales en Semantic Scholar y Crossref."""
        all_papers = []
        
        # 1. Semantic Scholar
        try:
            url = f"https://api.semanticscholar.org/graph/v1/paper/search"
            params = {"query": query, "limit": limit, "fields": "title,authors,year,url,citationStyles,abstract"}
            headers = {}
            api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
            if api_key: headers["x-api-key"] = api_key

            response = requests.get(url, params=params, headers=headers, timeout=10)
            if response.status_code == 200:
                all_papers.extend(response.json().get("data", []))
        except Exception as e:
            print(f"[SEMANTIC SCHOLAR] Error: {e}")

        # 2. Crossref (Fallback/Complement)
        try:
            url = f"https://api.crossref.org/works"
            params = {"query": query, "rows": limit}
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                items = response.json().get("message", {}).get("items", [])
                for item in items:
                    authors = ", ".join([a.get('family', '') for a in item.get('author', []) if a.get('family')])
                    year = item.get('published-print', {}).get('date-parts', [[None]])[0][0] or \
                           item.get('published-online', {}).get('date-parts', [[None]])[0][0] or 'n.d.'
                    all_papers.append({
                        "title": item.get('title', ['Sin título'])[0],
                        "authors": authors,
                        "year": year,
                        "url": item.get('URL', ''),
                        "abstract": "No disponible en Crossref"
                    })
        except Exception as e:
            print(f"[CROSSREF] Error: {e}")

        return all_papers[:limit*2]

    async def researcher_agent(self, topic: str, context: str, user_files_context: str = "") -> Dict[str, Any]:
        """Agente Investigador: Busca fuentes reales, extrae conceptos y analiza documentos del usuario."""
        # 1. Buscar fuentes reales (APIs Externas)
        papers = await self._fetch_real_papers(topic)
        
        sources_text = ""
        bibliographies = []
        for p in papers:
            sources_text += f"- Título: {p.get('title')}\n  Autores: {p.get('authors')}\n  Año: {p.get('year')}\n  Abstract: {p.get('abstract')}\n\n"
            bibliographies.append(f"{p.get('authors')} ({p.get('year')}). {p.get('title')}. Extraído de: {p.get('url')}")

        # 2. Usar LLM para estructurar e integrar contexto del usuario
        system_prompt = f"""
        Eres el Investigador Senior del sistema OBELISCO. Tu tarea es extraer los conceptos clave, citas potenciales 
        y contrastar la información externa con los documentos del usuario para el tema: '{topic}'.
        
        CONTEXTO DEL PROYECTO: {context}
        
        CONTEXTO DE DOCUMENTOS DEL USUARIO (RAG):
        {user_files_context}
        
        FUENTES ACADÉMICAS ENCONTRADAS (APIs):
        {sources_text}
        
        Retorna un JSON estrictamente válido con:
        {{
            "concepts": ["concepto 1", "concepto 2"],
            "citations": ["Cita en formato APA sugerida"],
            "analysis": "Breve análisis de cómo las fuentes externas complementan los documentos del usuario",
            "relevance_score": 0.95
        }}
        """
        messages = [HumanMessage(content=system_prompt)]
        raw_response = await self._safe_invoke(messages, "Researcher")
        
        # Limpiar JSON
        clean_json = re.sub(r'```json|```', '', raw_response).strip()
        try:
            return {
                "raw_research": sources_text,
                "structured": json.loads(clean_json),
                "refs": bibliographies
            }
        except:
            return {
                "raw_research": sources_text,
                "structured": {"citations": bibliographies, "concepts": [], "analysis": "Error al procesar JSON"},
                "refs": bibliographies
            }

    async def rag_writer_agent(self, instruction: str, rag_context: str, project_context: str, data: Dict[str, Any]) -> str:
        """Agente Especializado en RAG: Escribe basándose estrictamente en los documentos proporcionados."""
        system_prompt = f"""
        Eres el Especialista en Síntesis Documental de OBELISCO. 
        Tu misión es expandir o redactar contenido basándote EXCLUSIVAMENTE en el contexto de los documentos proporcionados.
        
        INSTRUCCIÓN DEL USUARIO: {instruction}
        
        CONTEXTO DE DOCUMENTOS (RAG):
        {rag_context}
        
        CONTEXTO DEL PROYECTO: {project_context}
        
        REGLAS:
        1. NO inventes información. Si algo no está en los documentos, indícalo o búscalo en el contexto del proyecto.
        2. Usa citas APA 7 integradas (Autor, Año) si el documento tiene esos metadatos.
        3. Mantén un estilo académico, riguroso y sin adornos innecesarios.
        4. Idioma: ESPAÑOL.
        """
        messages = [HumanMessage(content=system_prompt)]
        return await self._safe_invoke(messages, "RAGWriter")


    async def writer_agent(self, section: str, research_data: str, data: Dict[str, Any], context: str, user_references: str = "") -> str:
        """Agente Redactor: Genera la prosa académica basada en la investigación y referencias del usuario."""
        system_prompt = f"""
        Eres el Redactor Académico Senior del sistema OBELISCO. 
        Tu objetivo es generar prosa académica extensa, profunda y de altísimo nivel, sin redundancias y con absoluta coherencia.
        - Normativa: {data.get('norm', 'APA 7')}
        - Nivel: {data.get('level', 'Licenciatura')}
        - Área: {data.get('area', 'General')}
        
        SECCIÓN A REDACTAR: {section}
        
        CONTEXTO DE CAPÍTULOS PREVIOS (no repetir):
        {context[:3000]}
        
        REFERENCIAS DEL USUARIO (RAG - ALTA PRIORIDAD):
        {user_references}
        
        DATOS DE INVESTIGACIÓN DE APIS ACADÉMICAS:
        {research_data}
        
        INSTRUCCIONES OBLIGATORIAS:
        1. Escribe MÍNIMO 1500-2500 palabras para esta sección. Desarrolla cada punto en profundidad.
        2. Usa citas APA 7 integradas en el texto (ej: García, 2022; Rodríguez et al., 2020).
        3. Estructura el contenido en párrafos sólidos de 150-250 palabras cada uno.
        4. Mantén un tono formal, objetivo e impersonal en todo momento.
        5. NO uses introducciones vacías como "En esta sección vamos a...". Ve directo al contenido.
        6. SOLO usa las fuentes proporcionadas. Jamás inventes autores ni años.
        7. Conecta las ideas con transiciones lógicas ("Desde esta perspectiva...", "En contraste...", "Así mismo...").
        8. Si hay referencias RAG del usuario, cítalas prioritariamente con el formato (nombre_archivo, año) si aplica.
        9. Cierra la sección con un párrafo de síntesis que conecte hacia la siguiente idea.
        """
        messages = [HumanMessage(content=system_prompt)]
        return await self._safe_invoke(messages, "Writer")

    async def auditor_agent(self, text: str) -> str:
        """Agente Auditor: Revisa el rigor, la gramática y el formato."""
        system_prompt = f"""
        Eres el Auditor Académico de OBELISCO. Revisa el siguiente texto y corrígelo para:
        1. Eliminar cualquier rastro de "IA" (muletillas, listas innecesarias).
        2. Asegurar que las citas APA 7 estén bien puntuadas.
        3. Mejorar la transición entre párrafos.
        
        TEXTO:
        {text}
        
        Retorna el texto FINAL CORREGIDO. No incluyas comentarios adicionales.
        """
        messages = [HumanMessage(content=system_prompt)]
        return await self._safe_invoke(messages, "Auditor")

    async def humanizer_agent(self, text: str) -> str:
        """Agente Humanizador: Suaviza el tono para que parezca escrito por un humano experto."""
        system_prompt = f"""
        Actúa como un Tesista Senior con años de experiencia. Reescribe ligeramente el siguiente texto para que fluya con naturalidad, 
        evitando estructuras repetitivas típicas de modelos de lenguaje.
        
        REGLAS:
        - No cambies los datos ni las citas.
        - Mejora la conexión lógica entre ideas.
        - Usa un vocabulario rico y variado.
        
        TEXTO:
        {text}
        """
        messages = [HumanMessage(content=system_prompt)]
        return await self._safe_invoke(messages, "Humanizer")

    async def visual_agent(self, section: str, text: str) -> str:
        """Agente Visual: Genera tablas o diagramas Mermaid si el contenido lo amerita."""
        system_prompt = f"""
        Analiza si el siguiente texto de tesis necesita una representación visual (Tabla Markdown o Diagrama Mermaid).
        Si el texto describe procesos, flujos o comparaciones, GENERA el código correspondiente.
        
        TEXTO: {text[:2000]}
        
        REGLA: Retorna ÚNICAMENTE el bloque de código (Mermaid o Tabla). Si no es necesario, retorna una cadena vacía.
        """
        messages = [HumanMessage(content=system_prompt)]
        return await self._safe_invoke(messages, "VisualAgent")

    async def refinement_agent(self, text: str, instruction: str) -> str:
        """Agente de Refinamiento: Permite al usuario mejorar secciones específicas en el editor."""
        prompt = f"""
        Actúa como un Tutor de Tesis.
        Texto Original: {text}
        Instrucción del Usuario: {instruction}
        
        TAREA: Aplica la instrucción manteniendo el rigor académico y el formato APA 7.
        """
        messages = [HumanMessage(content=prompt)]
        return await self._safe_invoke(messages, "Refiner")

class ThesisForgePipeline:
    def __init__(self, provider: str = "openrouter"):
        self.engine = AcademicEngine(provider=provider)

    def _get_relevant_rag_context(self, query: str, references: List[Dict], max_chars: int = 5000) -> str:
        """Selecciona fragmentos relevantes de los documentos subidos usando coincidencia de palabras clave."""
        keywords = set(re.findall(r'\w{5,}', query.lower())) # Palabras de +5 letras
        if not keywords:
            keywords = set(query.lower().split())
            
        relevant_chunks = []
        chars_per_doc = max_chars // max(1, len(references))
        
        for ref in references:
            content = ref.get('content', '')
            filename = ref.get('filename', 'Doc')
            
            # Si el documento es corto, va entero
            if len(content) <= chars_per_doc:
                relevant_chunks.append(f"--- REF: {filename} ---\n{content}")
                continue
                
            # Si es largo, buscamos párrafos con keywords
            paragraphs = content.split('\n\n')
            scored_paragraphs = []
            for p in paragraphs:
                score = sum(1 for kw in keywords if kw in p.lower())
                if score > 0:
                    scored_paragraphs.append((score, p))
            
            # Ordenamos por relevancia y tomamos lo que quepa
            scored_paragraphs.sort(key=lambda x: x[0], reverse=True)
            doc_context = ""
            for _, p in scored_paragraphs:
                if len(doc_context) + len(p) < chars_per_doc:
                    doc_context += p + "\n"
                else:
                    break
            
            if not doc_context: # Fallback al principio si no hay matches
                doc_context = content[:chars_per_doc]
                
            relevant_chunks.append(f"--- REF: {filename} ---\n{doc_context}")
            
        return "\n\n".join(relevant_chunks)

    def verify_academic_integrity(self, generated_text: str, source_context: str) -> float:
        """Compara el texto generado con las fuentes para detectar posible plagio/copia literal."""
        # Limpieza básica
        gen_clean = re.sub(r'\s+', ' ', generated_text).strip().lower()
        src_clean = re.sub(r'\s+', ' ', source_context).strip().lower()
        
        # Usamos SequenceMatcher para una comparación rápida de bloques
        matcher = difflib.SequenceMatcher(None, gen_clean, src_clean)
        return matcher.ratio()

    async def run(self, data: Dict[str, Any], project_id: str):
        """Ejecuta el protocolo completo de OBELISCO."""
        db = firestore.client()
        doc_ref = db.collection("projects").document(project_id)
        
        try:
            # 1. Definir Estructura (Esqueleto)
            doc_ref.update({"current_phase": "Diseñando Estructura Académica", "progress": 10})
            chapters = data.get("chapters", [])
            if not chapters:
                # Si no hay capítulos, generamos un esqueleto básico
                chapters = [
                    {"title": "Introducción", "subsections": ["Planteamiento del Problema", "Objetivos", "Justificación"]},
                    {"title": "Marco Teórico", "subsections": ["Antecedentes", "Bases Teóricas", "Definición de Términos"]},
                    {"title": "Metodología", "subsections": ["Enfoque", "Diseño", "Población y Muestra"]},
                ]

            all_references = set()
            content = {}
            total_elements = sum(len(c.get("subsections", [])) for c in chapters)
            elements_done = 0

            # Guardar _index al inicio para preservar el orden en exportaciones DOCX/PDF
            content["_index"] = {
                "chapters": [
                    {"title": c.get("title"), "subsections": c.get("subsections", [])}
                    for c in chapters
                ]
            }
            doc_ref.update({"content": content})

            # Step 1.5: Cargar Referencias (RAG)
            refs_docs = db.collection("projects").document(project_id).collection("references").stream()
            raw_references_list = []
            rag_refs_metadata = []
            for r_doc in refs_docs:
                r_data = r_doc.to_dict()
                raw_references_list.append(r_data)
                rag_refs_metadata.append(f"{r_data.get('filename')} (Subido por usuario).")

            for chapter in chapters:
                chapter_title = chapter.get("title")
                subsections = chapter.get("subsections", [])
                
                chapter_content = []
                
                for sub in subsections:
                    # Update progress
                    elements_done += 1
                    progress = 10 + int((elements_done / total_elements) * 80)
                    doc_ref.update({
                        "current_phase": f"Investigando y Redactando: {sub}",
                        "progress": progress
                    })
                    
                    # RAG Context Selection
                    current_query = f"{chapter_title} {sub}"
                    current_rag_context = self._get_relevant_rag_context(current_query, raw_references_list)
                    
                    # 2.1 Investigador (Fuentes Reales)
                    research_result = await self.engine.researcher_agent(f"{chapter_title} - {sub}", data.get('description', ''))
                    research_data = research_result.get("raw_research", "")
                    all_references.update(research_result.get("refs", []))
                    
                    # 2.2 Redactor (Granular + RAG)
                    draft = await self.engine.writer_agent(
                        section=f"{chapter_title}: {sub}",
                        research_data=research_data,
                        data=data,
                        context="\n".join(chapter_content),
                        user_references=current_rag_context
                    )
                    
                    # 2.3 Auditor y Humanizador
                    final_text = await self.engine.humanizer_agent(draft)
                    
                    # 2.4 Visual Agent Check
                    if elements_done % 2 == 0:
                        visual = await self.engine.visual_agent(sub, final_text)
                        if visual.strip():
                            final_text += f"\n\n{visual}\n"
                    
                    # 2.5 Plagiarism Check per subsection (Internal)
                    combined_sources = research_data + current_rag_context
                    similarity = self.verify_academic_integrity(final_text, combined_sources)
                    
                    if similarity > 0.45:
                        print(f"[PLAGIARISM ALERT] Similarity: {similarity}. Rewriting...")
                        final_text = await self.engine.auditor_agent(f"REESCRIBE PARA EVITAR SIMILITUD EXCESIVA:\n{final_text}")
                    
                    chapter_content.append(f"## {sub}\n\n{final_text}")
                    
                    # Partial update to Firestore
                    content[chapter_title] = "\n\n".join(chapter_content)
                    doc_ref.update({"content": content})
                    
                    await asyncio.sleep(0.5)
                
                await asyncio.sleep(1)

            # Step 2.5: Generar Bibliografía Automática
            doc_ref.update({"current_phase": "Generando Bibliografía APA 7", "progress": 95})
            if all_references:
                all_refs_list = list(all_references)
                all_refs_list.extend(rag_refs_metadata)
                
                bibliography = await self.extract_and_format_bibliography(content, all_refs_list)
                content["Bibliografía"] = bibliography
                # Agregar Bibliografía al _index para que DOCX la incluya al final
                if "_index" in content and isinstance(content["_index"], dict):
                    content["_index"]["chapters"].append(
                        {"title": "Bibliografía", "subsections": []}
                    )
                doc_ref.update({"content": content})


            doc_ref.update({
                "status": "completed",
                "progress": 100,
                "current_phase": "Tesis Finalizada con Éxito"
            })

        except Exception as e:
            print(f"[PIPELINE ERROR] {e}")
            doc_ref.update({"status": "error", "error": str(e)})

    async def extract_and_format_bibliography(self, project_content: Dict[str, str], all_possible_refs: List[str]) -> str:
        """Construye una bibliografía real filtrada y formateada en APA 7 usando el LLM."""
        full_text = ""
        for k, v in project_content.items():
            if not k.startswith("_") and k != "Bibliografía":
                full_text += str(v) + " "
        
        # Filtrado inteligente de referencias
        potential_refs = []
        for ref in all_possible_refs:
            # Extraer posibles apellidos o palabras clave de la referencia
            keywords = re.findall(r'[A-Z][a-z]+', ref)
            found = False
            for kw in keywords:
                if len(kw) > 3 and kw in full_text:
                    found = True
                    break
            if found or len(potential_refs) < 10: # Mantener al menos algunas si hay pocas
                potential_refs.append(ref)
        
        # Eliminar duplicados exactos
        potential_refs = list(set(potential_refs))

        # Usar el LLM para refinar y formatear en APA 7 estricto
        prompt = f"""
        Rol: Bibliotecario Académico Experto de OBELISCO.
        Tarea: Construir la sección final de 'REFERENCIAS BIBLIOGRÁFICAS' en formato APA 7 estricto.
        
        TEXTO DE LA TESIS (Muestra):
        {full_text[:3000]}
        
        LISTA DE FUENTES DETECTADAS (Bruto):
        {json.dumps(potential_refs, indent=2)}
        
        REGLAS DE ORO:
        1. SOLO incluye fuentes que realmente aparezcan citadas o sean fundamentales en el texto proporcionado.
        2. Formato APA 7: Apellido, N. (Año). Título. Editorial/Revista. URL.
        3. Orden alfabético ascendente (A-Z).
        4. Sangría francesa (simulada en Markdown con un espacio extra si es necesario).
        5. NO inventes enlaces ni datos que no estén en la lista bruta.
        6. Elimina duplicados que se refieran a la misma obra.
        
        Retorna el contenido en Markdown, empezando con '# Referencias Bibliográficas'.
        Idioma: ESPAÑOL.
        """
        messages = [HumanMessage(content=prompt)]
        try:
            response = await self.engine._safe_invoke(messages, "BibliographyRefiner")
            return response.strip()
        except Exception as e:
            print(f"[BIBLIOGRAPHY ERROR] {e}")
            unique_refs = sorted(list(set(potential_refs)))
            bib_content = "# Referencias Bibliográficas\n\n"
            bib_content += "\n\n".join([f"{ref}" for ref in unique_refs])
            return bib_content

