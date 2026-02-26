import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button, Input, Select, SelectItem, Card, CardBody } from "@heroui/react";
import { LogIn, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { Notification } from '../components/Notification';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('docente');
  const [isVisible, setIsVisible] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('Sistema de Gestión de Méritos');
  const [logoUrl, setLogoUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('configuracion_sistema').select('nombre_escuela, logo_url').single();
      if (data) {
        setSchoolName(data.nombre_escuela);
        setLogoUrl(data.logo_url || '');
      }
    };
    fetchConfig();
  }, []);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (user) {
        // Consultar el perfil para verificar el rol y obtener el ID del docente vinculado
        const { data: profile, error: profileError } = await supabase
          .from('perfiles')
          .select('role, teacher_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116' || profileError.message.includes('406')) {
            throw new Error("El perfil no existe o no tienes permisos");
          }
          throw profileError;
        }

        if (profile.role !== role) {
          setNotification({ 
            message: `Acceso denegado: Tu cuenta tiene el rol de ${profile.role}, no de ${role}`, 
            type: 'error' 
          });
          await supabase.auth.signOut();
          return;
        }

        // Si es docente, verificar que tenga un grupo asignado
        if (profile.role === 'docente') {
          const { data: teacherData } = await supabase
            .from('docentes')
            .select('grupo_id')
            .eq('id', profile.teacher_id)
            .single();
          
          if (!teacherData?.grupo_id) {
            setNotification({ message: "Error: No tienes un grupo asignado. Contacta al administrador.", type: 'error' });
            await supabase.auth.signOut();
            return;
          }
          // Guardamos el grupo_id en el localStorage para uso rápido en el dashboard
          localStorage.setItem('teacher_group_id', teacherData.grupo_id);
          localStorage.setItem('teacher_id', profile.teacher_id);
        }

        setNotification({ message: "¡Bienvenido! Entrando al sistema...", type: 'success' });
        setTimeout(() => {
          if (profile.role === 'admin') navigate('/admin');
          else navigate('/teacher');
        }, 1500);
      }
    } catch (error: any) {
      setNotification({ message: error.message || "Error al iniciar sesión", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] min-h-screen flex items-center justify-center p-4">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
      <div className="w-full max-w-md">
        <Card className="shadow-xl rounded-xl border border-slate-200 dark:border-slate-800">
          <CardBody className="px-8 py-10">
            <div className="pb-6 flex flex-col items-center">
              <div className="size-24 bg-blue-600/5 rounded-3xl flex items-center justify-center mb-4 overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} className="size-full object-contain p-2" alt="Escuela Logo" />
                ) : (
                  <GraduationCap className="text-[#1e3b8a] w-12 h-12" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center uppercase tracking-tight">{schoolName}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestión de méritos académicos</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <Select
                label="Rol"
                placeholder="Selecciona tu rol"
                selectedKeys={[role]}
                onChange={(e) => setRole(e.target.value)}
                className="w-full"
              >
                <SelectItem key="docente" value="docente">Docente</SelectItem>
                <SelectItem key="admin" value="admin">Administrador</SelectItem>
              </Select>

              <Input
                label="Correo Electrónico"
                placeholder="ejemplo@escuela.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="bordered"
              />

              <Input
                label="Contraseña"
                placeholder="••••••••"
                variant="bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                endContent={
                  <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                    {isVisible ? (
                      <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                    ) : (
                      <Eye className="text-2xl text-default-400 pointer-events-none" />
                    )}
                  </button>
                }
                type={isVisible ? "text" : "password"}
              />

              <div className="flex justify-end">
                <a className="text-xs text-[#1e3b8a] hover:underline font-medium" href="#">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <Button 
                type="submit" 
                color="primary" 
                className="w-full h-12 font-semibold text-white bg-[#1e3b8a]"
                endContent={<LogIn size={18} />}
                isLoading={isLoading}
              >
                Entrar
              </Button>

              <div className="flex items-center gap-3 pt-2">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="text-xs text-slate-400 uppercase tracking-widest">O</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  ¿Necesitas ayuda? <a className="text-[#1e3b8a] font-medium hover:underline" href="#">Contacta soporte</a>
                </p>
              </div>
            </form>
          </CardBody>
        </Card>
        <div className="mt-8 text-center text-slate-400 text-xs">
          <p>© 2024 Deméritos Pro. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
