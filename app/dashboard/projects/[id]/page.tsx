"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  ChevronLeft, 
  Download, 
  Trash2,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Globe,
  Tag,
  Upload,
  Database,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';


export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [references, setReferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
    fetchReferences();
    const interval = setInterval(() => {
      if (project?.status === 'processing') {
        fetchProjectDetails();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id, project?.status]);

  const fetchProjectDetails = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/thesis/status/${id}`));

      if (response.ok) {
        const data = await response.json();
        setProject(data);
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

  const handleDownloadDOCX = () => {
    window.location.href = getApiUrl(`/api/thesis/download/${id}`);
  };

  const handleDownloadPDF = () => {
    window.location.href = getApiUrl(`/api/thesis/download-pdf/${id}`);
  };


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

  const handleDeleteReference = async (refId: string) => {
    if (!confirm("¿Eliminar esta referencia?")) return;
    try {
      const response = await fetch(getApiUrl(`/api/upload/reference/${id}/${refId}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success("Referencia eliminada");
        setReferences(prev => prev.filter(r => r.id !== refId));
      }
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };
  const handleDelete = async () => {
    if (!confirm('¿Eliminar este proyecto permanentemente? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      const response = await fetch(getApiUrl(`/api/thesis/project/${id}`), { method: 'DELETE' });
      if (response.ok) {
        toast.success('Proyecto eliminado');
        router.push('/dashboard/projects');
      } else {
        toast.error('No se pudo eliminar el proyecto');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setDeleting(false);
    }
  };

  const handlePlagiarismCheck = async () => {
    setCheckingPlagiarism(true);
    const toastId = toast.loading('Analizando originalidad...');
    try {
      const response = await fetch(getApiUrl(`/api/thesis/plagiarism/${id}`), { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setProject((prev: any) => ({ ...prev, plagiarism_report: data }));
        toast.success('Análisis completado', { id: toastId });
      } else {
        toast.error('Error en el análisis', { id: toastId });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
    } finally {
      setCheckingPlagiarism(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.pdf')) {
      toast.error('Solo se permiten archivos PDF');
      return;
    }
    setUploading(true);
    const toastId = toast.loading(`Subiendo ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(getApiUrl(`/api/upload/reference/${id}`), {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setReferences((prev: any[]) => [...prev, data]);
        toast.success('PDF indexado para RAG', { id: toastId });
      } else {
        toast.error('Error al subir el PDF', { id: toastId });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRefreshBibliography = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/thesis/refresh-bibliography/${id}`), {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setProject((prev: any) => ({
          ...prev,
          content: { ...prev.content, Bibliografía: data.bibliography }
        }));
        toast.success("Bibliografía actualizada con base en el contenido actual");
      } else {
        toast.error("No se pudo actualizar la bibliografía");
      }
    } catch (e) {
      toast.error("Error de conexión");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(79,70,229,0.3)]"></div>
        <p className="text-accent font-black uppercase tracking-[0.4em] text-xs animate-pulse">Accediendo al Archivo OBELISCO</p>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <button 
            onClick={() => router.push('/dashboard/projects')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver al Listado
          </button>
          <h1 className="text-5xl font-black text-white academic-text tracking-tighter leading-tight max-w-3xl">
            {project.title}
          </h1>
          <div className="flex flex-wrap gap-4 items-center text-gray-500 text-sm font-medium">
             <span className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
               <Tag size={14} className="text-accent" /> {project.id}
             </span>
             <span className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
               <Calendar size={14} className="text-primary" /> {new Date(project.created_at).toLocaleDateString()}
             </span>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {project.status === 'completed' && (
            <>
              <button 
                onClick={() => router.push(`/dashboard/projects/${id}/editor`)}
                className="academic-btn flex-grow md:flex-grow-0 flex items-center justify-center gap-3 px-8"
              >
                <FileText size={20} /> Editar Tesis
              </button>
              <button 
                onClick={handleDownloadDOCX}
                className="academic-btn-gold flex-grow md:flex-grow-0 flex items-center justify-center gap-3 px-8"
              >
                <Download size={20} /> Word
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="bg-red-500 hover:bg-red-600 text-white rounded-2xl flex-grow md:flex-grow-0 flex items-center justify-center gap-3 px-8 transition-all shadow-lg hover:shadow-red-500/20 font-black uppercase text-xs tracking-widest"
              >
                <Download size={20} /> PDF
              </button>
            </>
          )}
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-2xl transition-all shadow-lg hover:shadow-red-500/10 flex items-center justify-center group"
            title="Eliminar Proyecto"
          >
            {deleting ? <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={20} className="group-hover:scale-110 transition-transform" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Metadata */}
        <div className="lg:col-span-2 space-y-10">
          {/* Status Banner */}
          <div className={`glass p-8 rounded-[3rem] border flex items-center justify-between ${
            project.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/5' : 
            project.status === 'error' ? 'border-red-500/20 bg-red-500/5' : 
            'border-primary/20 bg-primary/5'
          }`}>
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl ${
                project.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 
                project.status === 'error' ? 'bg-red-500/20 text-red-500' : 
                'bg-primary/20 text-primary'
              }`}>
                {project.status === 'completed' ? <CheckCircle2 size={32} /> : 
                 project.status === 'error' ? <AlertCircle size={32} /> : 
                 <BrainCircuit size={32} className="animate-pulse" />}
              </div>
              <div>
                <h3 className="font-black text-xl text-white academic-text tracking-tight uppercase">
                  {project.status === 'completed' ? 'Investigación Completada' : 
                   project.status === 'error' ? 'Error en el Protocolo' : 
                   'Motor Obelisco Procesando'}
                </h3>
                <p className="text-sm font-medium text-slate-400">
                  {project.current_phase || 'Iniciando secuencia de generación académica...'}
                </p>
              </div>
            </div>
            
            {(project.status === 'processing' || !project.status) && (
              <div className="text-right">
                <span className="text-3xl font-black text-white academic-text">{project.progress || 0}%</span>
                <div className="w-32 h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress || 0}%` }}
                    className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Details Card */}
          <div className="glass academic-card p-12 space-y-12">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
              <h2 className="text-2xl font-black text-white academic-text tracking-tight">Ficha Técnica de Investigación</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <DetailItem icon={<GraduationCap size={20} />} label="Institución" value={project.university} />
              <DetailItem icon={<User size={20} />} label="Investigador Principal" value={project.author} />
              <DetailItem icon={<BookOpen size={20} />} label="Estructura" value={`${project.status === 'completed' ? 'Documento Finalizado' : 'Protocolo Activo'}`} />
              <DetailItem icon={<Globe size={20} />} label="Idioma del Corpus" value="Español (Académico)" />
            </div>

            <div className="pt-10 border-t border-white/5 space-y-6">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Resumen de Intenciones</h3>
               <p className="text-slate-400 leading-relaxed font-medium">
                 Este proyecto ha sido configurado bajo los estándares de rigor de la plataforma OBELISCO, utilizando modelos de lenguaje de última generación optimizados para la redacción científica. La estructura modular garantiza una coherencia transversal entre el marco teórico y los hallazgos metodológicos.
               </p>
            </div>
          </div>
        </div>

        {/* Right Column: Actions/Info */}
        <div className="space-y-8">
           <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} className="text-accent" /> Documentos Generados
                </h3>
              </div>
              
              <div className="space-y-4">
                 {project.status === 'completed' ? (
                   <>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer" onClick={handleDownloadDOCX}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Tesis_Final.docx</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Microsoft Word</p>
                          </div>
                        </div>
                        <button className="p-2 text-slate-400 group-hover:text-primary transition-colors">
                          <Download size={18} />
                        </button>
                    </div>

                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer" onClick={handleDownloadPDF}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Tesis_Final.pdf</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Adobe PDF</p>
                          </div>
                        </div>
                        <button className="p-2 text-slate-400 group-hover:text-red-400 transition-colors">
                          <Download size={18} />
                        </button>
                    </div>
                    {project.content?.Bibliografía && (
                      <button 
                        onClick={handleRefreshBibliography}
                        className="w-full py-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-accent transition-all flex items-center justify-center gap-2"
                      >
                        <Loader2 size={12} className="text-accent" /> Actualizar Bibliografía
                      </button>
                    )}
                   </>
                 ) : (
                   <div className="p-10 text-center space-y-4 opacity-50">
                      <Clock size={32} className="mx-auto text-gray-600 animate-spin-slow" />
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Generando Archivos...</p>
                   </div>
                 )}
              </div>
           </div>

            <div className="glass p-8 rounded-[3rem] border border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> Auditoría de Calidad
              </h3>
              
              {project.plagiarism_report ? (
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-white academic-text">{project.plagiarism_report.score}%</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase pb-1.5 tracking-tighter">similitud</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black text-emerald-500 uppercase">{project.plagiarism_report.citations_found} CITAS</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">Detectadas</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <div className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                      project.plagiarism_report.status === 'Safe' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                      Similitud: {project.plagiarism_report.status === 'Safe' ? 'Seguro' : 'Advertencia'}
                    </div>
                    <div className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                      project.plagiarism_report.integrity === 'Good' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      Integridad: {project.plagiarism_report.integrity}
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight bg-white/5 p-3 rounded-xl border border-white/5">
                    {project.plagiarism_report.message}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
                    Aún no se ha realizado un análisis de originalidad para este proyecto.
                  </p>
                  <button 
                    onClick={handlePlagiarismCheck}
                    disabled={checkingPlagiarism || project.status !== 'completed'}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkingPlagiarism ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                    Analizar Originalidad
                  </button>
                </div>
              )}
           </div>

           {/* RAG References Section */}
           <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Database size={16} className="text-primary" /> Bibliografía de Apoyo (RAG)
              </h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">
                Inyecta tus propios PDFs para alimentar el motor académico.
              </p>

              <div className="space-y-4">
                {references.length > 0 && (
                  <div className="space-y-2">
                    {references.map((ref, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={14} className="text-primary shrink-0" />
                          <span className="text-[10px] font-bold text-white truncate">{ref.filename}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteReference(ref.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-3xl hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-all group ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                  {uploading ? (
                    <Loader2 size={24} className="text-primary animate-spin" />
                  ) : (
                    <>
                      <Upload size={20} className="text-slate-500 group-hover:text-primary group-hover:scale-110 transition-all" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2 group-hover:text-primary transition-colors">Subir PDF</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
           </div>

           {/* Structural Plan Preview */}
           {project.content?._index?.chapters && (
             <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <BookOpen size={16} className="text-primary" /> Plan Estructural
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {project.content._index.chapters.map((ch: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-[10px] font-black text-white uppercase tracking-wider bg-white/5 p-2 rounded-lg">
                        {ch.title}
                      </p>
                      <ul className="pl-4 space-y-1">
                        {ch.subsections?.map((sub: string, sIdx: number) => (
                          <li key={sIdx} className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full" /> {sub}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
        {icon} {label}
      </div>
      <div className="text-lg font-bold text-white academic-text tracking-tight ml-7">
        {value || 'N/A'}
      </div>
    </div>
  );
}
