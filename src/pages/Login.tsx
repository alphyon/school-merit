import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button, Input, Select, SelectItem, Card, CardBody } from "@heroui/react";
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
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
    // 1. Verificar si ya hay sesión activa
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('perfiles').select('role').eq('id', session.user.id).single();
        if (profile?.role === 'admin') navigate('/admin');
        else if (profile?.role === 'docente') navigate('/teacher');
      }
    };
    checkSession();

    // 2. Cargar configuración
    const fetchConfig = async () => {
      const { data } = await supabase.from('configuracion_sistema').select('nombre_escuela, logo_url').single();
      if (data) {
        setSchoolName(data.nombre_escuela);
        setLogoUrl(data.logo_url || '');
      }
    };
    fetchConfig();
  }, [navigate]);

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
          localStorage.setItem('supabase_user_id', user.id);
          const { data: profile, error: profileError } = await supabase
          .from('perfiles')
          .select('role, teacher_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (profile.role !== role) {
          setNotification({ message: `Rol incorrecto`, type: 'error' });
          await supabase.auth.signOut();
          return;
        }

        if (profile.role === 'docente') {
          // Guardamos el teacher_id directamente del perfil, que es el UUID de la tabla 'docentes'
          if (profile.teacher_id) {
            localStorage.setItem('teacher_id', profile.teacher_id);
            
            // Buscamos sus grupos en la tabla correcta (docentes_grupos)
            const { data: gData } = await supabase.from('docentes_grupos').select('grupo_id').eq('docente_id', profile.teacher_id).limit(1);
            if (gData && gData.length > 0) {
              localStorage.setItem('teacher_group_id', gData[0].grupo_id);
            }
          }
        }

        setNotification({ message: "Éxito", type: 'success' });
        setTimeout(() => {
          if (profile.role === 'admin') navigate('/admin');
          else navigate('/teacher');
        }, 500);
      }
    } catch (error: any) {
      setNotification({ message: error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] min-h-screen flex items-center justify-center p-4">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="w-full max-w-md">
        <Card className="shadow-xl rounded-[2rem] border-none">
          <CardBody className="px-8 py-10">
            <div className="pb-6 flex flex-col items-center text-center">
              <div className="size-24 bg-blue-600/5 rounded-3xl flex items-center justify-center mb-4 overflow-hidden shadow-inner">
                {logoUrl ? <img src={logoUrl} className="size-full object-contain p-2" alt="Logo" /> : <GraduationCap className="text-[#1e3b8a] w-12 h-12" />}
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{schoolName}</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Control de Gestión de Méritos</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <Select 
                label="Rol de Usuario" 
                selectedKeys={new Set([role])} 
                onSelectionChange={(keys) => setRole(Array.from(keys)[0] as string)} 
                variant="bordered"
              >
                <SelectItem key="docente">Docente</SelectItem>
                <SelectItem key="admin">Administrador</SelectItem>
              </Select>

              <Input label="Correo" type="email" value={email} onValueChange={setEmail} variant="bordered" />
              <Input 
                label="Contraseña" 
                type={isVisible ? "text" : "password"} 
                value={password} 
                onValueChange={setPassword} 
                variant="bordered"
                endContent={<button type="button" onClick={toggleVisibility}>{isVisible ? <EyeOff size={20} className="text-slate-400" /> : <Eye size={20} className="text-slate-400" />}</button>}
              />

              <Button type="submit" color="primary" className="w-full h-14 font-black uppercase tracking-widest bg-[#1e3b8a]" isLoading={isLoading}>Entrar al Sistema</Button>
            </form>
          </CardBody>
        </Card>
        <p className="mt-8 text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">© 2024 Sistema de Gestión Escolar</p>
      </div>
    </div>
  );
}
