import { useState, useEffect } from 'react';
import { 
  Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Avatar, Dropdown, 
  DropdownTrigger, DropdownMenu, DropdownItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem 
} from "@heroui/react";
import { GraduationCap, LogOut, Lock as LockIcon, BarChart, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ChangePasswordModal from './ChangePasswordModal';

export default function AppHeader({ role }: { role: string }) {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [settings, setSettings] = useState({ name: 'SISTEMA DE GESTIÓN', logo: '' });

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('perfiles').select('full_name, role').eq('id', user.id).single();
      setUserData({ name: profile?.full_name || user.email, email: user.email });
    }
    const { data: config } = await supabase.from('configuracion_sistema').select('nombre_escuela, logo_url').single();
    if (config) setSettings({ name: config.nombre_escuela, logo: config.logo_url });
  };

  useEffect(() => { fetchUser(); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear(); 
    navigate('/login');
  };

  const isDocente = role === 'docente';

  return (
    <Navbar 
      className="bg-[#1e3b8a] text-white shadow-md py-1" 
      maxWidth="xl" 
      isMenuOpen={isMenuOpen} 
      onMenuOpenChange={setIsMenuOpen}
    >
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarMenuToggle aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} className="text-white" />
      </NavbarContent>

      <NavbarBrand className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(isDocente ? '/teacher' : '/admin')}>
        {settings.logo ? (
          <img src={settings.logo} className="h-8 w-auto object-contain" alt="Logo" />
        ) : (
          <GraduationCap className="text-2xl text-white" />
        )}
        <div className="flex flex-col">
          <p className="text-[8px] font-black tracking-widest uppercase opacity-70 leading-none">Gestión de Méritos</p>
          <p className="text-[11px] font-bold uppercase truncate max-w-[150px] leading-tight">{settings.name}</p>
        </div>
      </NavbarBrand>
      
      {/* Menú Desktop */}
      <NavbarContent className="hidden sm:flex gap-8" justify="center">
        {isDocente && (
          <>
            <NavbarItem isActive={location.pathname === '/teacher'}>
              <Link onPress={() => navigate('/teacher')} className={`text-[11px] font-black uppercase tracking-widest ${location.pathname === '/teacher' ? 'text-white border-b-2 border-white' : 'text-blue-200'}`}>
                Alumnos
              </Link>
            </NavbarItem>
            <NavbarItem isActive={location.pathname === '/teacher/reportes'}>
              <Link onPress={() => navigate('/teacher/reportes')} className={`text-[11px] font-black uppercase tracking-widest ${location.pathname === '/teacher/reportes' ? 'text-white border-b-2 border-white' : 'text-blue-200'}`}>
                Reportes
              </Link>
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      <NavbarContent justify="end">
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Avatar isBordered as="button" className="transition-transform" color="primary" name={userData?.name?.charAt(0)} size="sm" />
          </DropdownTrigger>
          <DropdownMenu aria-label="Profile Actions" variant="flat">
            <DropdownItem key="profile" className="h-14 gap-2 text-primary uppercase font-black text-[10px]">
              {userData?.name}
            </DropdownItem>
            <DropdownItem key="password" startContent={<LockIcon size={16} />} onClick={onOpen}>
              Seguridad
            </DropdownItem>
            <DropdownItem key="logout" color="danger" startContent={<LogOut size={16} />} onClick={handleLogout}>Cerrar Sesión</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </NavbarContent>

      {/* Menú Móvil (Hamburguesa) */}
      <NavbarMenu className="bg-[#1e3b8a] pt-10">
        {isDocente ? (
          <>
            <NavbarMenuItem>
              <Link 
                className={`w-full text-white text-xl font-black uppercase py-4 border-b border-white/10 flex gap-3`} 
                onPress={() => { navigate('/teacher'); setIsMenuOpen(false); }}
              >
                <Users size={24} /> Mis Alumnos
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Link 
                className={`w-full text-white text-xl font-black uppercase py-4 border-b border-white/10 flex gap-3`} 
                onPress={() => { navigate('/teacher/reportes'); setIsMenuOpen(false); }}
              >
                <BarChart size={24} /> Reportes
              </Link>
            </NavbarMenuItem>
          </>
        ) : (
          <NavbarMenuItem>
            <Link className="w-full text-white text-xl font-black uppercase" onPress={() => { navigate('/admin'); setIsMenuOpen(false); }}>
              Panel Admin
            </Link>
          </NavbarMenuItem>
        )}
        <NavbarMenuItem className="mt-10">
          <Button color="danger" variant="flat" className="w-full text-white font-black uppercase" startContent={<LogOut size={20} />} onPress={handleLogout}>
            Cerrar Sesión
          </Button>
        </NavbarMenuItem>
      </NavbarMenu>

      <ChangePasswordModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </Navbar>
  );
}

import { useDisclosure } from "@heroui/react";
