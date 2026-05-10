"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  MoreVertical,
  Mail,
  User as UserIcon,
  Trash2,
  Ban,
  CheckCircle,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

export default function UsersPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: '',
    displayName: '',
    role: 'researcher',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar investigadores");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    toast.loading("Actualizando estado en Auth...", { id: 'status-toggle' });
    try {
      // Update Auth via Backend
      const response = await fetch('http://127.0.0.1:8000/api/admin/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, status: newStatus })
      });

      if (!response.ok) throw new Error("Error al actualizar en Auth");

      // Update Firestore
      await updateDoc(doc(db, "users", userId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(`Usuario ${newStatus === 'active' ? 'activado' : 'inhabilitado'} correctamente`, { id: 'status-toggle' });
      setActiveMenu(null);
    } catch (error) {
      toast.error("Error al actualizar estado", { id: 'status-toggle' });
    }
  };

  const handleRoleToggle = async (userId: string, currentRole: string, email: string) => {
    const newRole = currentRole === 'admin' ? 'researcher' : 'admin';
    toast.loading("Actualizando privilegios en Auth...", { id: 'role-toggle' });
    try {
      // Update Auth via Backend
      const response = await fetch('http://127.0.0.1:8000/api/admin/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole, password: '', displayName: '' }) // Only email/role used
      });

      if (!response.ok) throw new Error("Error al actualizar en Auth");

      // Update Firestore
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Rol actualizado a ${newRole}`, { id: 'role-toggle' });
      setActiveMenu(null);
    } catch (error) {
      toast.error("Error al actualizar rol", { id: 'role-toggle' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este investigador de forma permanente? Esta acción no se puede deshacer.")) return;
    
    toast.loading("Eliminando de Auth y Base de Datos...", { id: 'delete-user' });
    try {
      // Delete from Auth via Backend
      const response = await fetch(`http://127.0.0.1:8000/api/admin/users/delete/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error("Error al eliminar de Auth");

      // Delete from Firestore
      await deleteDoc(doc(db, "users", userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success("Investigador eliminado exitosamente", { id: 'delete-user' });
      setActiveMenu(null);
    } catch (error) {
      toast.error("Error al eliminar investigador", { id: 'delete-user' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.loading("Creando credenciales...", { id: 'create-user' });
    
    try {
      // For now, we'll use the backend to create the user in Auth
      const response = await fetch('http://127.0.0.1:8000/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Also save to Firestore
        await setDoc(doc(db, "users", data.uid), {
          email: newUserData.email,
          displayName: newUserData.displayName,
          role: newUserData.role,
          status: 'active',
          createdAt: new Date().toISOString()
        });
        
        toast.success("Investigador creado exitosamente", { id: 'create-user' });
        setShowAddModal(false);
        fetchUsers();
        setNewUserData({ email: '', displayName: '', role: 'researcher', password: '' });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error del servidor");
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: 'create-user' });
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <ShieldAlert size={64} className="text-red-500 animate-pulse" />
        <h1 className="text-3xl font-black text-white academic-text tracking-tighter">Acceso Restringido</h1>
        <p className="text-slate-400 max-w-md">Esta sección es de uso exclusivo para el Administrador Central del Sistema OBELISCO.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-white academic-text mb-4 tracking-tighter">Panel de Investigadores</h1>
          <p className="text-gray-400">Gestiona los accesos y privilegios del personal académico.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="academic-btn-primary flex items-center gap-2"
        >
          <UserPlus size={20} /> Nuevo Investigador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total" value={users.length.toString()} icon={<Users className="text-primary" />} />
        <StatCard title="Administradores" value={users.filter(u => u.role === 'admin').length.toString()} icon={<ShieldCheck className="text-accent" />} />
        <StatCard title="Activos" value={users.filter(u => u.status !== 'disabled').length.toString()} icon={<CheckCircle className="text-green-500" />} />
        <StatCard title="Inactivos" value={users.filter(u => u.status === 'disabled').length.toString()} icon={<Ban className="text-red-500" />} />
      </div>

      <div className="glass academic-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="academic-input pl-12 h-12 bg-black/20 border-white/5"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Investigador</th>
                <th className="px-8 py-6">Rol</th>
                <th className="px-8 py-6">Estado</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                    No se encontraron investigadores
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-primary font-black academic-text">
                        {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-primary transition-colors">
                          {user.displayName || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                           <Mail size={12} /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      {user.role === 'admin' ? (
                        <span className="flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent text-[9px] font-black uppercase rounded-full border border-accent/20">
                          <Shield size={12} /> Administrador
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-full border border-primary/20">
                          <UserIcon size={12} /> Investigador
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {user.status === 'disabled' ? (
                      <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-full border border-red-500/20">
                        Inhabilitado
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-end gap-2 relative">
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                          className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {activeMenu === user.id && (
                          <div className="absolute right-0 mt-2 w-56 glass border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <button 
                              onClick={() => handleStatusToggle(user.id, user.status)}
                              className="w-full text-left px-6 py-4 text-xs font-bold text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                            >
                              {user.status === 'disabled' ? <CheckCircle size={14} className="text-green-500" /> : <Ban size={14} className="text-red-500" />}
                              {user.status === 'disabled' ? 'Habilitar Acceso' : 'Inhabilitar Acceso'}
                            </button>
                            <button 
                              onClick={() => handleRoleToggle(user.id, user.role, user.email)}
                              className="w-full text-left px-6 py-4 text-xs font-bold text-white hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
                            >
                              <Shield size={14} className="text-primary" />
                              Cambiar a {user.role === 'admin' ? 'Investigador' : 'Administrador'}
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="w-full text-left px-6 py-4 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3 border-t border-white/5"
                            >
                              <Trash2 size={14} />
                              Eliminar Permanente
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
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass rounded-[3rem] p-12 shadow-2xl border-white/10"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white academic-text tracking-tighter">Nuevo Investigador</h2>
                  <p className="text-slate-400 text-sm font-medium">Registra un nuevo miembro en el sistema.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nombre Completo</label>
                    <input 
                      type="text" 
                      required
                      value={newUserData.displayName}
                      onChange={(e) => setNewUserData({...newUserData, displayName: e.target.value})}
                      placeholder="Ej: Dr. Alejandro Sanz"
                      className="academic-input h-14 bg-black/40 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Correo Electrónico</label>
                    <input 
                      type="email" 
                      required
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                      placeholder="investigador@obelisco.ai"
                      className="academic-input h-14 bg-black/40 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Clave Temporal</label>
                    <input 
                      type="password" 
                      required
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                      placeholder="••••••••"
                      className="academic-input h-14 bg-black/40 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Privilegios</label>
                    <select 
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                      className="academic-input h-14 bg-black/40 appearance-none"
                    >
                      <option value="researcher" className="bg-slate-900">Investigador Estándar</option>
                      <option value="admin" className="bg-slate-900">Administrador Central</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="academic-btn-primary w-full py-5 text-lg flex items-center justify-center gap-3">
                    <Plus size={20} /> Crear Cuenta de Acceso
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
