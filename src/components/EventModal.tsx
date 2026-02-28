import { useState, useEffect } from 'react';
import { 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, 
  Tabs, Tab, Textarea, Chip, Spinner, Select, SelectItem
} from "@heroui/react";
import { ShieldAlert, BadgeCheck, AlertCircle, Award } from 'lucide-react';
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
  initialDemeritId?: string; // Propiedad para pre-seleccionar la falta
}

export default function EventModal({ isOpen, onOpenChange, studentId, studentName, onSuccess, initialTab, initialDemeritId }: EventModalProps) {
  const [activeTab, setActiveTab] = useState("demerito");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedDemeritRef, setSelectedDemeritRef] = useState<string>("");
  const [observaciones, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [activeDemerits, setActiveDemerits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchCatalog = async (typeToFetch: string) => {
    setIsLoading(true);
    setItems([]);
    try {
      let data = await db.catalog.where('tipo').equals(typeToFetch).toArray();
      if (navigator.onLine) {
        const tableName = typeToFetch === 'demerito' ? 'demeritos_catalogo' : (typeToFetch === 'redencion' ? 'redenciones_catalogo' : 'reconocimientos_catalogo');
        const { data: cloudData } = await supabase.from(tableName).select('*');
        if (cloudData && cloudData.length > 0) {
          const localItems = cloudData.map(item => ({
            id: item.id, codigo: item.codigo, descripcion: item.descripcion, puntos_valor: item.puntos_valor, tipo: typeToFetch
          }));
          await db.catalog.bulkPut(localItems as any);
          data = localItems as any;
        }
      }
      setItems(data.sort((a, b) => a.codigo.localeCompare(b.codigo)));

      if (typeToFetch === 'redencion' && studentId && navigator.onLine) {
        const { data: demData } = await supabase.from('registros_eventos')
          .select('id, created_at, demeritos_catalogo(codigo, descripcion)')
          .eq('estudiante_id', studentId)
          .eq('tipo', 'demerito')
          .eq('estado', 'activo');
        setActiveDemerits(demData || []);
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (isOpen) {
      const tabMap: {[key: string]: string} = { 'demerito': 'demerito', 'redencion': 'redencion', 'reconocimiento': 'reconocimiento', 'demeritos': 'demerito', 'redenciones': 'redencion', 'reconocimientos': 'reconocimiento' };
      const target = tabMap[initialTab || 'demerito'] || 'demerito';
      setActiveTab(target);
      fetchCatalog(target);
      setSelectedItem(null);
      setObservations("");
      
      // Lógica de pre-selección
      if (target === 'redencion' && initialDemeritId) {
        setSelectedDemeritRef(initialDemeritId);
      } else {
        setSelectedDemeritRef("");
      }
    }
  }, [isOpen, initialTab, initialDemeritId]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    fetchCatalog(key);
    setSelectedItem(null);
    if (key !== 'redencion' || !initialDemeritId) {
      setSelectedDemeritRef("");
    }
  };

  const handleSubmit = async (onClose: () => void) => {
    if (!selectedItem || !studentId) return;
    const teacherId = localStorage.getItem('teacher_id');
    if (!teacherId) return;

    setIsSubmitting(true);
    try {
      const eventData: any = {
        estudiante_id: studentId,
        docente_id: teacherId, 
        tipo: activeTab,
        demerito_id: activeTab === 'demerito' ? selectedItem.id : null,
        redencion_id: activeTab === 'redencion' ? selectedItem.id : null,
        reconocimiento_id: activeTab === 'reconocimiento' ? selectedItem.id : null,
        evento_referencia_id: activeTab === 'redencion' ? selectedDemeritRef : null,
        observaciones: observaciones,
        fecha: new Date().toISOString(),
        estado: 'activo'
      };

      if (navigator.onLine) {
        const { error: insertError } = await supabase.from('registros_eventos').insert(eventData);
        if (insertError) throw insertError;

        if (activeTab === 'redencion' && selectedDemeritRef) {
          await supabase.from('registros_eventos').update({ estado: 'redimido' }).eq('id', selectedDemeritRef);
        }
        setNotification({ message: "Guardado en la nube", type: 'success' });
      } else {
        // RESTAURACIÓN: Guardado Offline en Dexie
        await db.pendingEvents.add({ ...eventData, sync_status: 'pending' });
        setNotification({ message: "Guardado localmente (Offline)", type: 'success' });
      }
      
      if (onSuccess) onSuccess();
      setTimeout(onClose, 500);
    } catch (error: any) {
      // Fallback de seguridad: si la red falla inesperadamente
      await db.pendingEvents.add({
        estudiante_id: studentId!,
        docente_id: teacherId,
        tipo: activeTab as any,
        demerito_id: activeTab === 'demerito' ? selectedItem.id : null,
        redencion_id: activeTab === 'redencion' ? selectedItem.id : null,
        reconocimiento_id: activeTab === 'reconocimiento' ? selectedItem.id : null,
        evento_referencia_id: activeTab === 'redencion' ? selectedDemeritRef : null,
        observaciones: observaciones,
        fecha: new Date().toISOString(),
        sync_status: 'pending'
      });
      setNotification({ message: "Error de red. Guardado en local.", type: 'success' });
      if (onSuccess) onSuccess();
      setTimeout(onClose, 800);
    } finally { setIsSubmitting(false); }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" scrollBehavior="inside" backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-black text-[#1e3b8a] uppercase">Registro Conductual</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alumno: {studentName}</p>
            </ModalHeader>
            <ModalBody className="py-6 space-y-6">
              <Tabs aria-label="Tipo" color={activeTab === "demerito" ? "danger" : (activeTab === "redencion" ? "success" : "secondary")} variant="solid" fullWidth selectedKey={activeTab} onSelectionChange={(key) => handleTabChange(key as string)} classNames={{ tabList: "p-1 bg-slate-100 rounded-xl", tabContent: "font-black uppercase text-[10px]" }}>
                <Tab key="demerito" title={<div className="flex items-center space-x-2"><ShieldAlert size={16} /><span>Demérito</span></div>} />
                <Tab key="redencion" title={<div className="flex items-center space-x-2"><BadgeCheck size={16} /><span>Redención</span></div>} />
                <Tab key="reconocimiento" title={<div className="flex items-center space-x-2"><Award size={16} /><span>Reconocimiento</span></div>} />
              </Tabs>

              {activeTab === 'redencion' && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase mb-3 flex items-center gap-2"><AlertCircle size={14} /> Demérito a redimir:</p>
                  {initialDemeritId ? (
                    <div className="p-3 bg-white rounded-xl border border-blue-200 font-bold text-xs text-blue-700 uppercase">
                      {activeDemerits.find(d => d.id === initialDemeritId)?.demeritos_catalogo?.descripcion || "Falta seleccionada..."}
                    </div>
                  ) : (
                    <Select size="sm" label={activeDemerits.length > 0 ? "Seleccione de la lista..." : "Sin faltas activas"} selectedKeys={selectedDemeritRef ? [selectedDemeritRef] : []} onSelectionChange={(keys) => setSelectedDemeritRef(Array.from(keys)[0] as string)} variant="bordered" className="bg-white">
                      {activeDemerits.map((dem: any) => (
                        <SelectItem key={dem.id} textValue={dem.demeritos_catalogo?.codigo}>
                          {dem.demeritos_catalogo?.codigo}: {dem.demeritos_catalogo?.descripcion}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="col-span-2 flex justify-center py-10"><Spinner /></div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} onClick={() => setSelectedItem(item)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${selectedItem?.id === item.id ? (activeTab === 'demerito' ? 'border-red-500 bg-red-50' : (activeTab === 'redencion' ? 'border-emerald-500 bg-emerald-50' : 'border-purple-500 bg-purple-50')) : 'border-slate-100 bg-white'}`}>
                      <div className="flex justify-between items-center">
                        <Chip size="sm" variant="solid" className="font-black text-[10px]">{item.codigo}</Chip>
                        {item.puntos_valor > 0 && activeTab !== 'reconocimiento' && <span className="font-black text-xs">+{item.puntos_valor} PTS</span>}
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">{item.descripcion}</p>
                    </div>
                  ))
                )}
              </div>
              <Textarea label="Observaciones" placeholder="Detalles..." variant="bordered" minRows={2} value={observaciones} onValueChange={setObservations} />
            </ModalBody>
            <ModalFooter className="bg-slate-50/50 border-t border-slate-100 p-4">
              <Button variant="light" onPress={() => onClose()} className="font-black text-slate-400 uppercase text-[10px]">Cerrar</Button>
              <Button color={activeTab === 'demerito' ? "danger" : (activeTab === 'redencion' ? "success" : "secondary")} className={`font-black uppercase text-[10px] h-10 px-8 text-white shadow-lg`} onPress={() => handleSubmit(onClose)} isLoading={isSubmitting} isDisabled={!selectedItem}>Confirmar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
