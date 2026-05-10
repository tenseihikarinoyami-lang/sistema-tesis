"use client";

import { Footer } from "@/components/ui/footer";
import { Logo } from "@/components/ui/logo";
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  Settings, 
  LogOut,
  User,
  Bell,
  Search as SearchIcon,
  Users as UsersIcon,
  Shield
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, status, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (status === 'disabled') {
        signOut(auth).then(() => {
          router.push('/login?error=disabled');
        });
      }
    }
  }, [user, status, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search');
    if (query) {
      router.push(`/projects?q=${encodeURIComponent(query.toString())}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(79,70,229,0.3)]"></div>
        <div className="text-accent font-black uppercase tracking-[0.4em] text-xs animate-pulse">Sincronizando Núcleo Obelisco</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[#050505] text-white relative">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-mesh pointer-events-none opacity-40"></div>
      <div className="absolute inset-0 bg-dot-pattern pointer-events-none opacity-20"></div>

      {/* Sidebar */}
      <aside className="w-80 glass border-r border-white/5 hidden lg:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-10 flex items-center gap-4">
          <div className="p-2 bg-white/5 rounded-2xl shadow-xl shadow-primary/20 border border-white/10 backdrop-blur-md">
            <Logo className="w-10 h-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl text-white tracking-tighter academic-text drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">OBELISCO</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Forja de Tesis</span>
          </div>
        </div>

        <nav className="flex-grow px-6 space-y-4 pt-4">
          <NavItem 
            icon={<LayoutDashboard size={22} />} 
            label="Panel Principal" 
            href="/" 
            active={pathname === "/"} 
          />
          <NavItem 
            icon={<PlusCircle size={22} />} 
            label="Nueva Tesis" 
            href="/new-project" 
            active={pathname === "/new-project"} 
          />
          <NavItem 
            icon={<BookOpen size={22} />} 
            label="Mis Proyectos" 
            href="/projects" 
            active={pathname === "/projects"} 
          />
          
          <div className="pt-8 pb-4">
            <span className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cuenta</span>
          </div>
          
          <NavItem 
            icon={<User size={22} />} 
            label="Perfil" 
            href="/profile" 
            active={pathname === "/profile"} 
          />
          <NavItem 
            icon={<Settings size={22} />} 
            label="Configuración" 
            href="/settings" 
            active={pathname === "/settings"} 
          />

          {role === 'admin' && (
            <>
              <div className="pt-8 pb-4">
                <span className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Administración</span>
              </div>
              <NavItem 
                icon={<UsersIcon size={22} />} 
                label="Investigadores" 
                href="/users" 
                active={pathname === "/users"} 
              />
            </>
          )}
        </nav>

        <div className="p-8">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 w-full p-4 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all duration-300 group"
          >
            <div className="p-2 bg-white/5 rounded-xl shadow-sm border border-white/10 group-hover:border-red-500/30 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <LogOut size={20} />
            </div>
            <span className="font-bold text-sm tracking-wide">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0 min-h-screen z-10">
        <header className="h-24 bg-[#050505]/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-12 sticky top-0 z-30">
          <div className="flex items-center gap-6 flex-grow max-w-xl">
             <form onSubmit={handleSearch} className="relative w-full">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  name="search"
                  placeholder="Buscar tesis, bibliografía o recursos..." 
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:bg-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none text-white placeholder-slate-500"
                />
             </form>
          </div>

          <div className="flex items-center gap-8">
            <button className="relative p-3 text-slate-400 hover:text-white transition-all glass-hover rounded-xl">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-[#050505] shadow-[0_0_8px_#10B981]"></span>
            </button>
            
            <div className="h-10 w-[1px] bg-white/10"></div>

            <div className="flex items-center gap-4 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-white group-hover:text-primary transition-colors academic-text">{user.displayName || user.email?.split('@')[0] || 'Investigador'}</p>
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{role === 'admin' ? 'Administrador Central' : 'Investigador Activo'}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-[2px] shadow-[0_0_20px_rgba(79,70,229,0.3)] group-hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all">
                <div className="w-full h-full bg-[#0A0A0A] rounded-[calc(1rem-2px)] flex items-center justify-center text-white font-black text-lg academic-text">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow p-12 overflow-auto relative z-0">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group ${
        active 
          ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10" 
          : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
      }`}
    >
      <div className={`p-2 rounded-xl transition-all duration-300 ${
        active ? "bg-primary text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]" : "bg-white/5 group-hover:bg-primary/20 group-hover:text-primary"
      }`}>
        {icon}
      </div>
      <span className="font-bold text-sm tracking-wide">{label}</span>
    </Link>
  );
}

