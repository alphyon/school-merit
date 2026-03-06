import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Avatar, useDisclosure } from "@heroui/react";
import { 
  Shield, 
  LayoutDashboard, 
  GraduationCap, 
  BadgeCheck, 
  Layers, 
  Settings,
  LogOut as LogOutIcon
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import ChangePasswordModal from './ChangePasswordModal';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [adminData, setAdminData] = useState<any>(null);
  const [schoolName, setSchoolName] = useState('Sistema de Gestión de Deméritos');

  const fetchAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('perfiles').select('full_name, role').eq('id', user.id).single();
      const { data: config } = await supabase.from('configuracion_sistema').select('nombre_escuela, logo_url').single();
      
      setAdminData({ 
        name: profile?.full_name || 'Administrador', 
        role: profile?.role,
        logo_url: config?.logo_url 
      });
      if (config) setSchoolName(config.nombre_escuela);
    }
  };

  useEffect(() => { fetchAdmin(); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { label: 'Estudiantes', icon: <GraduationCap size={20} />, path: '/admin/estudiantes' },
    { label: 'Docentes', icon: <BadgeCheck size={20} />, path: '/admin/docentes' },
    { label: 'Grupos', icon: <Layers size={20} />, path: '/admin/grupos' },
    { label: 'Catálogos', icon: <Shield size={20} />, path: '/admin/catalogos' },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col fixed h-full hidden md:flex">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#1e3b8a] rounded-lg size-10 flex items-center justify-center text-white overflow-hidden shadow-inner">
            {adminData?.logo_url ? (
              <img src={adminData.logo_url} className="size-full object-contain p-1" alt="Logo" />
            ) : (
              <Shield size={24} />
            )}
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white text-[11px] font-black leading-tight uppercase tracking-tighter">Gestión de Deméritos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest truncate max-w-[120px]">{schoolName}</p>
          </div>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          {menuItems.map((item) => (
            <Button 
              key={item.path}
              variant="light" 
              className={`justify-start gap-3 px-3 h-11 font-bold uppercase text-[11px] tracking-widest ${location.pathname === item.path ? 'bg-[#1e3b8a]/10 text-[#1e3b8a]' : 'text-slate-500'}`} 
              startContent={item.icon}
              onPress={() => navigate(item.path)}
            >
              {item.label}
            </Button>
          ))}
          <Button 
            variant="light" 
            className={`justify-start gap-3 px-3 h-11 font-bold uppercase text-[11px] tracking-widest ${location.pathname === '/admin/configuracion' ? 'bg-[#1e3b8a]/10 text-[#1e3b8a]' : 'text-slate-500'}`} 
            startContent={<Settings size={20} />}
            onPress={() => navigate('/admin/configuracion')}
          >
            Configuración
          </Button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <Avatar
              size="sm"
              className="bg-[#1e3b8a] text-white font-black cursor-pointer"
              name={adminData?.name?.charAt(0)}
              onClick={onOpen}
            />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
              <p className="text-[10px] font-black truncate text-slate-900 dark:text-white uppercase tracking-tighter">{adminData?.name}</p>
              <p className="text-[9px] text-slate-400 truncate font-black uppercase tracking-widest">{adminData?.role}</p>
            </div>
            <Button 
              isIconOnly 
              variant="light" 
              size="sm" 
              color="danger"
              onPress={handleLogout} 
              className="min-w-8 w-8 h-8 rounded-full"
            >
              <LogOutIcon size={16} />
            </Button>
          </div>
        </div>
      </div>
      <ChangePasswordModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </aside>
  );
}
