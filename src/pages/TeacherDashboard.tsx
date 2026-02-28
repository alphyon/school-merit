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
    if (!navigator.onLine || isSyncing) return;
    const pending = await db.pendingEvents.where('sync_status').equals('pending').toArray();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    let errorOccurred = false;

    try {
      for (const event of pending) {
        const { id, sync_status, ...eventData } = event;
        // 1. Asegurar que estamos enviando el ID de docente correcto (Auth UUID)
        const realUserId = localStorage.getItem('supabase_user_id');
        if (realUserId) eventData.docente_id = realUserId;

        const { error } = await supabase.from('registros_eventos').insert(eventData);
        if (!error) {
          await db.pendingEvents.delete(id!);
          successCount++;
        } else {
          console.error("Error sincronizando registro:", error.message);
          errorOccurred = true;
        }
      }
      
      if (successCount > 0) {
        setNotification({ message: `Sincronizados ${successCount} registros`, type: 'success' });
        fetchData(); // Refrescar puntos y alertas
      }
      if (errorOccurred) {
        setNotification({ message: "Algunos registros no se pudieron subir", type: 'error' });
      }
      checkPendingSync();
    } catch (e) { console.error(e); } finally { setIsSyncing(false); }
  };

  const checkPendingSync = async () => {
    const count = await db.pendingEvents.where('sync_status').equals('pending').count();
    setPendingSyncCount(count);
  };

  const fetchData = async () => {
    try {
      checkPendingSync();
      fetchCatalogsToLocal();
      if (navigator.onLine) {
        syncPendingEvents();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('perfiles').select('teacher_id, full_name').eq('id', user.id).single();
        if (profile?.teacher_id) {
          setTeacherName(profile.full_name || "Docente");
          localStorage.setItem('teacher_id', profile.teacher_id);
          const { data: groupsData } = await supabase.from('docentes_grupos').select('grupos(id, nombre)').eq('docente_id', profile.teacher_id);
          const groups = groupsData?.map((g: any) => g.grupos).filter(Boolean) || [];
          setAssignedGroups(groups);
          
          await db.groups.bulkPut(groups);

          // Pre-cache students for ALL groups in background
          groups.forEach(g => fetchStudents(g.id));

          const savedId = localStorage.getItem('teacher_group_id');
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
      setAssignedGroups(localGroups);
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
          
          // Actualizar caché local
          const localToSave = cloud.map(s => ({
            id: s.id, nie: s.nie, nombre: s.nombre, grupo_id: s.grupo_id, grupo_nombre: s.grupo_nombre
          }));
          await db.students.bulkPut(localToSave);
        }
      } else {
        // RESCATE OFFLINE: Cargar desde Dexie
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

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) return <DashboardLayout role="docente"><div className="h-[80vh] flex items-center justify-center"><Spinner /></div></DashboardLayout>;

  return (
    <DashboardLayout role="docente">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      {!navigator.onLine && (
        <Card className="mb-6 border-none shadow-md bg-orange-500 text-white rounded-2xl overflow-hidden">
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
              className="font-black uppercase text-[10px]" 
              startContent={<CloudSync size={18} className={isSyncing ? "animate-spin" : ""} />}
              onPress={syncPendingEvents}
              isLoading={isSyncing}
            >
              Sincronizar ({pendingSyncCount})
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-8 border-none shadow-sm bg-white">
        <CardBody className="p-4 flex flex-col md:flex-row gap-4 text-slate-900">
          <Input className="flex-1" aria-label="Buscar alumnos" placeholder="Buscar alumno..." startContent={<Search size={18} className="text-gray-400" />} value={searchTerm} onValueChange={setSearchTerm} variant="bordered" />
          <Select className="w-full md:w-64" aria-label="Seleccionar grupo" placeholder="Sección" variant="bordered" selectedKeys={selectedGroupId ? [selectedGroupId] : []} onSelectionChange={(k) => { const id = Array.from(k)[0] as string; setSelectedGroupId(id); localStorage.setItem('teacher_group_id', id); fetchStudents(id); }}>
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
      {selectedStudent && <EventModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} studentId={selectedStudent.id} studentName={selectedStudent.name} initialTab={modalTab} onSuccess={() => fetchStudents(selectedGroupId)} />}
    </DashboardLayout>
  );
}
