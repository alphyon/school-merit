import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { db } from '../lib/localDb';
import DashboardLayout from '../layouts/DashboardLayout';
import EventModal from '../components/EventModal';
import { Notification } from '../components/Notification';
import { Card, CardBody, Button, Select, SelectItem, Spinner, Avatar, Input } from "@heroui/react";
import { Search, ShieldAlert, Award, History, LayoutDashboard, Users, CloudSync } from 'lucide-react';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState("");
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(localStorage.getItem('teacher_group_id') || "");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{id: string, name: string} | null>(null);
  const [modalTab, setModalTab] = useState("demerito");
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNotification({ message: "Conexión restaurada", type: 'success' }); // El componente Notification usa 'success' como azul usualmente, pero podemos personalizarlo
      fetchData(); 
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNotification({ message: "Modo Offline activado", type: 'error' }); // Usaremos 'error' para forzar color de advertencia
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchCatalogsToLocal = async () => {
    if (!navigator.onLine) return;
    try {
      const catalogs = [
        { table: 'demeritos_catalogo', tipo: 'demerito' },
        { table: 'redenciones_catalogo', tipo: 'redencion' },
        { table: 'reconocimientos_catalogo', tipo: 'reconocimiento' }
      ];
      for (const cat of catalogs) {
        const { data } = await supabase.from(cat.table).select('*');
        if (data) {
          const formatted = data.map(item => ({
            id: item.id, codigo: item.codigo, descripcion: item.descripcion, puntos_valor: item.puntos_valor, tipo: cat.tipo
          }));
          await db.catalog.bulkPut(formatted as any);
        }
      }
    } catch (e) { console.error("Catalog sync error:", e); }
  };

  const syncPendingEvents = async () => {
    if (!navigator.onLine || isSyncing) {
      if (!navigator.onLine) setNotification({ message: "No hay conexión a internet", type: 'error' });
      return;
    }
    
    const pending = await db.pendingEvents.toArray();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const event of pending) {
        const { id, sync_status, ...eventData } = event;
        
        // Mapeo explícito para evitar fallos de integridad
        const payload = {
          estudiante_id: eventData.estudiante_id,
          docente_id: eventData.docente_id,
          tipo: eventData.tipo,
          demerito_id: eventData.demerito_id,
          redencion_id: eventData.redencion_id,
          reconocimiento_id: eventData.reconocimiento_id,
          evento_referencia_id: eventData.evento_referencia_id,
          observaciones: eventData.observaciones,
          fecha: eventData.fecha,
          estado: eventData.estado || 'activo'
        };

        const { error } = await supabase.from('registros_eventos').insert(payload);
        
        if (!error) {
          await db.pendingEvents.delete(id!);
          successCount++;
        } else {
          console.error("Fallo en registro:", error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setNotification({ message: `Sincronizados ${successCount} registros con éxito`, type: 'success' });
        await fetchData(); // Recargar todo
      }
      if (errorCount > 0) {
        setNotification({ message: `Error en ${errorCount} registros. Verifique consola.`, type: 'error' });
      }
    } catch (e) { 
      console.error(e);
      setNotification({ message: "Error crítico en sincronización", type: 'error' });
    } finally { 
      setIsSyncing(false);
      checkPendingSync();
    }
  };

  const checkPendingSync = async () => {
    const count = await db.pendingEvents.count();
    setPendingSyncCount(count);
  };

  const fetchData = async () => {
    try {
      await checkPendingSync();
      await fetchCatalogsToLocal();
      
      if (navigator.onLine) {
        // La sincronización es manual, se ha quitado de aquí para evitar bucles infinitos
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const { data: profile } = await supabase.from('perfiles').select('teacher_id, full_name').eq('id', session.user.id).single();
        if (profile?.teacher_id) {
          setTeacherName(profile.full_name || "Docente");
          localStorage.setItem('teacher_id', profile.teacher_id);
          const { data: groupsData } = await supabase.from('docentes_grupos').select('grupos(id, nombre)').eq('docente_id', profile.teacher_id);
          const groups = groupsData?.map((g: any) => g.grupos).filter(Boolean) || [];
          setAssignedGroups(groups);
          await db.groups.bulkPut(groups);
          
          const savedId = localStorage.getItem('teacher_group_id');
          // VALIDACIÓN CRÍTICA: Asegurar que el ID existe en la colección antes de pasarlo al Select
          const targetId = (savedId && groups.some(g => g.id === savedId)) ? savedId : (groups[0]?.id || "");
          if (targetId) { setSelectedGroupId(targetId); fetchStudents(targetId); }
        }
      } else {
        const localGroups = await db.groups.toArray();
        setAssignedGroups(localGroups);
        const savedId = localStorage.getItem('teacher_group_id');
        const targetId = (savedId && localGroups.some(g => g.id === savedId)) ? savedId : (localGroups[0]?.id || "");
        if (targetId) { setSelectedGroupId(targetId); fetchStudents(targetId); }
      }
    } catch (e) { 
      const localGroups = await db.groups.toArray();
      if (localGroups.length > 0) setAssignedGroups(localGroups);
    } finally { setIsLoading(false); }
  };

  const fetchStudents = async (groupId: string) => {
    try {
      if (navigator.onLine) {
        const { data: cloud } = await supabase.from('estudiantes_reporte').select('*').eq('grupo_id', groupId);
        if (cloud) {
          const studentIds = cloud.map(s => s.id);
          const { data: events } = await supabase.from('registros_eventos').select('estudiante_id').eq('tipo', 'reconocimiento').in('estudiante_id', studentIds);
          const enriched = cloud.map(s => ({
            ...s,
            total_reconocimientos: events?.filter(e => e.estudiante_id === s.id).length || 0
          }));
          setStudents(enriched);
          
          // ACTUALIZACIÓN CRÍTICA: Guardar alumnos con sus puntos en Dexie
          const localToSave = enriched.map(s => ({
            id: s.id, 
            nie: s.nie, 
            nombre: s.nombre, 
            grupo_id: s.grupo_id, 
            grupo_nombre: s.grupo_nombre,
            balance_puntos: s.balance_puntos,
            puntos_limpiados: s.puntos_limpiados,
            total_reconocimientos: s.total_reconocimientos
          }));
          await db.students.bulkPut(localToSave);
        }
      } else {
        // RESCATE OFFLINE: Cargar desde Dexie (ahora con puntos!)
        const localStudents = await db.students.where('grupo_id').equals(groupId).toArray();
        setStudents(localStudents);
      }
    } catch (e) {
      const localStudents = await db.students.where('grupo_id').equals(groupId).toArray();
      setStudents(localStudents);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = (e: React.MouseEvent, student: any, tab: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedStudent({ id: student.id, name: student.nombre });
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const handleEventSuccess = async () => {
    checkPendingSync();
    if (isOnline) {
      await fetchStudents(selectedGroupId);
      setNotification({ message: "Registro guardado en la nube", type: 'success' });
    } else {
      setNotification({ message: "Guardado localmente. Sincroniza para actualizar puntos.", type: 'success' });
    }
  };

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) return <DashboardLayout role="docente"><div className="h-[80vh] flex items-center justify-center"><Spinner /></div></DashboardLayout>;

  return (
    <DashboardLayout role="docente">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      {!isOnline && (
        <Card className="mb-6 border-none shadow-md bg-orange-500 text-white rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-500">
          <CardBody className="py-3 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <CloudSync size={20} className="animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest">Modo Offline Activo</p>
                <p className="text-[10px] font-bold opacity-90">Los datos se guardarán localmente y se sincronizarán al detectar conexión.</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex justify-between items-center mb-8 text-slate-900">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3"><LayoutDashboard className="text-[#1e3b8a]" size={32} /> Panel de Alumnos</h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Docente: {teacherName}</p>
        </div>
        <div className="flex gap-2">
          {pendingSyncCount > 0 && (
            <Button 
              color="warning" 
              variant="flat" 
              className="font-black uppercase text-[10px] h-10 px-6 rounded-xl border-2 border-orange-100 shadow-sm" 
              startContent={<CloudSync size={18} className={isSyncing ? "animate-spin" : ""} />}
              onPress={syncPendingEvents}
              isLoading={isSyncing}
              isDisabled={!isOnline}
            >
              Sincronizar ({pendingSyncCount})
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-8 border-none shadow-sm bg-white">
        <CardBody className="p-4 flex flex-col md:flex-row gap-4 text-slate-900">
          <Input className="flex-1" aria-label="Buscar alumnos" placeholder="Buscar alumno..." startContent={<Search size={18} className="text-gray-400" />} value={searchTerm} onValueChange={setSearchTerm} variant="bordered" />
          <Select 
            className="w-full md:w-64" 
            aria-label="Seleccionar grupo" 
            placeholder="Sección" 
            variant="bordered" 
            selectedKeys={assignedGroups.length > 0 && selectedGroupId ? [selectedGroupId] : []} 
            onSelectionChange={(k) => { 
              const id = Array.from(k)[0] as string; 
              if (id) {
                setSelectedGroupId(id); 
                localStorage.setItem('teacher_group_id', id); 
                fetchStudents(id); 
              }
            }}
          >
            {assignedGroups.map((g) => <SelectItem key={g.id} textValue={g.nombre}>{g.nombre}</SelectItem>)}
          </Select>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {filtered.map((s) => {
          const points = s.balance_puntos || 0;
          const merits = s.puntos_limpiados || 0;
          const recognitions = s.total_reconocimientos || 0;
          let alertMsg = ""; let alertStyle = "";
          if (points >= 15) { alertMsg = "NO PROMOCIÓN"; alertStyle = "text-red-600 border-red-600 bg-white"; }
          else if (points >= 10) { alertMsg = "SUSPENSIÓN"; alertStyle = "text-orange-600 border-orange-600 bg-white"; }
          else if (points >= 6) { alertMsg = "AVISO FAMILIA"; alertStyle = "text-yellow-600 border-yellow-500 bg-yellow-50"; }
          else if (points >= 3) { alertMsg = "ADVERTENCIA"; alertStyle = "text-blue-600 border-blue-600 bg-white"; }

          return (
            <Card key={s.id} className="border-none shadow-sm hover:shadow-2xl transition-all duration-500 bg-white overflow-visible group">
              <CardBody className="p-0 overflow-visible text-slate-900">
                <div className={`h-24 relative rounded-t-2xl cursor-pointer ${ points >= 15 ? 'bg-red-600' : (points >= 10 ? 'bg-orange-600' : (points >= 6 ? 'bg-yellow-500' : 'bg-[#1e3b8a]')) }`} onClick={() => navigate(`/student/${s.id}`)}>
                  <div className="absolute top-0 right-0 p-3 opacity-10"><Users size={80} className="text-white transform rotate-12" /></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                    <Avatar name={s.nombre} className="w-20 h-20 text-xl border-4 border-white shadow-xl bg-gray-200" />
                  </div>
                  {alertMsg && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full border-2 shadow-xl font-black text-[9px] z-20 animate-bounce ${alertStyle}`}>
                      {alertMsg}
                    </div>
                  )}
                </div>
                <div className="pt-12 px-4 pb-6 text-center">
                  <h3 className="text-xs font-black uppercase leading-tight line-clamp-3 min-h-[3rem] mb-4 hover:text-blue-700 cursor-pointer" onClick={() => navigate(`/student/${s.id}`)}>{s.nombre}</h3>
                  
                  <div className="flex justify-between gap-1 mb-6">
                    <div className="bg-red-50 p-2 rounded-xl flex-1 border border-red-100 shadow-inner">
                      <span className="block text-lg font-black text-red-600">{points}</span>
                      <span className="text-[7px] font-black text-red-400 uppercase">Deméritos</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-xl flex-1 border border-emerald-100 shadow-inner">
                      <span className="block text-lg font-black text-emerald-600">{merits}</span>
                      <span className="text-[7px] font-black text-emerald-400 uppercase">Redimidos</span>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-xl flex-1 border border-purple-100 shadow-inner">
                      <span className="block text-lg font-black text-purple-600">{recognitions}</span>
                      <span className="text-[7px] font-black text-purple-400 uppercase">Reconoc.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 relative z-30">
                    <Button aria-label="Registrar demérito" size="sm" isIconOnly className="bg-red-100 text-red-700 h-10 w-full" onClick={(e) => handleAction(e, s, 'demerito')}><ShieldAlert size={18} /></Button>
                    <Button aria-label="Registrar redención" size="sm" isIconOnly className="bg-emerald-100 text-emerald-700 h-10 w-full" onClick={(e) => handleAction(e, s, 'redencion')}><History size={18} /></Button>
                    <Button aria-label="Registrar reconocimiento" size="sm" isIconOnly className="bg-purple-100 text-purple-700 h-10 w-full" onClick={(e) => handleAction(e, s, 'reconocimiento')}><Award size={18} /></Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
      {selectedStudent && (
        <EventModal 
          isOpen={isModalOpen} 
          onOpenChange={setIsModalOpen} 
          studentId={selectedStudent.id} 
          studentName={selectedStudent.name} 
          initialTab={modalTab} 
          onSuccess={handleEventSuccess} 
        />
      )}
    </DashboardLayout>
  );
}
