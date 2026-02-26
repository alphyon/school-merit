import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import { Card, CardBody, Button, Input, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, User, Badge } from "@heroui/react";
import { Settings, School, ShieldAlert, Users, Save, Upload, Trash2, ImageIcon } from 'lucide-react';

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState({ nombre_escuela: '', limite_demeritos_alerta: 10, logo_url: '' });
  const [users, setUsers] = useState<any[]>([]);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: sData } = await supabase.from('configuracion_sistema').select('*').single();
      const { data: uData } = await supabase.from('perfiles').select('*').order('role');
      if (sData) setSettings({ 
        nombre_escuela: sData.nombre_escuela, 
        limite_demeritos_alerta: sData.limite_demeritos_alerta,
        logo_url: sData.logo_url || ''
      });
      setUsers(uData || []);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setNotification({ message: "Máximo 1MB.", type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => { setSettings({ ...settings, logo_url: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('configuracion_sistema').update(settings).eq('id', 1);
      if (error) throw error;
      setNotification({ message: "Guardado", type: 'success' });
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="text-[#1e3b8a]" size={32} /> Configuración Global
        </h1>
        <p className="text-gray-500 font-medium text-sm">Control total del sistema escolar</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardBody className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-[#1e3b8a] font-black uppercase text-xs tracking-widest border-b pb-2">
                <School size={18} /> Identidad Institucional
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="relative group">
                  <div className="size-32 rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} className="size-full object-contain p-2" alt="Logo" />
                    ) : (
                      <ImageIcon className="text-gray-300" size={48} />
                    )}
                  </div>
                  {settings.logo_url && (
                    <Button isIconOnly size="sm" color="danger" className="absolute -top-2 -right-2 rounded-full shadow-md" onPress={() => setSettings({...settings, logo_url: ''})}><Trash2 size={14} /></Button>
                  )}
                </div>
                
                <div className="flex-1 w-full space-y-4">
                  <Input 
                    label="Nombre de la Institución" 
                    variant="bordered"
                    value={settings.nombre_escuela}
                    onValueChange={(v) => setSettings({...settings, nombre_escuela: v})}
                    classNames={{ input: "font-bold text-gray-800" }}
                  />
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  <Button variant="flat" color="primary" className="w-full font-bold text-xs uppercase" startContent={<Upload size={16} />} onPress={() => fileInputRef.current?.click()}>
                    Subir Logo (PC)
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-red-600 font-black uppercase text-xs tracking-widest border-b pb-2 pt-4">
                <ShieldAlert size={18} /> Regla de Expulsión
              </div>
              <Input 
                label="Límite de Puntos Acumulados" 
                type="number"
                variant="bordered"
                value={settings.limite_demeritos_alerta.toString()}
                onValueChange={(v) => setSettings({...settings, limite_demeritos_alerta: Number(v)})}
                description="Alerta crítica cuando el alumno acumule este puntaje en deméritos."
              />

              <Button color="primary" className="bg-[#1e3b8a] font-bold h-12 w-full text-sm shadow-lg shadow-blue-900/20" startContent={<Save size={20} />} isLoading={isSaving} onPress={handleSaveSettings}>
                Guardar Configuración Final
              </Button>
            </CardBody>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardBody className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-500 font-black uppercase text-xs tracking-widest border-b pb-2">
                <Users size={18} /> Usuarios Registrados
              </div>
              <div className="overflow-x-auto">
                <Table aria-label="Users" shadow="none" classNames={{ wrapper: "p-0 shadow-none" }}>
                  <TableHeader>
                    <TableColumn>USUARIO</TableColumn>
                    <TableColumn>ROL</TableColumn>
                    <TableColumn align="end">ESTADO</TableColumn>
                  </TableHeader>
                  <TableBody isLoading={isLoading} loadingContent={<Spinner />}>
                    {users.map((u) => (
                      <TableRow key={u.id} className="border-b border-gray-50 last:border-none">
                        <TableCell>
                          <User name={u.full_name || u.username} description={u.username} avatarProps={{ size: "sm", className: "bg-blue-100 text-[#1e3b8a]" }} />
                        </TableCell>
                        <TableCell>
                          <Badge color={u.role === 'admin' ? 'secondary' : 'primary'} variant="flat" className="font-bold text-[10px] uppercase">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell><div className="size-2 rounded-full bg-emerald-500 ml-auto shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-[#1e3b8a] to-blue-900 text-white p-6 rounded-[2rem] border-none shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <CardBody className="gap-6 text-center relative z-10">
              <div className="size-20 bg-white/10 rounded-2xl mx-auto flex items-center justify-center border border-white/20 shadow-inner">
                <Settings size={40} className="animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Sistema Activo</h3>
                <p className="text-blue-200 text-xs font-medium mt-2">Versión 1.0.0 (Producción)</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
                <div className="bg-black/20 p-2 rounded-lg">React 19</div>
                <div className="bg-black/20 p-2 rounded-lg">Supabase</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
