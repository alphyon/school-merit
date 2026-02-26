import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import EventModal from '../components/EventModal';
import { Notification } from '../components/Notification';
import { capitalizeName } from '../utils/formatUtils';
import { Card, CardBody, Input, Button, useDisclosure, Pagination, Spinner, Select, SelectItem, Badge } from "@heroui/react";
import { Search, ShieldAlert, BadgeCheck, Info, CloudOff, CloudSync, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/localDb';
import { useLiveQuery } from 'dexie-react-hooks';

export default function TeacherDashboard() {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(localStorage.getItem('teacher_group_id') || "");
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState({ demerits: 0, redemptions: 0 });
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(8);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [initialTab, setInitialTab] = useState("demeritos");
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const pendingCount = useLiveQuery(() => db.pendingEvents.count()) || 0;
  const localPendingEvents = useLiveQuery(() => db.pendingEvents.toArray()) || [];

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineData(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [localPendingEvents]);

  const syncOfflineData = async () => {
    if (!navigator.onLine || localPendingEvents.length === 0) return;
    setNotification({ message: `Sincronizando registros...`, type: 'success' });
    for (const event of localPendingEvents) {
      try {
        const { error } = await supabase.from('registros_eventos').insert({
          estudiante_id: event.estudiante_id, docente_id: event.docente_id,
          tipo: event.tipo, demerito_id: event.demerito_id, redencion_id: event.redencion_id,
          observaciones: event.observaciones, fecha: event.fecha
        });
        if (!error) await db.pendingEvents.delete(event.id!);
      } catch (e) { console.error(e); }
    }
    fetchDailyStats();
  };

  const syncStaticData = async () => {
    if (!navigator.onLine) return;
    try {
      const { data: dem } = await supabase.from('demeritos_catalogo').select('*');
      const { data: red } = await supabase.from('redenciones_catalogo').select('*');
      if (dem) await db.catalog.bulkPut(dem.map(i => ({ ...i, tipo: 'demerito' })));
      if (red) await db.catalog.bulkPut(red.map(i => ({ ...i, tipo: 'redencion' })));

      const teacherId = localStorage.getItem('teacher_id');
      if (teacherId) {
        const { data: gData } = await supabase.from('docentes_grupos').select('grupos(id, nombre)').eq('docente_id', teacherId);
        const groups = gData?.map((dg: any) => dg.grupos) || [];
        if (groups.length > 0) await db.groups.bulkPut(groups);
      }
    } catch (e) { console.error("Error syncing static data:", e); }
  };

  const loadTeacherGroups = async () => {
    let groups = [];
    if (isOnline) {
      const teacherId = localStorage.getItem('teacher_id');
      const { data } = await supabase.from('docentes_grupos').select('grupos(id, nombre)').eq('docente_id', teacherId);
      groups = data?.map((dg: any) => dg.grupos) || [];
    } else {
      groups = await db.groups.toArray();
    }
    
    setAssignedGroups(groups);
    if (groups.length > 0 && (!selectedGroupId || !groups.find((g: any) => g.id === selectedGroupId))) {
      setSelectedGroupId(groups[0].id);
    }
  };

  const fetchDailyStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const teacherId = localStorage.getItem('teacher_id');
    try {
      const { count: dCloud } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'demerito').eq('fecha', today).eq('docente_id', teacherId);
      const { count: rCloud } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'redencion').eq('fecha', today).eq('docente_id', teacherId);
      const dLocal = localPendingEvents.filter(e => e.tipo === 'demerito' && e.fecha === today).length;
      const rLocal = localPendingEvents.filter(e => e.tipo === 'redencion' && e.fecha === today).length;
      setDailyStats({ demerits: (dCloud || 0) + dLocal, redemptions: (rCloud || 0) + rLocal });
    } catch (error) { console.error(error); }
  };

  const fetchStudents = async () => {
    if (!selectedGroupId) return;
    setIsLoading(true);
    try {
      const from = (page - 1) * rowsPerPage;
      let result;
      if (isOnline) {
        if (search) {
          // @ts-ignore
          result = await supabase.rpc('buscar_estudiantes', { termino_busqueda: search.trim() }).select('*', { count: 'exact' } as any).eq('grupo_id', selectedGroupId).range(from, from + rowsPerPage - 1);
        } else {
          // @ts-ignore
          result = await supabase.from('estudiantes').select('*, grupos(nombre)', { count: 'exact' } as any).eq('grupo_id', selectedGroupId).order('nombre', { ascending: true }).range(from, from + rowsPerPage - 1);
        }
        if (result.data) {
          await db.students.bulkPut(result.data.map((s: any) => ({ id: s.id, nie: s.nie, nombre: s.nombre, grupo_id: s.grupo_id, grupo_nombre: s.grupos?.nombre })));
        }
      } else {
        const localData = await db.students.where('grupo_id').equals(selectedGroupId).filter(s => s.nombre.toLowerCase().includes(search.toLowerCase())).offset(from).limit(rowsPerPage).toArray();
        const localCount = await db.students.where('grupo_id').equals(selectedGroupId).count();
        result = { data: localData, count: localCount, error: null };
      }
      setStudents(result.data || []);
      setTotalStudents(result.count || 0);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { syncStaticData().then(() => loadTeacherGroups()); fetchDailyStats(); }, [isOnline]);
  useEffect(() => { if (selectedGroupId) { fetchStudents(); localStorage.setItem('teacher_group_id', selectedGroupId); } }, [page, search, selectedGroupId, isOnline]);

  return (
    <DashboardLayout role="docente">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#1e3b8a]">
                {isOnline ? <RefreshCw size={24} className="text-emerald-500" /> : <CloudOff size={24} className="text-red-500 animate-pulse" />}
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none mb-1">Mi Jornada</h1>
                <div className="flex items-center gap-2">
                  {isOnline ? <Badge color="success" variant="flat" size="sm" className="font-black text-[9px] uppercase px-2">Conectado</Badge> : <Badge color="danger" variant="flat" size="sm" className="font-black text-[9px] uppercase px-2 flex items-center gap-1"><CloudOff size={10}/> Modo Offline</Badge>}
                </div>
              </div>
            </div>
            {assignedGroups.length > 0 && (
              <Select label="Grupo actual" size="sm" variant="bordered" className="w-full md:max-w-[220px] bg-white shadow-sm" selectedKeys={new Set([selectedGroupId])} onSelectionChange={(keys) => setSelectedGroupId(Array.from(keys)[0] as string)} items={assignedGroups}>
                {(g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>}
              </Select>
            )}
          </div>

          {pendingCount > 0 && (
            <Card className="bg-orange-500 text-white border-none shadow-xl shadow-orange-500/20 animate-in slide-in-from-top-4 duration-500">
              <CardBody className="flex flex-row items-center justify-between p-5">
                <div className="flex items-center gap-4"><div className="p-3 bg-white/20 rounded-2xl animate-pulse"><CloudSync size={24} /></div><div><p className="font-black uppercase text-xs">Sincronización Pendiente</p><p className="text-sm opacity-90">{pendingCount} registros listos para subir.</p></div></div>
                {isOnline && <Button size="lg" className="bg-white text-orange-600 font-black uppercase text-[10px]" onClick={syncOfflineData}>Subir ahora</Button>}
              </CardBody>
            </Card>
          )}

          <Input isClearable fullWidth size="lg" placeholder="Nombre del alumno..." startContent={<Search className="text-slate-400" />} value={search} onValueChange={(v) => { setSearch(v); setPage(1); }} variant="bordered" className="bg-white rounded-2xl shadow-sm" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoading ? (<div className="col-span-full flex justify-center py-20"><Spinner size="lg" /></div>) : students.map((student) => {
              const hasPending = localPendingEvents.some(e => e.estudiante_id === student.id);
              return (
                <Card key={student.id} className={`border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-white overflow-hidden ${hasPending ? 'ring-2 ring-orange-400' : ''}`}>
                  <CardBody className="p-6">
                    <div className="flex items-start gap-4 mb-8">
                      <div className="size-14 rounded-2xl bg-[#1e3b8a] text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-900/20">{student.nombre.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><h3 className="font-black text-gray-900 uppercase leading-tight text-base break-words">{capitalizeName(student.nombre)}</h3>{hasPending && <Badge color="warning" variant="solid" size="sm" className="font-black text-[8px]">SYNC</Badge>}</div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-1">NIE: {student.nie}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button className="bg-red-50 text-red-600 font-black uppercase text-[10px] h-12 rounded-xl" onPress={() => { setSelectedStudent(student); setInitialTab('demeritos'); onOpen(); }}>Falta</Button>
                      <Button className="bg-emerald-50 text-emerald-600 font-black uppercase text-[10px] h-12 rounded-xl" onPress={() => { setSelectedStudent(student); setInitialTab('redenciones'); onOpen(); }}>Mérito</Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
          {totalStudents > rowsPerPage && (<div className="flex justify-center pt-10 border-t border-gray-100"><Pagination isCompact showControls color="primary" page={page} total={Math.ceil(totalStudents / rowsPerPage)} onChange={setPage} /></div>)}
        </div>
        
        <aside className="space-y-6">
          <Card className="bg-white p-8 rounded-[2.5rem] shadow-sm border-none"><h4 className="font-black text-gray-400 mb-8 flex items-center gap-2 uppercase text-[10px] tracking-[0.3em] border-b border-gray-50 pb-4"><Info size={16} /> Hoy en total</h4><div className="space-y-8"><div className="flex justify-between items-end border-b border-gray-50 pb-6"><div><p className="text-[10px] font-black text-red-400 uppercase mb-1">Faltas</p><p className="text-5xl font-black text-red-600 tracking-tighter">{dailyStats.demerits}</p></div><ShieldAlert size={40} className="text-red-50" /></div><div className="flex justify-between items-end"><div><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Méritos</p><p className="text-5xl font-black text-emerald-600 tracking-tighter">{dailyStats.redemptions}</p></div><BadgeCheck size={40} className="text-emerald-50" /></div></div></Card>
        </aside>
      </div>

      <EventModal isOpen={isOpen} onOpenChange={onOpenChange} studentId={selectedStudent?.id} studentName={selectedStudent?.nombre} initialTab={initialTab} onSuccess={() => { setNotification({ message: "Registro guardado", type: 'success' }); fetchDailyStats(); }} />
    </DashboardLayout>
  );
}
