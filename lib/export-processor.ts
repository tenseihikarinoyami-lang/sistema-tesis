import { AcademicMetadata } from "./academic-validator";

export interface ExportData {
  title: string;
  author: string;
  university: string;
  content: Array<{ chapter: string; text: string }>;
  citations: AcademicMetadata[];
}

/**
 * Genera un archivo .bib compatible con LaTeX
 */
export function generateBibTeX(citations: AcademicMetadata[]): string {
  let bib = "";
  
  citations.forEach((cite, index) => {
    const key = cite.authors?.[0]?.split(",")[0]?.toLowerCase() || `ref_${index}`;
    const year = cite.year || "2024";
    const entryKey = `${key}${year}`;
    
    bib += `@article{${entryKey},\n`;
    bib += `  author = {${cite.authors.join(" and ")}},\n`;
    bib += `  title = {${cite.title}},\n`;
    bib += `  journal = {${cite.journal || "Academic Repository"}},\n`;
    bib += `  year = {${year}},\n`;
    if (cite.doi) bib += `  doi = {${cite.doi}},\n`;
    if (cite.url) bib += `  url = {${cite.url}},\n`;
    bib += `}\n\n`;
  });
  
  return bib;
}

/**
 * Genera un esqueleto de LaTeX para la tesis
 */
export function generateLaTeX(data: ExportData): string {
  let latex = `\\documentclass[12pt,a4paper]{report}\n`;
  latex += `\\usepackage[utf8]{inputenc}\n`;
  latex += `\\usepackage[spanish]{babel}\n`;
  latex += `\\usepackage{biblatex}\n`;
  latex += `\\addbibresource{references.bib}\n\n`;
  
  latex += `\\title{${data.title}}\n`;
  latex += `\\author{${data.author}}\n`;
  latex += `\\date{\\today}\n\n`;
  
  latex += `\\begin{document}\n`;
  latex += `\\maketitle\n`;
  latex += `\\tableofcontents\n\n`;
  
  data.content.forEach(chap => {
    latex += `\\chapter{${chap.chapter}}\n`;
    latex += `${chap.text}\n\n`;
  });
  
  latex += `\\printbibliography\n`;
  latex += `\\end{document}`;
  
  return latex;
}

/**
 * Formatea el contenido para exportación a Word/DOCX (Placeholder para integración con la lib docx)
 */
export function prepareDocxMetadata(data: ExportData) {
  // Esta función prepararía los objetos necesarios para la librería 'docx'
  return {
    title: data.title,
    author: data.author,
    sections: data.content.map(c => ({
      title: c.chapter,
      text: c.text
    }))
  };
}
