import { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Tabs, 
  Tab, 
  Textarea,
  Chip,
  Spinner
} from "@heroui/react";
import { ShieldAlert, BadgeCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/localDb';
import { Notification } from './Notification';

interface EventModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  studentId?: string;
  studentName?: string;
  onSuccess?: () => void;
  initialTab?: string;
}

export default function EventModal({ isOpen, onOpenChange, studentId, studentName, onSuccess, initialTab }: EventModalProps) {
  const [activeTab, setActiveTab] = useState("demeritos");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [observaciones, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demeritos, setDemeritos] = useState<any[]>([]);
  const [redenciones, setRedenciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchCatalogs = async () => {
    setIsLoading(true);
    try {
      // Intentar cargar de Supabase
      const { data: dData } = await supabase.from('demeritos_catalogo').select('*').order('codigo');
      const { data: rData } = await supabase.from('redenciones_catalogo').select('*').order('codigo');
      
      if (dData) {
        setDemeritos(dData);
        localStorage.setItem('cached_demeritos', JSON.stringify(dData));
      }
      if (rData) {
        setRedenciones(rData);
        localStorage.setItem('cached_redenciones', JSON.stringify(rData));
      }
    } catch (error) {
      // Si falla (offline), cargar de cache local
      const cachedD = localStorage.getItem('cached_demeritos');
      const cachedR = localStorage.getItem('cached_redenciones');
      if (cachedD) setDemeritos(JSON.parse(cachedD));
      if (cachedR) setRedenciones(JSON.parse(cachedR));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      fetchCatalogs();
      setSelectedItem(null);
      setObservations("");
      setNotification(null);
    }
  }, [isOpen, initialTab]);

  const handleSubmit = async (onClose: () => void) => {
    if (!selectedItem || !studentId) return;

    const teacherId = localStorage.getItem('teacher_id');
    if (!teacherId) {
      setNotification({ message: "Sesión no encontrada", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    const eventData: any = {
      estudiante_id: studentId,
      docente_id: teacherId, 
      tipo: activeTab === 'demeritos' ? 'demerito' : 'redencion',
      demerito_id: activeTab === 'demeritos' ? selectedItem.id : null,
      redencion_id: activeTab === 'redenciones' ? selectedItem.id : null,
      observaciones: observaciones,
      fecha: new Date().toISOString().split('T')[0]
    };

    try {
      if (navigator.onLine) {
        const { error } = await supabase.from('registros_eventos').insert(eventData);
        if (error) throw error;
        setNotification({ message: "Guardado en la nube", type: 'success' });
      } else {
        // MODO OFFLINE: Guardar en Dexie
        await db.pendingEvents.add({ ...eventData, sync_status: 'pending' });
        setNotification({ message: "Guardado localmente (Offline)", type: 'success' });
      }
      
      if (onSuccess) onSuccess();
      setTimeout(onClose, 1000);
    } catch (error: any) {
      // Fallback a offline si Supabase falla
      await db.pendingEvents.add({ ...eventData, sync_status: 'pending' });
      setNotification({ message: "Error de red. Guardado localmente.", type: 'success' });
      if (onSuccess) onSuccess();
      setTimeout(onClose, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentList = activeTab === "demeritos" ? demeritos : redenciones;

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      size="2xl"
      scrollBehavior="inside"
      backdrop="blur"
      className="font-['Lexend']"
    >
      <ModalContent>
        {(onClose) => (
          <>
            {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50">
              <h2 className="text-xl font-black text-[#1e3b8a]">REGISTRAR INCIDENCIA</h2>
              {studentName && <p className="text-sm font-bold text-slate-500 italic">Alumno: {studentName}</p>}
            </ModalHeader>
            <ModalBody className="py-6 space-y-6">
              <Tabs 
                aria-label="Tipo" color={activeTab === "demeritos" ? "danger" : "success"} variant="solid" fullWidth selectedKey={activeTab}
                onSelectionChange={(key) => { setActiveTab(key as string); setSelectedItem(null); }}
                classNames={{ tabList: "p-1 bg-slate-100 dark:bg-slate-800 rounded-xl", cursor: activeTab === "demeritos" ? "bg-red-500" : "bg-emerald-500", tabContent: "font-black uppercase text-[10px] group-data-[selected=true]:text-white" }}
              >
                <Tab key="demeritos" title={<div className="flex items-center space-x-2"><ShieldAlert size={16} /><span>Faltas</span></div>} />
                <Tab key="redenciones" title={<div className="flex items-center space-x-2"><BadgeCheck size={16} /><span>Méritos</span></div>} />
              </Tabs>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {isLoading ? (
                  <div className="col-span-2 flex justify-center py-10"><Spinner /></div>
                ) : currentList.map((item) => (
                  <div key={item.id} onClick={() => setSelectedItem(item)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${selectedItem?.id === item.id ? (activeTab === 'demeritos' ? 'border-red-500 bg-red-50 shadow-md' : 'border-emerald-500 bg-emerald-50 shadow-md') : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
                    <div className="flex justify-between items-center"><Chip size="sm" variant="flat" className={`font-black text-[10px] ${selectedItem?.id === item.id ? 'bg-white text-black' : ''}`}>{item.codigo}</Chip><span className={`font-black text-sm ${activeTab === 'demeritos' ? 'text-red-600' : 'text-emerald-600'}`}>{item.puntos_valor > 0 ? `+${item.puntos_valor}` : item.puntos_valor} PTS</span></div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{item.descripcion}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observaciones</label>
                <Textarea placeholder="Escriba detalles aquí..." variant="bordered" rows={2} value={observaciones} onValueChange={setObservations} classNames={{ input: "text-sm font-medium" }} />
              </div>
            </ModalBody>
            <ModalFooter className="bg-slate-50/50 border-t border-slate-100">
              <Button variant="light" onPress={onClose} className="font-black text-slate-500 uppercase text-xs">Cancelar</Button>
              <Button color="primary" className="bg-[#1e3b8a] font-black uppercase text-xs shadow-lg h-12 px-8" onPress={() => handleSubmit(onClose)} isLoading={isSubmitting} isDisabled={!selectedItem}>Confirmar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
