import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import { Card, CardBody, Button, Input, Spinner } from "@heroui/react";
import { Settings, School, ShieldAlert, Save, Upload, Trash2, ImageIcon, MapPin, FileSpreadsheet, Download } from 'lucide-react';
import { downloadStudentTemplate } from '../utils/templateUtils';

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState({ 
    nombre_escuela: '', 
    codigo_ce: '',
    departamento: '',
    municipio: '',
    distrito: '',
    limite_demeritos_alerta: 30, 
    logo_url: '' 
  });
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: sData } = await supabase.from('configuracion_sistema').select('*').single();
      if (sData) setSettings({ 
        nombre_escuela: sData.nombre_escuela || '', 
        codigo_ce: sData.codigo_ce || '',
        departamento: sData.departamento || '',
        municipio: sData.municipio || '',
        distrito: sData.distrito || '',
        limite_demeritos_alerta: sData.limite_demeritos_alerta || 30,
        logo_url: sData.logo_url || ''
      });
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setSettings({ ...settings, logo_url: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('configuracion_sistema').update(settings).eq('id', 1);
      if (error) throw error;
      setNotification({ message: "Configuración guardada", type: 'success' });
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  if (isLoading) return <DashboardLayout role="admin"><div className="flex justify-center py-20"><Spinner /></div></DashboardLayout>;

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="text-[#1e3b8a]" size={32} /> Configuración Global
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardBody className="p-6 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#1e3b8a] font-black text-xs tracking-widest border-b pb-2">
                  <School size={18} /> Datos de la Institución
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="relative group">
                    <div className="size-32 rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                      {settings.logo_url ? <img src={settings.logo_url} className="size-full object-contain p-2" alt="Logo" /> : <ImageIcon className="text-gray-300" size={48} />}
                    </div>
                    {settings.logo_url && <Button isIconOnly size="sm" color="danger" className="absolute -top-2 -right-2 rounded-full" onPress={() => setSettings({...settings, logo_url: ''})}><Trash2 size={14} /></Button>}
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <Input label="Nombre del C.E." variant="bordered" value={settings.nombre_escuela} onValueChange={(v) => setSettings({...settings, nombre_escuela: v})} />
                    <Input label="Código del C.E." variant="bordered" value={settings.codigo_ce} onValueChange={(v) => setSettings({...settings, codigo_ce: v})} />
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <Button variant="flat" color="primary" className="w-full font-bold text-xs" startContent={<Upload size={16} />} onPress={() => fileInputRef.current?.click()}>Subir Logo</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-slate-500 font-black text-xs tracking-widest border-b pb-2">
                  <MapPin size={18} /> Ubicación
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Departamento" variant="bordered" value={settings.departamento} onValueChange={(v) => setSettings({...settings, departamento: v})} />
                  <Input label="Municipio" variant="bordered" value={settings.municipio} onValueChange={(v) => setSettings({...settings, municipio: v})} />
                  <Input label="Distrito" variant="bordered" value={settings.distrito} onValueChange={(v) => setSettings({...settings, distrito: v})} />
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-red-600 font-black text-xs tracking-widest border-b pb-2">
                  <ShieldAlert size={18} /> Reglas
                </div>
                <Input label="Límite para Alerta" type="number" variant="bordered" value={settings.limite_demeritos_alerta.toString()} onValueChange={(v) => setSettings({...settings, limite_demeritos_alerta: Number(v)})} />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-emerald-600 font-black text-xs tracking-widest border-b pb-2">
                  <FileSpreadsheet size={18} /> Formatos de Carga
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-emerald-900 font-black text-xs">Plantilla de Alumnos</p>
                    <p className="text-xs text-emerald-700 font-medium">Descargue el formato base para la carga masiva de estudiantes.</p>
                  </div>
                  <Button 
                    color="success" 
                    variant="flat" 
                    className="font-black text-xs h-10" 
                    startContent={<Download size={16} />}
                    onPress={downloadStudentTemplate}
                  >
                    Descargar Excel
                  </Button>
                </div>
              </div>

              <Button color="primary" className="bg-[#1e3b8a] font-black h-14 w-full shadow-xl" startContent={<Save size={20} />} isLoading={isSaving} onPress={handleSaveSettings}>Guardar Todo</Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
