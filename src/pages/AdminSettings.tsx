import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AdminSidebar from '../components/AdminSidebar';
import { Notification } from '../components/Notification';
import { Card, CardBody, Button, Input, Divider, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, User, Badge } from "@heroui/react";
import { Settings, School, ShieldAlert, Users, Save, Upload, Trash2 } from 'lucide-react';

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

    if (file.size > 1024 * 1024) { // Limite 1MB para no saturar la DB
      setNotification({ message: "La imagen es muy pesada. Máximo 1MB.", type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings({ ...settings, logo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('configuracion_sistema').update(settings).eq('id', 1);
      if (error) throw error;
      setNotification({ message: "Configuración guardada en la base de datos", type: 'success' });
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] text-slate-900 dark:text-slate-100 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 md:ml-64 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-2 uppercase">
              <Settings className="text-[#1e3b8a]" size={32} />
              Configuración Global
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">Control Total del Sistema</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm p-4">
                <CardBody className="space-y-6">
                  <div className="flex items-center gap-2 text-[#1e3b8a] font-black uppercase text-xs tracking-widest">
                    <School size={18} /> Identidad Institucional
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="relative group">
                      <div className="size-32 rounded-3xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                        {settings.logo_url ? (
                          <img src={settings.logo_url} className="size-full object-contain p-2" alt="Logo" />
                        ) : (
                          <School className="text-slate-200" size={48} />
                        )}
                      </div>
                      <Button 
                        isIconOnly 
                        size="sm" 
                        color="danger" 
                        variant="flat" 
                        className="absolute -top-2 -right-2 rounded-full shadow-md"
                        onClick={() => setSettings({...settings, logo_url: ''})}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    
                    <div className="flex-1 w-full space-y-4">
                      <Input 
                        label="Nombre de la Institución" 
                        variant="bordered"
                        value={settings.nombre_escuela}
                        onValueChange={(v) => setSettings({...settings, nombre_escuela: v})}
                        classNames={{ input: "font-bold" }}
                      />
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                      <Button 
                        variant="flat" 
                        color="primary" 
                        className="w-full font-black uppercase text-[10px] tracking-widest h-12"
                        startContent={<Upload size={16} />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Subir Logo desde PC
                      </Button>
                      <p className="text-[9px] text-slate-400 font-bold uppercase text-center italic">Recomendado: PNG o JPG de máximo 1MB</p>
                    </div>
                  </div>
                  
                  <Divider />
                  
                  <div className="flex items-center gap-2 text-red-600 font-black uppercase text-xs tracking-widest">
                    <ShieldAlert size={18} /> Alertas de Conducta
                  </div>
                  <Input 
                    label="Límite de Faltas" 
                    type="number"
                    variant="bordered"
                    value={settings.limite_demeritos_alerta.toString()}
                    onValueChange={(v) => setSettings({...settings, limite_demeritos_alerta: Number(v)})}
                  />

                  <Button color="primary" className="bg-[#1e3b8a] font-black uppercase text-xs tracking-widest h-14 w-full shadow-xl shadow-primary/20" startContent={<Save size={20} />} isLoading={isSaving} onPress={handleSaveSettings}>
                    Guardar Configuración Final
                  </Button>
                </CardBody>
              </Card>

              <Card className="border-none shadow-sm p-4">
                <CardBody className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest">
                    <Users size={18} /> Usuarios con Acceso
                  </div>
                  <Table aria-label="Users table" shadow="none">
                    <TableHeader>
                      <TableColumn>USUARIO</TableColumn>
                      <TableColumn>ROL</TableColumn>
                      <TableColumn align="end">ESTADO</TableColumn>
                    </TableHeader>
                    <TableBody isLoading={isLoading} loadingContent={<Spinner />}>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell><User name={u.full_name || u.username} description={u.username} avatarProps={{ size: "sm" }} /></TableCell>
                          <TableCell><Badge color={u.role === 'admin' ? 'secondary' : 'primary'} variant="flat" className="font-black text-[9px] uppercase">{u.role}</Badge></TableCell>
                          <TableCell><div className="size-2 rounded-full bg-emerald-500 ml-auto"></div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-[#1e3b8a] text-white p-8 rounded-[2rem] border-none shadow-2xl">
                <CardBody className="gap-6 text-center">
                  <div className="size-20 bg-white/10 rounded-3xl mx-auto flex items-center justify-center border border-white/20">
                    <Settings size={40} className="animate-spin-slow" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white">Sistema Activo</h3>
                  <p className="text-blue-100 text-xs font-medium leading-relaxed">
                    Todos los cambios realizados en esta sección se sincronizan con la base de datos de Supabase y afectan a todos los usuarios en tiempo real.
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
