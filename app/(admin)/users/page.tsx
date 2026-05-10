"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users as UsersIcon, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  Shield, 
  Search, 
  MoreVertical,
  Trash2,
  Ban,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function UserManagementPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'user'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      router.push('/');
    }
  }, [role, authLoading, router]);

  useEffect(() => {
    if (role === 'admin') {
      const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
        const userList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(userList);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [role]);

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, "users", userId), {
        status: newStatus
      });
      toast.success(`Usuario ${newStatus === 'active' ? 'habilitado' : 'inhabilitado'} con éxito.`);
    } catch (error) {
      toast.error("Error al actualizar el estado del usuario.");
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    toast.info(`Cambiando rol a ${newRole.toUpperCase()}...`, {
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await updateDoc(doc(db, "users", userId), {
              role: newRole
            });
            toast.success(`Rol actualizado a ${newRole}.`);
          } catch (error) {
            toast.error("Error al actualizar el rol.");
          }
        }
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    toast.warning("¿Confirmar eliminación?", {
      description: "Esta acción es irreversible en la base de datos de perfiles.",
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "users", userId));
            toast.success('Investigador eliminado correctamente.');
          } catch (error) {
            console.error("Error deleting user:", error);
            toast.error('Error al eliminar el investigador.');
          }
        }
      }
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const userId = newUser.email.replace(/[.@]/g, '_');
      await setDoc(doc(db, "users", userId), {
        ...newUser,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewUser({ email: '', displayName: '', role: 'user' });
      toast.success('Investigador pre-registrado', {
        description: 'El usuario podrá acceder al registrarse con este email.',
      });
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error('Error al crear el investigador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white academic-text tracking-tighter">Gestión de Investigadores</h1>
          <p className="text-gray-400 mt-2">Control centralizado de identidades y permisos del sistema OBELISCO.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-premium flex items-center gap-3 px-8 py-4 text-sm"
        >
          <UserPlus size={20} /> Nuevo Investigador
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Investigadores" value={users.length} icon={<UsersIcon className="text-primary" />} />
        <StatCard title="Administradores" value={users.filter(u => u.role === 'admin').length} icon={<Shield className="text-accent" />} />
        <StatCard title="Accesos Activos" value={users.filter(u => u.status !== 'disabled').length} icon={<UserCheck className="text-emerald-500" />} />
      </div>

      {/* Main Content */}
      <div className="glass academic-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          <Search className="text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full placeholder:text-gray-600"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                <th className="px-8 py-6">Investigador</th>
                <th className="px-8 py-6">Rol</th>
                <th className="px-8 py-6">Estado</th>
                <th className="px-8 py-6">Último Acceso</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {filteredUsers.map((u) => (
                  <motion.tr 
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-primary font-black border border-white/10">
                          {u.email?.[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.displayName || 'Sin nombre'}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        u.role === 'admin' ? 'bg-accent/20 text-accent border border-accent/20' : 'bg-primary/20 text-primary border border-primary/20'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {u.status === 'disabled' ? (
                          <span className="flex items-center gap-2 text-red-400 text-xs font-bold">
                            <Ban size={14} /> Inhabilitado
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                            <CheckCircle size={14} /> Activo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-500">
                      {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-accent transition-all"
                          title={u.role === 'admin' ? 'Degradar a Usuario' : 'Promover a Admin'}
                        >
                          <Shield size={18} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                          title={u.status === 'disabled' ? 'Habilitar' : 'Inhabilitar'}
                        >
                          {u.status === 'disabled' ? <UserCheck size={18} /> : <Ban size={18} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* New User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass academic-card p-10 space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white academic-text tracking-tight">Nuevo Investigador</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Nombre Completo</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                    placeholder="Ej: Dr. Isaac Newton"
                    className="academic-input h-14"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Email Institucional</label>
                  <input 
                    type="email" 
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="investigador@obelisco.ai"
                    className="academic-input h-14"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Rol Asignado</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="academic-input h-14 appearance-none"
                  >
                    <option value="user" className="bg-slate-900">Investigador Estándar</option>
                    <option value="admin" className="bg-slate-900">Administrador de Sistema</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="btn-premium w-full h-14 text-sm flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? 'Procesando...' : (
                      <>
                        <UserPlus size={18} /> Registrar Investigador
                      </>
                    )}
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
    <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-4">
      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-3xl font-black text-white academic-text">{value}</p>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );
}
