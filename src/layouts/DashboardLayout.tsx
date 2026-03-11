import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, useDisclosure,
  Button
} from "@heroui/react";
import { 
  LayoutDashboard, Users, GraduationCap, Layers, Shield, Settings, 
  LogOut, Menu, X, BarChart, Lock, ShieldCheck
} from 'lucide-react';
import { useFontSize } from '../hooks/useFontSize';
import { supabase } from '../lib/supabase';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { Footer } from '../components/Footer';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'docente';
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<any>(JSON.parse(localStorage.getItem('cached_user') || 'null'));
  const [schoolConfig, setSchoolConfig] = useState(JSON.parse(localStorage.getItem('cached_config') || '{"name": "SISTEMA", "logo": ""}'));
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { scale, increase, decrease } = useFontSize();

  const fetchSessionData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Si hay error de auth o no hay usuario, mandamos al login de inmediato
      if (userError || !user) {
        localStorage.clear();
        navigate('/login');
        return;
      }

      if (user) {
        const { data: profile } = await supabase.from('perfiles').select('full_name, role').eq('id', user.id).single();
        if (profile) {
          const userObj = { name: profile.full_name, email: user.email };
          setUserData(userObj);
          localStorage.setItem('cached_user', JSON.stringify(userObj));
        }
      }
      
      const { data: config } = await supabase.from('configuracion_sistema').select('nombre_escuela, logo_url').single();
      if (config) {
        const configObj = { name: config.nombre_escuela, logo: config.logo_url };
        setSchoolConfig(configObj);
        localStorage.setItem('cached_config', JSON.stringify(configObj));
      }
    } catch (error) { 
      console.error("Error de sesión:", error);
      navigate('/login');
    }
  };

  useEffect(() => { 
    fetchSessionData(); 

    // Escuchador de eventos de autenticación (Cierre de sesión, Token expirado, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        localStorage.clear();
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/login');
  };

  const adminLinks = [
    { label: 'Inicio', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { label: 'Estudiantes', path: '/admin/estudiantes', icon: <Users size={20} /> },
    { label: 'Docentes', path: '/admin/docentes', icon: <GraduationCap size={20} /> },
    { label: 'Administradores', path: '/admin/administradores', icon: <ShieldCheck size={20} /> },
    { label: 'Grupos', path: '/admin/grupos', icon: <Layers size={20} /> },
    { label: 'Catálogos', path: '/admin/catalogos', icon: <Shield size={20} /> },
    { label: 'Ajustes', path: '/admin/configuracion', icon: <Settings size={20} /> },
  ];

  const teacherLinks = [
    { label: 'Mis Alumnos', path: '/teacher', icon: <Users size={20} /> },
    { label: 'Reportes', path: '/teacher/reportes', icon: <BarChart size={20} /> },
  ];

  const links = role === 'admin' ? adminLinks : teacherLinks;

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-['Lexend'] overflow-hidden">
      
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#1e3b8a] text-white shadow-2xl z-20">
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          {schoolConfig.logo ? (
            <img src={schoolConfig.logo} className="size-10 object-contain mr-3 bg-white rounded-lg p-1" alt="Logo" />
          ) : (
            <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center mr-3"><GraduationCap /></div>
          )}
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-black opacity-60 tracking-widest leading-none">Gestión de Deméritos</span>
            <span className="text-sm font-black truncate">{schoolConfig.name}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-xs font-black tracking-widest transition-all duration-300
                ${location.pathname === link.path 
                  ? 'bg-white text-[#1e3b8a] shadow-xl shadow-black/20' 
                  : 'text-blue-100/60 hover:bg-white/10 hover:text-white'
                }`}
            >
              {link.icon}
              {link.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-4">
            <Avatar size="sm" isBordered color="secondary" name={userData?.name?.charAt(0)} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate tracking-tighter">{userData?.name || 'Usuario'}</p>
              <p className="text-xs text-blue-300 font-bold">{role}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-500 rounded-xl transition-colors"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 bg-white dark:bg-[#1e293b] border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 shadow-sm z-10">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-gray-100 rounded-2xl text-[#1e3b8a]"><Menu /></button>
            <span className="font-black text-[#1e3b8a] tracking-tighter">SGE</span>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-sm font-black text-gray-400 tracking-[0.3em]">
              {links.find(l => l.path === location.pathname)?.label || 'Escritorio'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Controles de tamaño de fuente */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={decrease}
                disabled={scale === 'normal'}
                title="Reducir fuente"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black text-gray-500 hover:bg-white hover:text-[#1e3b8a] hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                A-
              </button>
              <button
                onClick={increase}
                disabled={scale === 'xl'}
                title="Aumentar fuente"
                className="w-8 h-7 flex items-center justify-center rounded-lg text-sm font-black text-gray-700 hover:bg-white hover:text-[#1e3b8a] hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                A+
              </button>
            </div>

            <div className="h-8 w-[1px] bg-gray-100 mx-2"></div>

            <Dropdown placement="bottom-end" backdrop="blur">
              <DropdownTrigger>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-2xl transition-colors">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-black text-gray-900 leading-none mb-1">{userData?.name || 'Usuario'}</p>
                    <p className="text-xs text-gray-400 font-bold tracking-widest">{role}</p>
                  </div>
                  <Avatar size="md" isBordered color="primary" className="shadow-md" name={userData?.name?.charAt(0)} />
                </div>
              </DropdownTrigger>
              <DropdownMenu aria-label="Profile" variant="flat">
                <DropdownItem key="profile" className="h-14 gap-2">
                  <p className="font-black text-xs text-gray-400">Sesión iniciada</p>
                  <p className="font-bold text-[#1e3b8a]">{userData?.email || 'Modo Offline'}</p>
                </DropdownItem>
                <DropdownItem key="password" startContent={<Lock size={16} />} onClick={onOpen}>Seguridad</DropdownItem>
                <DropdownItem key="logout" color="danger" startContent={<LogOut size={16} />} onClick={handleLogout}>Cerrar Sesión</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </header>

        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-300" onClick={() => setIsSidebarOpen(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#1e3b8a] shadow-2xl flex flex-col p-6 slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10 text-white">
                <span className="text-2xl font-black tracking-tighter italic">Menú</span>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white/10 rounded-xl"><X /></button>
              </div>
              <nav className="space-y-3 flex-1">
                {links.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => { navigate(link.path); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl text-sm font-black tracking-widest
                      ${location.pathname === link.path ? 'bg-white text-[#1e3b8a] shadow-2xl' : 'text-white/70 hover:bg-white/10'}`}
                  >
                    {link.icon}
                    {link.label}
                  </button>
                ))}
              </nav>
              <Button color="danger" variant="flat" className="w-full h-14 font-black tracking-widest text-white mt-10" startContent={<LogOut />} onClick={handleLogout}>Cerrar Sesión</Button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 lg:p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto min-h-[calc(100vh-14rem)]">{children}</div>
          <Footer />
        </main>
      </div>

      <ChangePasswordModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </div>
  );
}
