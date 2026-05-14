export interface AcademicMetadata {
  title: string;
  authors: string[];
  year: number | string;
  journal?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  isOpenAccess?: boolean;
  citationCount?: number;
}

export interface ValidationResult {
  valid: boolean;
  metadata?: AcademicMetadata;
  apa?: string;
  error?: string;
}

/**
 * Valida un DOI usando la API de Crossref (FREE)
 */
export async function validateCitation(doi: string): Promise<ValidationResult> {
  try {
    const cleanDoi = doi.replace(/https?:\/\/doi\.org\//, "").trim();
    const res = await fetch(`https://api.crossref.org/works/${cleanDoi}`, {
      headers: { "User-Agent": "ThesisForge/1.0 (mailto:admin@thesisforge.ai)" },
    });
    
    if (!res.ok) return { valid: false, error: "DOI no encontrado o API no disponible" };
    
    const data = await res.json();
    const item = data.message;
    
    const metadata: AcademicMetadata = {
      title: item.title?.[0],
      authors: item.author?.map((a: any) => `${a.family}, ${a.given?.[0] || ""}.`) || [],
      year: item["published-print"]?.["date-parts"]?.[0]?.[0] || item["published-online"]?.["date-parts"]?.[0]?.[0] || "s.f.",
      journal: item["container-title"]?.[0],
      doi: item.DOI,
      url: item.URL,
      abstract: "", // Crossref no suele dar abstracts completos
    };

    const firstAuthor = item.author?.[0]?.family || "Anónimo";
    const apa = `${firstAuthor}, ${item.author?.[0]?.given?.[0] || ""}. (${metadata.year}). ${metadata.title}. ${metadata.journal || ""}. https://doi.org/${item.DOI}`;

    return { valid: true, metadata, apa };
  } catch (error) {
    return { valid: false, error: "Error de conexión con Crossref" };
  }
}

/**
 * Busca papers reales usando fuentes GRATUITAS
 */
export async function searchAcademicPapers(query: string, limit: number = 5): Promise<AcademicMetadata[]> {
  try {
    const results = await Promise.allSettled([
      searchSemanticScholar(query, limit),
      searchBASE(query, Math.ceil(limit / 2)),
      searchArXiv(query, limit)
    ]);

    const allPapers = results
      .filter((r): r is PromiseFulfilledResult<AcademicMetadata[]> => r.status === "fulfilled")
      .flatMap(r => r.value);

    const seen = new Set();
    return allPapers.filter(paper => {
      const key = paper.doi || paper.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
  } catch (error) {
    console.error("Academic search failed, trying fallback chain:", error);
    return await searchArXiv(query, limit);
  }
}

/**
 * Semantic Scholar Search (FREE TIER)
 */
async function searchSemanticScholar(query: string, limit: number): Promise<AcademicMetadata[]> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,abstract,url,doi,venue,isOpenAccess,citationCount`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ThesisForge/1.0 (mailto:admin@thesisforge.ai)" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((item: any) => ({
      title: item.title,
      authors: item.authors?.map((a: any) => a.name) || [],
      year: item.year || "s.f.",
      journal: item.venue,
      doi: item.doi,
      url: item.url,
      abstract: item.abstract,
      isOpenAccess: item.isOpenAccess?.isRelevant,
      citationCount: item.citationCount
    }));
  } catch { return []; }
}

/**
 * BASE (Bielefeld Academic Search Engine) Search (FREE)
 */
export async function searchBASE(query: string, limit: number = 5): Promise<AcademicMetadata[]> {
  try {
    const url = `https://api.base-search.net/cgi-bin/mab-interface.pl?query=${encodeURIComponent(query)}&format=json&size=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response?.docs || []).map((item: any) => ({
      title: item.dc_title?.[0],
      authors: item.dc_creator || [],
      year: item.dc_date?.[0]?.substring(0, 4) || "s.f.",
      journal: item.dc_source?.[0],
      url: item.dc_identifier?.[0],
    }));
  } catch { return []; }
}

/**
 * Unpaywall (FREE) - Localizar versiones gratuitas
 */
export async function getOpenAccessLink(doi: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.unpaywall.org/v2/${doi}?email=admin@thesisforge.ai`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.best_oa_location?.url || null;
  } catch { return null; }
}

/**
 * Busca preprints en arXiv (FREE)
 */
export async function searchArXiv(query: string, limit: number = 5): Promise<AcademicMetadata[]> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const text = await res.text();
    const entries = text.split("<entry>");
    entries.shift(); 
    
    return entries.map(entry => {
      const title = entry.match(/<title>(.*?)<\/title>/s)?.[1].replace(/\n/g, " ").trim() || "Sin título";
      const abstract = entry.match(/<summary>(.*?)<\/summary>/s)?.[1].replace(/\n/g, " ").trim() || "";
      const year = entry.match(/<published>(.*?)<\/published>/)?.[1].substring(0, 4) || "s.f.";
      const url = entry.match(/<id>(.*?)<\/id>/)?.[1] || "";
      const authors = [...entry.matchAll(/<name>(.*?)<\/name>/g)].map(m => m[1]);
      
      return { title, authors, year, url, abstract, journal: "arXiv Preprint" };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Heurística de tono académico
 */
export async function checkAcademicTone(content: string): Promise<{ score: number; suggestions: string[] }> {
  const suggestions: string[] = [];
  let score = 100;
  if (content.length < 500) { score -= 20; suggestions.push("Contenido muy breve."); }
  if (!content.includes("(") || !content.includes(")")) { score -= 30; suggestions.push("Faltan citas parentéticas."); }
  return { score, suggestions };
}
