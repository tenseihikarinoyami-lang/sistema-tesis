'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Bell, 
  Shield, 
  Eye, 
  Moon, 
  Globe, 
  Zap,
  CheckCircle2,
  ChevronRight,
  Database,
  Cpu
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} /> },
    { id: 'security', label: 'Privacidad', icon: <Shield size={18} /> },
    { id: 'ai', label: 'Motor IA', icon: <Cpu size={18} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div>
        <h1 className="text-5xl font-black text-white academic-text mb-4 tracking-tighter uppercase">Configuración</h1>
        <p className="text-gray-400">Personaliza tu experiencia académica con el núcleo OBELISCO.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white shadow-xl shadow-black border border-white/10' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-accent' : 'text-gray-600'}>{tab.icon}</span>
              <span className="text-sm tracking-wide">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-grow space-y-8">
          {activeTab === 'general' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <section className="glass academic-card p-10 space-y-8">
                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <Eye size={20} className="text-primary" />
                  Interfaz y Apariencia
                </h3>
                
                <div className="space-y-6">
                  <SettingToggle 
                    title="Modo Oscuro Profundo" 
                    description="Optimizado para largas sesiones de investigación nocturna." 
                    enabled={true} 
                  />
                  <SettingToggle 
                    title="Animaciones de Interfaz" 
                    description="Efectos de transición suaves para una experiencia premium." 
                    enabled={true} 
                  />
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">Idioma del Sistema</p>
                      <p className="text-xs text-gray-500">Selecciona el idioma de la plataforma.</p>
                    </div>
                    <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none text-white focus:border-accent transition-all">
                      <option>Español (Latinoamérica)</option>
                      <option>English (US)</option>
                      <option>Português</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="glass academic-card p-10 space-y-8">
                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <Globe size={20} className="text-accent" />
                  Región Académica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Zona Horaria</label>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm">
                      (GMT-04:00) Caracas, Venezuela
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Normas por Defecto</label>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm">
                      APA 7ma Edición
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <section className="glass academic-card p-10 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <Zap size={20} className="text-yellow-500" />
                    Preferencias del Motor AI
                  </h3>
                  <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                    Alto Rendimiento
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/10 group hover:border-primary/30 transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                          <Cpu size={20} />
                        </div>
                        <p className="font-bold text-white">Modelo Principal: GPT-4o</p>
                      </div>
                      <CheckCircle2 size={20} className="text-accent" />
                    </div>
                    <p className="text-xs text-gray-500 ml-11">Máxima precisión académica y coherencia estructural.</p>
                  </div>

                  <SettingToggle 
                    title="Búsqueda en Tiempo Real" 
                    description="Permite a la IA acceder a fuentes web actualizadas durante la generación." 
                    enabled={true} 
                  />
                  
                  <SettingToggle 
                    title="Optimización de Originalidad" 
                    description="Aplica filtros avanzados para garantizar 0% de plagio detectado." 
                    enabled={true} 
                  />
                </div>
              </section>

              <section className="glass academic-card p-10 bg-gradient-to-br from-purple-600/10 to-transparent border-purple-600/20">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-purple-400">
                    <Database size={32} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Base de Conocimiento SIGA</h4>
                    <p className="text-xs text-gray-400">Tu repositorio privado de 500GB está sincronizado con el núcleo OBELISCO.</p>
                  </div>
                  <button className="ml-auto p-4 hover:bg-white/5 rounded-2xl transition-all">
                    <ChevronRight size={24} className="text-gray-600" />
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {/* More tabs can be implemented similarly */}
          {(activeTab === 'notifications' || activeTab === 'security') && (
            <div className="glass academic-card p-20 text-center space-y-4">
              <Settings size={48} className="mx-auto text-gray-800 animate-spin-slow" />
              <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs">Módulo en Desarrollo</p>
              <p className="text-xs text-gray-600 max-w-xs mx-auto">Estas configuraciones estarán disponibles en la próxima actualización del núcleo SIGA.</p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-10 border-t border-white/5 flex justify-end gap-4">
        <button className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-all">Descartar</button>
        <button className="academic-btn-gold px-12">Guardar Cambios</button>
      </div>
    </div>
  );
}

function SettingToggle({ title, description, enabled }: { title: string, description: string, enabled: boolean }) {
  const [isOn, setIsOn] = useState(enabled);
  
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-bold text-white mb-1">{title}</p>
        <p className="text-xs text-gray-500 max-w-md">{description}</p>
      </div>
      <button 
        onClick={() => setIsOn(!isOn)}
        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isOn ? 'bg-accent shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/10'}`}
      >
        <motion.div 
          animate={{ x: isOn ? 26 : 4 }}
          className={`absolute top-1 w-6 h-6 rounded-full shadow-lg ${isOn ? 'bg-white' : 'bg-gray-600'}`}
        />
      </button>
    </div>
  );
}
