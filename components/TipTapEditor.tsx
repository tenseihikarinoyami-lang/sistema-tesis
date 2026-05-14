"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Sparkles, ShieldCheck, Search, BookOpen, RotateCcw, Quote } from 'lucide-react';

import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

interface TipTapEditorProps {
  projectId: string;
  activeSection?: string;
  content: string; // Markdown
  onChange: (markdown: string) => void;
  onAuditResult?: (result: string) => void;
  onResearchResult?: (results: any) => void;
  onRAG?: (instruction: string) => void;
}

const MenuBar = ({ 
    editor, 
    onRefine, 
    onResearch, 
    onRAG 
}: { 
    editor: any, 
    onRefine: (type: 'refine' | 'audit') => void, 
    onResearch: () => void,
    onRAG: () => void
}) => {

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 bg-slate-800/50 border border-white/10 rounded-lg">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-primary/50 text-white' : 'text-slate-400 hover:bg-white/10'}`}
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-primary/50 text-white' : 'text-slate-400 hover:bg-white/10'}`}
        >
          <Italic size={18} />
        </button>
        <div className="w-px h-6 bg-white/10 my-auto mx-2" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-primary/50 text-white' : 'text-slate-400 hover:bg-white/10'}`}
        >
          <Heading1 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/50 text-white' : 'text-slate-400 hover:bg-white/10'}`}
        >
          <Heading2 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-primary/50 text-white' : 'text-slate-400 hover:bg-white/10'}`}
        >
          <Heading3 size={18} />
        </button>
        <div className="w-px h-6 bg-white/10 my-auto mx-2" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-primary/50 text-white' : 'text-slate-400 hover:bg-white/10'}`}
        >
          <List size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-primary/50 text-white' : 'text-slate-400 hover:bg-white/10'}`}
        >
          <ListOrdered size={18} />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onResearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-wider"
        >
          <Search size={14} /> Investigar
        </button>
        <button
          onClick={onRAG}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all text-xs font-black uppercase tracking-wider"
          title="Escribir con RAG (Documentos Subidos)"
        >
          <BookOpen size={14} /> Escribir con RAG
        </button>
        <button
          onClick={() => onRefine('audit')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all text-xs font-black uppercase tracking-wider"
        >
          <ShieldCheck size={14} /> Auditar Estilo
        </button>
        <button
          onClick={() => onRefine('refine')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all text-xs font-black uppercase tracking-wider"
        >
          <Sparkles size={14} /> Refinar con IA
        </button>
      </div>

    </div>
  );
};

const TipTapEditor = forwardRef(({ projectId, content, onChange, onAuditResult, onResearchResult, onRAG }: TipTapEditorProps, ref) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] p-6 bg-slate-900/50 rounded-xl border border-white/5 shadow-inner'
      }
    }
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      // Parse markdown to HTML
      const htmlContent = marked.parse(content) as string;
      
      // We only want to set content if it's vastly different or on first load to prevent cursor jumps
      if (editor.isEmpty) {
         editor.commands.setContent(htmlContent);
      } else {
         const currentMarkdown = turndownService.turndown(editor.getHTML());
         if (content !== currentMarkdown) {
           // Small hack: if the parent changes the content externally
           // we only update if it actually differs from what we think it is
           editor.commands.setContent(htmlContent);
         }
      }
    }
  }, [content, editor]);

  const handleRefine = async (type: 'refine' | 'audit') => {
    if (!editor) return;

    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    
    if (!selectedText || selectedText.length < 10) {
      toast.info("Por favor, selecciona al menos una frase para procesar.");
      return;
    }

    const toastId = toast.loading(type === 'refine' ? "Refinando con IA..." : "Auditando estilo...");

    try {
      const response = await fetch(getApiUrl('/api/thesis/refine-section'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          instruction: type === 'refine' 
            ? "Mejora el rigor académico, la fluidez y el vocabulario. Mantén el significado." 
            : "Busca errores de coherencia, uso de primera persona y falta de rigor académico. Sugiere mejoras detalladas."
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (type === 'refine') {
            editor.chain().focus().insertContent(data.refined).run();
            toast.success("Texto refinado e insertado.", { id: toastId });
        } else {
            if (onAuditResult) {
                onAuditResult(data.refined);
            }
            toast.success("Auditoría completada. Revisa el panel lateral.", { id: toastId });
        }
      } else {
        toast.error("Error al procesar con IA.", { id: toastId });
      }
    } catch (error) {
      toast.error("Error de conexión.", { id: toastId });
    }
  };

  const getWordCount = () => {
    if (!editor) return 0;
    const text = editor.getText();
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleResearch = async () => {
    if (!editor) return;

    const selection = editor.state.selection;
    let query = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    
    if (!query || query.length < 5) {
      // Si no hay selección, intentamos tomar el párrafo actual
      const { $from } = selection;
      query = $from.parent.textContent;
    }

    if (!query || query.length < 5) {
      toast.info("Escribe o selecciona un concepto para investigar.");
      return;
    }

    const toastId = toast.loading("Buscando fuentes académicas...");

    try {
      const response = await fetch(getApiUrl('/api/thesis/research-context'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          project_id: projectId,
          model: "openrouter"
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (onResearchResult) {
          onResearchResult(data.results);
        }
        toast.success("Búsqueda completada. Revisa el panel de investigación.", { id: toastId });
      } else {
        toast.error("Error al buscar fuentes.", { id: toastId });
      }
    } catch (error) {
      toast.error("Error de conexión.", { id: toastId });
    }
  };

  const handleRAGInternal = async () => {
    if (!onRAG) return;
    
    const selection = editor?.state.selection;
    const selectedText = editor?.state.doc.textBetween(selection?.from || 0, selection?.to || 0, ' ');
    
    if (selectedText && selectedText.length > 5) {
        onRAG(`Expande y fundamenta este texto usando mis documentos: "${selectedText}"`);
    } else {
        onRAG("Genera contenido basado en mis documentos para esta sección.");
    }
  };

  useImperativeHandle(ref, () => ({
    insertCitation: (citation: string) => {
      if (editor) {
        editor.chain().focus().insertContent(` (${citation}) `).run();
      }
    },
    // Alias used by the editor page when inserting citations from the sidebar
    insertContent: (text: string) => {
      if (editor) {
        editor.chain().focus().insertContent(text).run();
      }
    }
  }));

  return (
    <div className="flex flex-col h-full">
      <MenuBar editor={editor} onRefine={handleRefine} onResearch={handleResearch} onRAG={handleRAGInternal} />
      <div className="flex-grow overflow-auto rounded-xl custom-scrollbar relative">
        <EditorContent editor={editor} />
        <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">
          {getWordCount()} Palabras
        </div>
      </div>
    </div>
  );
});

export default TipTapEditor;
