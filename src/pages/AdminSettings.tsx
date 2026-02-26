import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AppHeader from '../components/AppHeader';
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
      setNotification({ message: "Éxito", type: 'success' });
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] text-slate-900 dark:text-slate-100 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <AppHeader role="admin" />
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-2 uppercase"><Settings className="text-[#1e3b8a]" size={32} /> Configuración</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm p-4">
                <CardBody className="space-y-6">
                  <div className="flex items-center gap-2 text-[#1e3b8a] font-black uppercase text-xs tracking-widest"><School size={18} /> Institución</div>
                  <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="relative">
                      <div className="size-32 rounded-3xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                        {settings.logo_url ? <img src={settings.logo_url} className="size-full object-contain p-2" alt="Logo" /> : <School className="text-slate-200" size={48} />}
                      </div>
                      <Button isIconOnly size="sm" color="danger" variant="flat" className="absolute -top-2 -right-2 rounded-full" onClick={() => setSettings({...settings, logo_url: ''})}><Trash2 size={14} /></Button>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      <Input label="Nombre" variant="bordered" value={settings.nombre_escuela} onValueChange={(v) => setSettings({...settings, nombre_escuela: v})} />
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                      <Button variant="flat" color="primary" className="w-full font-black uppercase text-[10px]" startContent={<Upload size={16} />} onClick={() => fileInputRef.current?.click()}>Subir Logo</Button>
                    </div>
                  </div>
                  <Divider />
                  <div className="flex items-center gap-2 text-red-600 font-black uppercase text-xs tracking-widest"><ShieldAlert size={18} /> Alertas</div>
                  <Input label="Límite" type="number" variant="bordered" value={settings.limite_demeritos_alerta.toString()} onValueChange={(v) => setSettings({...settings, limite_demeritos_alerta: Number(v)})} />
                  <Button color="primary" className="bg-[#1e3b8a] font-black uppercase text-xs h-14 w-full" startContent={<Save size={20} />} isLoading={isSaving} onPress={handleSaveSettings}>Guardar</Button>
                </CardBody>
              </Card>

              <Card className="border-none shadow-sm p-4">
                <CardBody className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest"><Users size={18} /> Usuarios</div>
                  <Table aria-label="Users" shadow="none">
                    <TableHeader><TableColumn>USUARIO</TableColumn><TableColumn>ROL</TableColumn><TableColumn align="end">ESTADO</TableColumn></TableHeader>
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
              <Card className="bg-[#1e3b8a] text-white p-8 rounded-[2rem] border-none shadow-xl"><CardBody className="gap-6 text-center"><div className="size-20 bg-white/10 rounded-3xl mx-auto flex items-center justify-center border border-white/20"><Settings size={40} /></div><h3 className="text-xl font-black uppercase">Sistema Activo</h3></CardBody></Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
