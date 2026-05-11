"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Shield, ShieldAlert, ShieldCheck,
  MoreVertical, Mail, User as UserIcon, Trash2, Ban, CheckCircle,
  Plus, X, Clock, KeyRound, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';

const EXPIRY_OPTIONS = [
  { label: 'Sin vencimiento', value: 0 },
  { label: '3 días', value: 3 },
  { label: '7 días', value: 7 },
  { label: '15 días', value: 15 },
  { label: '30 días', value: 30 },
];

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function UsersPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<{ uid: string; name: string } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newUserData, setNewUserData] = useState({
    email: '', displayName: '', role: 'researcher', password: '', expirationDays: 0,
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(query(collection(db, "users")));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { toast.error("Error al cargar usuarios"); }
    finally { setLoading(false); }
  };

  const callApi = async (url: string, method: string, body?: any) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error del servidor');
    }
    return res.json();
  };

  const handleStatusToggle = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const id = 'status-toggle';
    toast.loading('Actualizando estado...', { id });
    try {
      await callApi('/api/admin/users/toggle-status', 'POST', { uid, status: newStatus });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, status: newStatus } : u));
      toast.success(`Usuario ${newStatus === 'active' ? 'habilitado' : 'inhabilitado'}`, { id });
      setActiveMenu(null);
    } catch (e: any) { toast.error(e.message, { id }); }
  };

  const handleRoleToggle = async (uid: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'researcher' : 'admin';
    const id = 'role-toggle';
    toast.loading('Actualizando rol...', { id });
    try {
      await callApi('/api/admin/users/update-role', 'POST', { uid, role: newRole });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
      toast.success(`Rol actualizado a ${newRole === 'admin' ? 'Administrador' : 'Investigador'}`, { id });
      setActiveMenu(null);
    } catch (e: any) { toast.error(e.message, { id }); }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('¿Eliminar permanentemente esta cuenta? Esta acción no se puede deshacer.')) return;
    const id = 'delete-user';
    toast.loading('Eliminando cuenta...', { id });
    try {
      await callApi(`/api/admin/users/delete/${uid}`, 'DELETE');
      setUsers(prev => prev.filter(u => u.id !== uid));
      toast.success('Cuenta eliminada', { id });
      setActiveMenu(null);
    } catch (e: any) { toast.error(e.message, { id }); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal) return;
    const id = 'change-pwd';
    toast.loading('Cambiando contraseña...', { id });
    try {
      await callApi('/api/admin/users/change-password', 'POST', { uid: showPasswordModal.uid, newPassword });
      toast.success('Contraseña actualizada exitosamente', { id });
      setShowPasswordModal(null);
      setNewPassword('');
    } catch (e: any) { toast.error(e.message, { id }); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = 'create-user';
    toast.loading('Creando cuenta...', { id });
    try {
      await callApi('/api/admin/users/create', 'POST', newUserData);
      toast.success('Cuenta creada exitosamente', { id });
      setShowAddModal(false);
      setNewUserData({ email: '', displayName: '', role: 'researcher', password: '', expirationDays: 0 });
      fetchUsers();
    } catch (e: any) { toast.error(e.message, { id }); }
  };

  const filtered = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <ShieldAlert size={64} className="text-red-500 animate-pulse" />
        <h1 className="text-3xl font-black text-white academic-text">Acceso Restringido</h1>
        <p className="text-slate-400 max-w-md">Esta sección es exclusiva del Administrador Central del Sistema OBELISCO.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-white academic-text mb-4 tracking-tighter">Panel de Usuarios</h1>
          <p className="text-gray-400">Gestiona accesos, privilegios y vigencia de las cuentas.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="academic-btn-primary flex items-center gap-2">
          <UserPlus size={20} /> Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { title: 'Total', value: users.length, icon: <Users className="text-primary" /> },
          { title: 'Administradores', value: users.filter(u => u.role === 'admin').length, icon: <ShieldCheck className="text-accent" /> },
          { title: 'Activos', value: users.filter(u => u.status !== 'disabled').length, icon: <CheckCircle className="text-green-500" /> },
          { title: 'Inhabilitados', value: users.filter(u => u.status === 'disabled').length, icon: <Ban className="text-red-500" /> },
        ].map((s, i) => (
          <div key={i} className="glass academic-card p-6 flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              {React.cloneElement(s.icon as React.ReactElement<{ size?: number }>, { size: 24 })}
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{s.title}</div>
              <div className="text-2xl font-black text-white">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass academic-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="academic-input pl-10 h-11 bg-black/20 border-white/5 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Usuario</th>
                <th className="px-8 py-5">Rol</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5">Vencimiento</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 text-xs font-black uppercase tracking-widest">
                  No se encontraron usuarios
                </td></tr>
              ) : filtered.map(u => {
                const days = daysUntilExpiry(u.expiresAt);
                const isExpired = days !== null && days <= 0;
                const expiringSoon = days !== null && days > 0 && days <= 3;
                return (
                  <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-primary font-black">
                          {u.displayName?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{u.displayName || 'Sin nombre'}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} /> {u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {u.role === 'admin' ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-[9px] font-black uppercase rounded-full border border-accent/20 w-fit">
                          <Shield size={10} /> Administrador
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-full border border-primary/20 w-fit">
                          <UserIcon size={10} /> Investigador
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {isExpired ? (
                        <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-[9px] font-black uppercase rounded-full border border-orange-500/20">Expirado</span>
                      ) : u.status === 'disabled' ? (
                        <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-full border border-red-500/20">Inhabilitado</span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">Activo</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {u.expiresAt ? (
                        <div className={`flex items-center gap-1.5 text-xs font-bold ${isExpired ? 'text-orange-400' : expiringSoon ? 'text-yellow-400' : 'text-gray-400'}`}>
                          <Timer size={12} />
                          {isExpired ? 'Venció' : `${days}d`}
                          <span className="text-[9px] text-gray-600 font-normal">{new Date(u.expiresAt).toLocaleDateString('es-ES')}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 font-medium">Sin límite</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                          className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenu === u.id && (
                          <div className="absolute right-0 mt-10 w-60 glass border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                            <button onClick={() => handleStatusToggle(u.id, u.status)}
                              className="w-full text-left px-5 py-3.5 text-xs font-bold text-white hover:bg-white/5 flex items-center gap-3">
                              {u.status === 'disabled' ? <CheckCircle size={14} className="text-green-500" /> : <Ban size={14} className="text-red-400" />}
                              {u.status === 'disabled' ? 'Habilitar Acceso' : 'Inhabilitar Acceso'}
                            </button>
                            <button onClick={() => handleRoleToggle(u.id, u.role)}
                              className="w-full text-left px-5 py-3.5 text-xs font-bold text-white hover:bg-white/5 flex items-center gap-3 border-t border-white/5">
                              <Shield size={14} className="text-primary" />
                              Cambiar a {u.role === 'admin' ? 'Investigador' : 'Administrador'}
                            </button>
                            <button onClick={() => { setShowPasswordModal({ uid: u.id, name: u.displayName || u.email }); setActiveMenu(null); }}
                              className="w-full text-left px-5 py-3.5 text-xs font-bold text-white hover:bg-white/5 flex items-center gap-3 border-t border-white/5">
                              <KeyRound size={14} className="text-yellow-400" /> Cambiar Contraseña
                            </button>
                            <button onClick={() => handleDelete(u.id)}
                              className="w-full text-left px-5 py-3.5 text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-3 border-t border-white/5">
                              <Trash2 size={14} /> Eliminar Permanente
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass rounded-[3rem] p-10 shadow-2xl border-white/10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white academic-text tracking-tighter">Nuevo Usuario</h2>
                  <p className="text-slate-400 text-sm mt-1">Crea una cuenta con vigencia controlada.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500">
                  <X size={22} />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Nombre Completo</label>
                  <input type="text" required value={newUserData.displayName}
                    onChange={e => setNewUserData({ ...newUserData, displayName: e.target.value })}
                    placeholder="Dr. Juan Pérez" className="academic-input h-13 bg-black/40 text-white placeholder:text-slate-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Correo Electrónico</label>
                  <input type="email" required value={newUserData.email}
                    onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="usuario@obelisco.ai" className="academic-input h-13 bg-black/40 text-white placeholder:text-slate-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Contraseña Inicial</label>
                  <input type="password" required value={newUserData.password}
                    onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="••••••••" className="academic-input h-13 bg-black/40 text-white placeholder:text-slate-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Privilegios</label>
                    <select value={newUserData.role} onChange={e => setNewUserData({ ...newUserData, role: e.target.value })}
                      className="academic-input h-13 bg-black/40 appearance-none">
                      <option value="researcher" className="bg-slate-900">Investigador</option>
                      <option value="admin" className="bg-slate-900">Administrador</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-1.5">
                      <Clock size={10} /> Vigencia
                    </label>
                    <select value={newUserData.expirationDays}
                      onChange={e => setNewUserData({ ...newUserData, expirationDays: Number(e.target.value) })}
                      className="academic-input h-13 bg-black/40 appearance-none">
                      {EXPIRY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {newUserData.expirationDays > 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-accent/10 border border-accent/20 rounded-2xl text-xs text-accent font-bold">
                    <Timer size={14} />
                    La cuenta expirará el {new Date(Date.now() + newUserData.expirationDays * 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
                <button type="submit" className="academic-btn-primary w-full py-4 flex items-center justify-center gap-2 mt-2">
                  <Plus size={18} /> Crear Cuenta de Acceso
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md glass rounded-[3rem] p-10 shadow-2xl border-white/10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white academic-text tracking-tighter">Cambiar Contraseña</h2>
                  <p className="text-slate-400 text-sm mt-1">{showPasswordModal.name}</p>
                </div>
                <button onClick={() => setShowPasswordModal(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-500">
                  <X size={22} />
                </button>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Nueva Contraseña</label>
                  <input type="password" required minLength={6} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" className="academic-input h-13 bg-black/40 text-white placeholder:text-slate-600" />
                </div>
                <button type="submit" className="academic-btn-gold w-full py-4 flex items-center justify-center gap-2">
                  <KeyRound size={16} /> Actualizar Contraseña
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
