import { useState, useEffect } from 'react';
import { 
  Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Avatar, Dropdown, 
  DropdownTrigger, DropdownMenu, DropdownItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem, Button, useDisclosure, Badge 
} from "@heroui/react";
import { GraduationCap, LogOut, Lock as LockIcon, BarChart, Users, Shield, Layers, Settings, Home, Wifi, WifiOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ChangePasswordModal from './ChangePasswordModal';

export default function AppHeader({ role }: { role: string }) {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [settings, setSettings] = useState({ name: 'SISTEMA DE GESTIÓN', logo: '' });

  const fetchUser = async () => {
    try {
      if (navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('perfiles').select('full_name, role').eq('id', user.id).single();
          setUserData({ name: profile?.full_name || user.email, email: user.email });
        }
        const { data: config } = await supabase.from('configuracion_sistema').select('nombre_escuela, logo_url').single();
        if (config) setSettings({ name: config.nombre_escuela, logo: config.logo_url });
      } else {
        setUserData({ name: 'Modo Offline', email: '' });
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
    fetchUser(); 
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // VALIDACIÓN: No permitir cerrar sesión si hay registros pendientes
      const { db } = await import('../lib/localDb');
      const pendingCount = await db.pendingEvents.where('sync_status').equals('pending').count();
      
      if (pendingCount > 0) {
        alert(`❌ ATENCIÓN: Tienes ${pendingCount} registros sin sincronizar. Debes subirlos a la nube antes de cerrar sesión para no perderlos.`);
        return;
      }

      await supabase.auth.signOut();
      localStorage.clear(); 
      navigate('/login');
    } catch (e) { console.error(e); }
  };

  const isDocente = role === 'docente';

  return (
    <Navbar 
      className="bg-[#1e3b8a] text-white shadow-md" 
      maxWidth="xl" 
      isMenuOpen={isMenuOpen} 
      onMenuOpenChange={setIsMenuOpen}
      classNames={{
        wrapper: "px-4 sm:px-6",
        toggle: "text-white",
        toggleIcon: "text-white"
      }}
    >
      {/* Botón Hamburguesa - Ahora visible hasta el breakpoint MD */}
      <NavbarContent className="md:hidden" justify="start">
        <NavbarMenuToggle aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} />
      </NavbarContent>

      <NavbarBrand className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(isDocente ? '/teacher' : '/admin')}>
        {settings.logo ? (
          <img src={settings.logo} className="h-8 w-auto object-contain" alt="Logo" />
        ) : (
          <GraduationCap className="text-2xl text-white" />
        )}
        <div className="flex flex-col overflow-hidden">
          <p className="text-[8px] font-black tracking-widest uppercase opacity-70 leading-none">Gestión de Deméritos</p>
          <p className="text-[10px] font-bold uppercase truncate max-w-[100px] sm:max-w-[200px] leading-tight">{settings.name}</p>
        </div>
      </NavbarBrand>
      
      {/* Menú Desktop - Visible desde MD en adelante */}
      <NavbarContent className="hidden md:flex gap-6" justify="center">
        {isDocente ? (
          <>
            <NavbarItem isActive={location.pathname === '/teacher'}>
              <Link onPress={() => navigate('/teacher')} className={`text-[11px] font-black uppercase tracking-widest ${location.pathname === '/teacher' ? 'text-white border-b-2 border-white' : 'text-blue-200 hover:text-white'}`}>
                Alumnos
              </Link>
            </NavbarItem>
            <NavbarItem isActive={location.pathname === '/teacher/reportes'}>
              <Link onPress={() => navigate('/teacher/reportes')} className={`text-[11px] font-black uppercase tracking-widest ${location.pathname === '/teacher/reportes' ? 'text-white border-b-2 border-white' : 'text-blue-200 hover:text-white'}`}>
                Reportes
              </Link>
            </NavbarItem>
          </>
        ) : (
          <NavbarItem>
            <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] bg-white/10 px-4 py-1 rounded-full border border-white/10">
              Panel Administrativo Activo
            </span>
          </NavbarItem>
        )}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="mr-2">
          {isOnline ? (
            <Badge color="success" content="" size="sm" shape="circle" placement="bottom-right">
              <Wifi size={18} className="text-blue-100" />
            </Badge>
          ) : (
            <Badge color="danger" content="" size="sm" shape="circle" placement="bottom-right">
              <WifiOff size={18} className="text-red-400" />
            </Badge>
          )}
        </NavbarItem>
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

      {/* Menú Móvil - Completo para ambos roles */}
      <NavbarMenu className="bg-[#1e3b8a] pt-6 flex flex-col gap-2">
        {isDocente ? (
          <>
            <NavbarMenuItem>
              <Button variant="light" className="w-full justify-start text-white text-lg font-black uppercase h-16" startContent={<Users size={24} />} onPress={() => { navigate('/teacher'); setIsMenuOpen(false); }}>Mis Alumnos</Button>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Button variant="light" className="w-full justify-start text-white text-lg font-black uppercase h-16" startContent={<BarChart size={24} />} onPress={() => { navigate('/teacher/reportes'); setIsMenuOpen(false); }}>Reportes</Button>
            </NavbarMenuItem>
          </>
        ) : (
          <>
            <NavbarMenuItem><Button variant="light" className="w-full justify-start text-white text-lg font-black uppercase h-16" startContent={<Home size={24} />} onPress={() => { navigate('/admin'); setIsMenuOpen(false); }}>Dashboard</Button></NavbarMenuItem>
            <NavbarMenuItem><Button variant="light" className="w-full justify-start text-white text-lg font-black uppercase h-16" startContent={<Users size={24} />} onPress={() => { navigate('/admin/estudiantes'); setIsMenuOpen(false); }}>Estudiantes</Button></NavbarMenuItem>
            <NavbarMenuItem><Button variant="light" className="w-full justify-start text-white text-lg font-black uppercase h-16" startContent={<Shield size={24} />} onPress={() => { navigate('/admin/docentes'); setIsMenuOpen(false); }}>Docentes</Button></NavbarMenuItem>
            <NavbarMenuItem><Button variant="light" className="w-full justify-start text-white text-lg font-black uppercase h-16" startContent={<Layers size={24} />} onPress={() => { navigate('/admin/grupos'); setIsMenuOpen(false); }}>Grupos</Button></NavbarMenuItem>
            <NavbarMenuItem><Button variant="light" className="w-full justify-start text-white text-lg font-black uppercase h-16" startContent={<Settings size={24} />} onPress={() => { navigate('/admin/configuracion'); setIsMenuOpen(false); }}>Configuración</Button></NavbarMenuItem>
          </>
        )}
        <NavbarMenuItem className="mt-auto pb-10">
          <Button color="danger" variant="flat" className="w-full text-white font-black uppercase h-14" startContent={<LogOut size={20} />} onPress={handleLogout}>Cerrar Sesión</Button>
        </NavbarMenuItem>
      </NavbarMenu>

      <ChangePasswordModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </Navbar>
  );
}
