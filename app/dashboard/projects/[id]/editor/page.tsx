"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Save, FileText, CheckCircle2, Sparkles, Download, X, 
  BrainCircuit, ShieldCheck, Search, BookOpen, Fingerprint, RotateCcw, 
  ExternalLink, Paperclip, Upload, Trash2, Plus 
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';
import TipTapEditor from '@/components/TipTapEditor';

export default function ProjectEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAbstract, setGeneratingAbstract] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'research' | 'references'>('audit');
  const [auditResults, setAuditResults] = useState<string | null>(null);
  const [researchResults, setResearchResults] = useState<any>(null);
  const [references, setReferences] = useState<any[]>([]);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [ragInstruction, setRagInstruction] = useState("");
  
  const [content, setContent] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const editorRef = React.useRef<any>(null);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [plagiarismReport, setPlagiarismReport] = useState<any>(null);
  const [refreshingBib, setRefreshingBib] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  useEffect(() => {
    fetchProjectDetails();
    fetchReferences();
  }, [id]);

  // Auto-save logic
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave();
      setHasUnsavedChanges(false);
    }, 5000); // 5 seconds for auto-save

    return () => clearTimeout(timer);
  }, [content, hasUnsavedChanges]);

  const fetchReferences = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/upload/references/${id}`));
      if (response.ok) {
        const data = await response.json();
        setReferences(data);
      }
    } catch (e) {
      console.error("Error fetching references:", e);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/thesis/status/${id}`));

      if (response.ok) {
        const data = await response.json();
        if (data.status !== 'completed') {
            toast.error("El proyecto aÃºn no estÃ¡ listo para ediciÃ³n.");
            router.push(`/dashboard/projects/${id}`);
            return;
        }
        setProject(data);
        setPlagiarismReport(data.plagiarism_report || null);
        
        // Handle content 
        if (data.content && typeof data.content === 'object') {
            setContent(data.content);
            const keys = Object.keys(data.content);
            if (keys.length > 0) {
                setActiveSection(keys[0]);
            }
        }
      } else {
        toast.error("Proyecto no encontrado");
        router.push('/dashboard/projects');
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const response = await fetch(getApiUrl(`/api/thesis/update/${id}`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            toast.success("Cambios guardados correctamente.");
        } else {
            toast.error("Error al guardar cambios.");
        }
    } catch (error) {
        toast.error("Error de conexiÃ³n al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    window.location.href = getApiUrl(`/api/thesis/download-pdf/${id}`);
  };

  const handleDownloadDOCX = () => {
    window.location.href = getApiUrl(`/api/thesis/download/${id}`);
  };

  const handleUploadPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    setUploadingRef(true);
    const toastId = toast.loading(`Subiendo ${file.name}...`);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(getApiUrl(`/api/upload/reference/${id}`), {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success("Documento integrado al corpus RAG.", { id: toastId });
        fetchReferences();
      } else {
        toast.error("Error al subir documento.", { id: toastId });
      }
    } catch (error) {
      toast.error("Error de conexiÃ³n.", { id: toastId });
    } finally {
      setUploadingRef(false);
    }
  };

  const handleDeleteReference = async (refId: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/upload/reference/${id}/${refId}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success("Referencia eliminada.");
        fetchReferences();
      }
    } catch (e) {
      toast.error("Error al eliminar.");
    }
  };

  const handleGenerateAbstract = async () => {
    setGeneratingAbstract(true);
    const toastId = toast.loading("Generando resumen acadÃ©mico...");
    try {
      const response = await fetch(getApiUrl(`/api/thesis/generate-abstract/${id}`), {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        toast.success("Resumen generado con Ã©xito.", { id: toastId });
        setProject((prev: any) => ({
          ...prev,
          content: {
            ...prev.content,
            "Resumen": data.abstract
          }
        }));
        setContent(prev => ({ ...prev, "Resumen": data.abstract }));
        setActiveSection("Resumen");
      } else {
        toast.error("Error al generar el resumen.", { id: toastId });
      }
    } catch (e) {
      toast.error("Error de conexiÃ³n.", { id: toastId });
    } finally {
      setGeneratingAbstract(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    setCheckingPlagiarism(true);
    const toastId = toast.loading("Escaneando integridad acadÃ©mica y plagio...");
    try {
      const response = await fetch(getApiUrl(`/api/thesis/plagiarism-check/${id}`), {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setPlagiarismReport(data);
        toast.success("Escaneo completado.", { id: toastId });
        setActiveTab('audit');
        setIsSidebarOpen(true);
      } else {
        toast.error("Error en el escaneo.", { id: toastId });
      }
    } catch (e) {
      toast.error("Error de conexiÃ³n.", { id: toastId });
    } finally {
      setCheckingPlagiarism(false);
    }
  };

  const handleRefreshBib = async () => {
    setRefreshingBib(true);
    const toastId = toast.loading("Sincronizando bibliografÃ­a...");
    try {
      const response = await fetch(getApiUrl(`/api/thesis/refresh-bibliography/${id}`), {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setContent(prev => ({ ...prev, "BibliografÃ­a": data.bibliography }));
        toast.success("BibliografÃ­a actualizada.", { id: toastId });
        setActiveSection("BibliografÃ­a");
      } else {
        toast.error("Error al actualizar bibliografÃ­a.", { id: toastId });
      }
    } catch (e) {
      toast.error("Error de conexiÃ³n.", { id: toastId });
    } finally {
      setRefreshingBib(false);
    }
  };

  const handleContentChange = (newMarkdown: string) => {
      if (activeSection) {
          setContent(prev => ({
              ...prev,
              [activeSection]: newMarkdown
          }));
          setHasUnsavedChanges(true);
      }
  };

  const handleAddSection = () => {
    if (newSectionName && !content[newSectionName]) {
      setContent(prev => ({
        ...prev,
        [newSectionName]: ""
      }));
      setActiveSection(newSectionName);
      setNewSectionName("");
      setIsAddingSection(false);
      setHasUnsavedChanges(true);
      toast.success(`SecciÃ³n "${newSectionName}" aÃ±adida.`);
    } else if (newSectionName) {
      toast.error("La secciÃ³n ya existe.");
    }
  };

  const handleAuditResult = (result: string) => {
    setAuditResults(result);
    setActiveTab('audit');
    setIsSidebarOpen(true);
  };

  const handleDeleteSection = async (sectionName: string) => {
    if (sectionName === "BibliografÃ­a") {
        toast.error("No se puede eliminar la secciÃ³n de BibliografÃ­a.");
        return;
    }
    
    if (confirm(`Â¿EstÃ¡s seguro de eliminar la secciÃ³n "${sectionName}"? Esta acciÃ³n no se puede deshacer.`)) {
        try {
            const response = await fetch(getApiUrl(`/api/thesis/delete-section/${id}/${sectionName}`), {
                method: 'DELETE'
            });
            if (response.ok) {
                setContent(prev => {
                    const newContent = { ...prev };
                    delete newContent[sectionName];
                    return newContent;
                });
                if (activeSection === sectionName) setActiveSection(null);
                toast.success("SecciÃ³n eliminada exitosamente.");
            } else {
                toast.error("Error al eliminar la secciÃ³n del servidor.");
            }
        } catch (e) {
            toast.error("Error de conexiÃ³n al eliminar secciÃ³n.");
        }
    }
  };

  const handleRenameSection = async (oldName: string) => {
    if (oldName === "BibliografÃ­a") {
        toast.error("No se puede renombrar la secciÃ³n de BibliografÃ­a.");
        return;
    }

    const newName = prompt(`Renombrar "${oldName}" a:`, oldName);
    if (newName && newName !== oldName) {
        if (content[newName]) {
            toast.error("Ya existe una secciÃ³n con ese nombre.");
            return;
        }

        try {
            const response = await fetch(getApiUrl(`/api/thesis/rename-section/${id}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_name: oldName, new_name: newName })
            });
            if (response.ok) {
                setContent(prev => {
                    const newContent = { ...prev };
                    newContent[newName] = newContent[oldName];
                    delete newContent[oldName];
                    return newContent;
                });
                if (activeSection === oldName) setActiveSection(newName);
                toast.success("SecciÃ³n renombrada exitosamente.");
            } else {
                toast.error("Error al renombrar la secciÃ³n en el servidor.");
            }
        } catch (e) {
            toast.error("Error de conexiÃ³n al renombrar secciÃ³n.");
        }
    }
  };


    const handleRAG = async (instruction: string) => {
        if (!activeSection) {
            toast.error("Selecciona una secciÃ³n primero.");
            return;
        }

        const toastId = toast.loading("Sintetizando informaciÃ³n de tus documentos...");

        try {
            const response = await fetch(getApiUrl('/api/thesis/rag-write'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instruction: instruction,
                    project_id: id,
                    section_id: activeSection,
                    provider: "openrouter"
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (editorRef.current) {
                    editorRef.current.insertContent(data.text);
                    toast.success("Contenido generado e insertado.", { id: toastId });
                }
            } else {
                toast.error("Error al generar con RAG.", { id: toastId });
            }
        } catch (error) {
            toast.error("Error de conexiÃ³n.", { id: toastId });
        }
    };

    const handleResearchResult = (result: any) => {
        setResearchResults(result);
        setActiveTab('research');
        setIsSidebarOpen(true);
    };

    const insertCitationToEditor = (citation: string) => {
        if (editorRef.current) {
            editorRef.current.insertContent(` (${citation})`);
            toast.success("Cita insertada en el documento.");
        } else {
            toast.error("No se pudo insertar la cita: editor no listo.");
        }
    };

    return (
      <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 uppercase tracking-widest text-xs font-black">Cargando Proyecto...</p>
            </div>
          </div>
        ) : project ? (
          <>
            {/* â”€â”€ Top Header Bar â”€â”€ */}
            <header className="shrink-0 flex items-center justify-between px-5 py-3 bg-slate-900/80 backdrop-blur border-b border-white/10 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => router.push(`/dashboard/projects/${id}`)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0">
                  <h1 className="font-black text-white text-sm truncate">{project.title}</h1>
                  <p className="text-[10px] uppercase tracking-widest font-bold mt-0.5">
                    {saving ? (
                      <span className="text-amber-400">Guardando...</span>
                    ) : hasUnsavedChanges ? (
                      <span className="text-amber-400">âš  Sin guardar</span>
                    ) : (
                      <span className="text-emerald-400">âœ“ Guardado</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                <button
                  onClick={handleGenerateAbstract}
                  disabled={generatingAbstract}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded-lg hover:bg-violet-500/20 transition-all text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                >
                  {generatingAbstract ? <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={12} />}
                  Resumen
                </button>
                <button
                  onClick={handleCheckPlagiarism}
                  disabled={checkingPlagiarism}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                >
                  {checkingPlagiarism ? <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Fingerprint size={12} />}
                  Plagio
                </button>
                <button
                  onClick={handleRefreshBib}
                  disabled={refreshingBib}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-all text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                >
                  {refreshingBib ? <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" /> : <RotateCcw size={12} />}
                  BibliografÃ­a
                </button>
                <div className="w-px h-5 bg-white/10 mx-1" />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-all text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                >
                  <Save size={12} /> Guardar
                </button>
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`p-1.5 rounded-lg border transition-all ${isSidebarOpen ? 'bg-slate-700 border-white/20 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                  title="Panel de asistente"
                >
                  <BrainCircuit size={15} />
                </button>
                <div className="w-px h-5 bg-white/10 mx-1" />
                <button
                  onClick={handleDownloadDOCX}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all text-[10px] font-black uppercase tracking-wider"
                >
                  <Download size={12} /> DOCX
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all text-[10px] font-black uppercase tracking-wider"
                >
                  <FileText size={12} /> PDF
                </button>
              </div>
            </header>

            {/* â”€â”€ Main Content â”€â”€ */}
            <div className="flex flex-1 overflow-hidden">

              {/* Section Sidebar */}
              <aside className="w-56 shrink-0 flex flex-col bg-slate-900/60 border-r border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secciones</span>
                  <button
                    onClick={() => setIsAddingSection(!isAddingSection)}
                    className="p-1 rounded-md text-slate-500 hover:text-primary hover:bg-primary/10 transition-all"
                    title="AÃ±adir secciÃ³n"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {isAddingSection && (
                  <div className="p-3 border-b border-white/10 space-y-2 shrink-0">
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                      placeholder="Nombre de secciÃ³n..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary/50"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddSection}
                        className="flex-1 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/30 transition-all"
                      >
                        AÃ±adir
                      </button>
                      <button
                        onClick={() => { setIsAddingSection(false); setNewSectionName(''); }}
                        className="py-1 px-2 text-slate-500 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}

                <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                  {Object.keys(content)
                    .filter(k => !k.startsWith('_'))
                    .map((section) => (
                      <div
                        key={section}
                        className={`group relative flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all mx-2 rounded-xl mb-1 ${
                          activeSection === section
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                        onClick={() => setActiveSection(section)}
                      >
                        <FileText size={11} className="shrink-0" />
                        <span className="text-[11px] font-bold truncate flex-1">{section}</span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRenameSection(section); }}
                            className="p-0.5 text-slate-500 hover:text-white transition-colors rounded"
                            title="Renombrar"
                          >
                            <ExternalLink size={9} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSection(section); }}
                            className="p-0.5 text-slate-500 hover:text-red-400 transition-colors rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      </div>
                    ))}
                </nav>

                <div className="px-4 py-3 border-t border-white/10 shrink-0">
                  <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest text-center">
                    {Object.keys(content).filter(k => !k.startsWith('_')).length} Secciones
                  </p>
                </div>
              </aside>

              {/* Editor Area */}
              <main className="flex-1 flex flex-col overflow-hidden">
                {activeSection ? (
                  <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                    <div className="flex items-center justify-between shrink-0">
                      <div>
                        <h2 className="text-sm font-black text-white">{activeSection}</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">SecciÃ³n activa</p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <TipTapEditor
                        ref={editorRef}
                        projectId={id as string}
                        activeSection={activeSection}
                        content={content[activeSection] || ''}
                        onChange={handleContentChange}
                        onAuditResult={handleAuditResult}
                        onResearchResult={handleResearchResult}
                        onRAG={handleRAG}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 p-12">
                    <div className="text-center space-y-4">
                      <BookOpen size={48} className="mx-auto opacity-20" />
                      <p className="font-black uppercase tracking-widest text-sm">
                        Selecciona una secciÃ³n del panel izquierdo
                      </p>
                    </div>
                  </div>
                )}
              </main>

              {/* Assistant Sidebar */}
              {isSidebarOpen && (
                <aside className="w-72 shrink-0 flex flex-col bg-slate-900/40 border-l border-white/10 overflow-hidden">
                  <div className="flex border-b border-white/10 shrink-0">
                    <button
                      onClick={() => setActiveTab('audit')}
                      className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${activeTab === 'audit' ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <ShieldCheck size={11} /> DiagnÃ³stico
                    </button>
                    <button
                      onClick={() => setActiveTab('research')}
                      className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${activeTab === 'research' ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <Search size={11} /> Fuentes
                    </button>
                    <button
                      onClick={() => setActiveTab('references')}
                      className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${activeTab === 'references' ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <Paperclip size={11} /> RAG
                    </button>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-3 text-slate-500 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                    {activeTab === 'audit' ? (
                      <>
                        {plagiarismReport && (
                          <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Fingerprint size={11} className="text-emerald-400" /> Originalidad
                              </h4>
                              <span className={`text-lg font-black ${plagiarismReport.score < 15 ? 'text-emerald-400' : plagiarismReport.score < 30 ? 'text-amber-400' : 'text-red-400'}`}>
                                {100 - plagiarismReport.score}%
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${plagiarismReport.score < 15 ? 'bg-emerald-500' : plagiarismReport.score < 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${100 - plagiarismReport.score}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
                              <CheckCircle2 size={10} className="text-emerald-400" />
                              <span>{plagiarismReport.citations_found} Citas Detectadas</span>
                            </div>
                            <p className="text-[10px] text-slate-500 italic leading-relaxed">{plagiarismReport.message}</p>
                          </div>
                        )}
                        <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                          <BrainCircuit size={13} /> CrÃ­tica de Estilo
                        </h3>
                        {auditResults ? (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
                            <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{auditResults}</div>
                          </div>
                        ) : (
                          <div className="h-32 flex flex-col items-center justify-center text-center opacity-40">
                            <ShieldCheck size={28} className="text-slate-600 mb-2" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                              Selecciona texto<br />y presiona "Auditar Estilo"
                            </p>
                          </div>
                        )}
                      </>
                    ) : activeTab === 'research' ? (
                      <>
                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          <BookOpen size={13} /> Investigador Senior
                        </h3>
                        {researchResults ? (
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest flex items-center gap-1">
                              <Sparkles size={9} /> Click en una cita para insertar
                            </p>
                            {researchResults.structured?.citations?.map((cite: string, idx: number) => (
                              <div
                                key={idx}
                                onClick={() => insertCitationToEditor(cite)}
                                className="group bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/40 transition-all cursor-pointer"
                              >
                                <p className="text-slate-300 text-xs leading-relaxed mb-2">{cite}</p>
                                <span className="text-[9px] font-black text-blue-400 opacity-60 group-hover:opacity-100 uppercase tracking-widest flex items-center gap-1">
                                  <CheckCircle2 size={9} /> Insertar en cursor
                                </span>
                              </div>
                            ))}
                            {(researchResults.structured?.concepts?.length ?? 0) > 0 && (
                              <div className="pt-3 border-t border-white/5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Conceptos Clave</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {researchResults.structured.concepts.map((concept: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] text-slate-400 font-bold uppercase">
                                      {concept}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-32 flex flex-col items-center justify-center text-center opacity-40">
                            <Search size={28} className="text-slate-600 mb-2" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                              Selecciona texto<br />y presiona "Investigar"
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                            <Paperclip size={13} /> Documentos RAG
                          </h3>
                          <label className="cursor-pointer p-1.5 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-all" title="Subir PDF">
                            <Upload size={12} />
                            <input type="file" className="hidden" accept=".pdf" onChange={handleUploadPDF} disabled={uploadingRef} />
                          </label>
                        </div>
                        {uploadingRef && (
                          <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl animate-pulse">
                            <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Procesando PDF...</span>
                          </div>
                        )}
                        <div className="space-y-2">
                          {references.length > 0 ? references.map((ref) => (
                            <div key={ref.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between group hover:bg-white/8 transition-all">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={11} className="text-slate-500 shrink-0" />
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-200 truncate">{ref.filename}</p>
                                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Indexado para RAG</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteReference(ref.id)}
                                className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )) : (
                            <div className="h-32 flex flex-col items-center justify-center text-center opacity-40">
                              <Paperclip size={28} className="text-slate-600 mb-2" />
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                                Sube PDFs para<br />alimentar el motor RAG
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest pt-2 border-t border-white/5 leading-relaxed">
                          La IA usarÃ¡ estos documentos al presionar "Escribir con RAG"
                        </p>
                      </>
                    )}
                  </div>
                </aside>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }
