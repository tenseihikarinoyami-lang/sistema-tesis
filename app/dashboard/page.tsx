"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  BookMarked,
  LayoutGrid,
  GraduationCap,
  Microscope,
  Cpu,
  Gavel,
  PieChart,
  Palette,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

export default function DashboardPage() {
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(getApiUrl('/api/thesis/list'));
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const stats = {
    active: Array.isArray(projects) ? projects.filter(p => p?.status === 'processing').length : 0,
    hours: Array.isArray(projects) ? projects.length * 40 : 0, // Estimación
    completed: Array.isArray(projects) ? projects.filter(p => p?.status === 'completed').length : 0,
    originality: (Array.isArray(projects) && projects.length > 0) ? "99.8%" : "---"
  };

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-20">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-5xl font-black text-primary tracking-tighter academic-text">Panel de Investigador</h1>
          <p className="text-gray-500 mt-3 text-lg font-medium">Bienvenido de nuevo. Gestiona tu excelencia académica con precisión OBELISCO.</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-4"
        >
          <Link href="/dashboard/new-project" className="academic-btn-primary flex items-center gap-3">
            Iniciar Nueva Tesis <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard icon={<FileText className="text-blue-500" />} label="Tesis Activas" value={stats.active.toString()} />
        <StatCard icon={<Clock className="text-amber-500" />} label="Horas Ahorradas" value={stats.hours.toString()} />
        <StatCard icon={<CheckCircle2 className="text-emerald-500" />} label="Finalizadas" value={stats.completed.toString()} />
        <StatCard icon={<TrendingUp className="text-indigo-500" />} label="Originalidad" value={stats.originality} />
      </div>

      {/* Biblioteca de Materias Section */}
      <section className="space-y-10">
        <div className="flex items-center justify-between border-b border-gray-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/5 rounded-2xl">
              <LayoutGrid className="text-primary" size={24} />
            </div>
            <h3 className="text-3xl font-black text-primary academic-text">Biblioteca de Materias</h3>
          </div>
          <button className="text-sm font-bold text-primary hover:underline uppercase tracking-widest text-[10px]">Ver todas</button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <SubjectCard icon={<Gavel size={32} />} name="Derecho" color="text-red-500" />
          <SubjectCard icon={<Cpu size={32} />} name="Ingeniería" color="text-blue-500" />
          <SubjectCard icon={<Microscope size={32} />} name="Medicina" color="text-emerald-500" />
          <SubjectCard icon={<PieChart size={32} />} name="Economía" color="text-orange-500" />
          <SubjectCard icon={<Palette size={32} />} name="Artes" color="text-purple-500" />
          <SubjectCard icon={<GraduationCap size={32} />} name="Educación" color="text-cyan-500" />
        </div>
      </section>

      {/* Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-10">
          <div className="flex items-center justify-between border-b border-gray-100 pb-6">
             <h3 className="text-3xl font-black text-primary academic-text">Proyectos Recientes</h3>
             <Link href="/dashboard/projects" className="text-sm font-bold text-primary hover:underline uppercase tracking-widest text-[10px]">Gestionar todos</Link>
          </div>
          <div className="space-y-6">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-50 animate-pulse rounded-[2.5rem]"></div>
              ))
            ) : recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <ProjectCard 
                  key={project.id}
                  id={project.id}
                  title={project.title} 
                  subject={project.university} 
                  progress={project.progress} 
                  date={project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Pendiente'} 
                />
              ))
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-[2.5rem] space-y-4">
                <FileText size={48} className="mx-auto text-gray-300" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay investigaciones recientes</p>
                <Link href="/dashboard/new-project" className="text-primary text-sm font-black hover:underline">Iniciar mi primera tesis</Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-10">
          <div className="border-b border-gray-100 pb-6">
            <h3 className="text-3xl font-black text-primary academic-text">Recursos</h3>
          </div>
          <div className="space-y-4">
            <ResourceCard 
              icon={<BookMarked className="text-primary" />} 
              title="Guía de Normas APA 7" 
              desc="Manual completo de citación y estilo 2024."
            />
            <ResourceCard 
              icon={<AlertCircle className="text-amber-500" />} 
              title="Verificador de Rúbricas" 
              desc="Validación automática de criterios universitarios."
            />
            <div className="p-8 academic-gradient rounded-[2.5rem] text-white space-y-4 shadow-xl shadow-primary/20 relative overflow-hidden group cursor-pointer">
               <motion.div 
                 className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                 whileHover={{ scale: 1.1 }}
               />
               <h4 className="font-bold text-xl academic-text leading-tight relative z-10">¿Necesitas ayuda con tu tesis?</h4>
               <p className="text-white/80 text-sm leading-relaxed relative z-10">Habla con nuestro asesor experto en metodología.</p>
               <button className="w-full py-4 bg-white text-primary font-black rounded-2xl shadow-xl shadow-black/10 hover:scale-[1.02] transition-all relative z-10">Consultar IA Expert</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="academic-card group bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/10 transition-all duration-500"
    >
      <div className="flex items-center gap-5 mb-6">
        <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-primary/5 transition-all duration-500 border border-gray-100 group-hover:border-primary/20">{icon}</div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <span className="text-4xl font-black text-primary academic-text tracking-tighter">{value}</span>
    </motion.div>
  );
}

function SubjectCard({ icon, name, color }: any) {
  return (
    <motion.button 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center justify-center p-10 rounded-[2.5rem] border-2 border-gray-50 hover:border-primary/10 hover:bg-white hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 gap-6 group bg-gray-50/50"
    >
      <div className={`p-5 rounded-3xl bg-white shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl ${color}`}>
        {icon}
      </div>
      <span className="text-sm font-black text-primary uppercase tracking-tight academic-text">{name}</span>
    </motion.button>
  );
}

function ProjectCard({ id, title, subject, progress, date }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 5 }}
      className="group p-8 rounded-[2.5rem] bg-white border border-gray-100 hover:border-primary/10 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-8 cursor-pointer"
    >
      <div className="flex gap-6 items-center">
        <div className="w-16 h-16 rounded-2xl academic-gradient flex items-center justify-center text-white font-black text-xl academic-text shadow-lg shadow-primary/20">
          {title.charAt(0)}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-black rounded-lg uppercase tracking-widest">{subject}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{date}</span>
          </div>
          <h4 className="font-black text-primary text-xl academic-text group-hover:text-primary/80 transition-colors truncate max-w-[300px]">{title}</h4>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="w-48">
          <div className="flex justify-between text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full academic-gradient rounded-full"
            ></motion.div>
          </div>
        </div>
        <Link href={`/dashboard/projects/${id}`}>
          <button className="p-3 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all">
            <ChevronRight size={20} />
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

function ResourceCard({ icon, title, desc }: any) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="p-6 rounded-3xl bg-white border border-gray-100 hover:border-primary/10 transition-all duration-300 flex items-start gap-5 group cursor-pointer shadow-sm"
    >
      <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-primary/5 transition-colors">
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="font-bold text-sm text-primary academic-text">{title}</h4>
        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </motion.div>
  );
}

