'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  ChevronRight, 
  Download, 
  Eye, 
  MoreVertical,
  Search,
  Plus
} from 'lucide-react';
import Link from 'next/link';

import { useSearchParams } from 'next/navigation';
import { getApiUrl } from '@/lib/api';


export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(query || '');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    if (query) {
      setSearchTerm(query);
    }
  }, [query]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(getApiUrl('/api/thesis/list'));

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        setFilteredProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = projects.filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);

  const handleDownload = async (projectId: string, title: string) => {
    try {
      window.location.href = getApiUrl(`/api/thesis/download/${projectId}`);

    } catch (error) {
      console.error("Error downloading project:", error);
      alert("Error al descargar la tesis");
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.")) return;
    
    try {
      const response = await fetch(getApiUrl(`/api/thesis/delete/${projectId}`), {

        method: 'DELETE'
      });
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setActiveMenu(null);
      } else {
        alert("Error al eliminar el proyecto");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Error de conexión al intentar eliminar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-white academic-text mb-4 tracking-tighter">Mis Investigaciones</h1>
          <p className="text-gray-400">Gestiona y descarga tus proyectos generados por OBELISCO.</p>
        </div>
        <Link href="/dashboard/new-project">
          <button className="academic-btn-gold flex items-center gap-2">
            <Plus size={20} /> Nueva Tesis
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Proyectos" value={projects.length.toString()} icon={<FileText className="text-accent" />} />
        <StatCard title="En Proceso" value={projects.filter(p => p.status === 'processing').length.toString()} icon={<Clock className="text-yellow-500" />} />
        <StatCard title="Completados" value={projects.filter(p => p.status === 'completed').length.toString()} icon={<ChevronRight className="text-green-500" />} />
      </div>

      <div className="glass academic-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar investigaciones..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="academic-input pl-12 h-12 bg-black/20 border-white/5"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {projects.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <FileText size={48} className="mx-auto text-gray-700" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No hay proyectos activos</p>
              <Link href="/dashboard/new-project">
                <button className="text-accent text-sm font-black hover:underline underline-offset-8">INICIAR PRIMERA INVESTIGACIÓN</button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <th className="px-8 py-6">Proyecto</th>
                  <th className="px-8 py-6">Estado</th>
                  <th className="px-8 py-6">Fecha</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                          <FileText size={24} />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-accent transition-colors">
                            {project.title}
                          </div>
                          <div className="text-xs text-gray-500">{project.university} • {project.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {project.status === 'completed' ? (
                        <span className="px-4 py-1.5 bg-green-500/10 text-green-500 text-[10px] font-black uppercase rounded-full border border-green-500/20">
                          Completado
                        </span>
                      ) : project.status === 'error' ? (
                        <span className="px-4 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-full border border-red-500/20">
                          Error
                        </span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                             <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">{project.current_phase}</span>
                             <span className="text-[10px] font-bold text-accent">{project.progress}%</span>
                          </div>
                          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${project.progress}%` }}
                              className="h-full bg-accent"
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-400">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-end gap-2 relative">
                        <Link href={`/dashboard/projects/${project.id}`}>
                          <button className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all" title="Ver Detalles">
                            <Eye size={18} />
                          </button>
                        </Link>
                        {project.status === 'completed' && (
                          <button 
                            onClick={() => handleDownload(project.id, project.title)}
                            className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all" 
                            title="Descargar DOCX"
                          >
                            <Download size={18} />
                          </button>
                        )}
                        <div className="relative">
                          <button 
                            onClick={() => setActiveMenu(activeMenu === project.id ? null : project.id)}
                            className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {activeMenu === project.id && (
                            <div className="absolute right-0 mt-2 w-48 glass border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                              <button 
                                onClick={() => handleDelete(project.id)}
                                className="w-full text-left px-6 py-4 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                Eliminar Proyecto
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="glass academic-card p-8 flex items-center gap-6">
      <div className="p-4 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <div>
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{title}</div>
        <div className="text-3xl font-black text-white">{value}</div>
      </div>
    </div>
  );
}
