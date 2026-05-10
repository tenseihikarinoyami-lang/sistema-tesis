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
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';


export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
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
        router.push('/projects');
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.location.href = getApiUrl(`/api/thesis/download/${id}`);
  };


  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto definitivamente?")) return;
    
    setDeleting(true);
    try {
      const response = await fetch(getApiUrl(`/api/thesis/delete/${id}`), {

        method: 'DELETE'
      });
      if (response.ok) {
        toast.success("Proyecto eliminado correctamente");
        router.push('/projects');
      } else {
        toast.error("Error al eliminar el proyecto");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
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
            onClick={() => router.push('/projects')}
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
            <button 
              onClick={handleDownload}
              className="academic-btn-gold flex-grow md:flex-grow-0 flex items-center justify-center gap-3 px-8"
            >
              <Download size={20} /> Descargar Tesis
            </button>
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
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-accent" /> Documentos Generados
              </h3>
              
              <div className="space-y-4">
                 {project.status === 'completed' ? (
                   <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Tesis_Final.docx</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Microsoft Word</p>
                        </div>
                      </div>
                      <button onClick={handleDownload} className="p-2 text-slate-400 group-hover:text-primary transition-colors">
                        <Download size={18} />
                      </button>
                   </div>
                 ) : (
                   <div className="p-10 text-center space-y-4 opacity-50">
                      <Clock size={32} className="mx-auto text-gray-600 animate-spin-slow" />
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Generando Archivos...</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="glass p-8 rounded-[3rem] border border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Seguridad Académica</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-wider">
                TODOS LOS PROYECTOS GENERADOS SON CIFRADOS Y ALMACENADOS EN LA INFRAESTRUCTURA PRIVADA DE OBELISCO. EL ACCESO ES EXCLUSIVO PARA EL INVESTIGADOR AUTORIZADO.
              </p>
           </div>
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
