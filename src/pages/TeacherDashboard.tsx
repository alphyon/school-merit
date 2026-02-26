import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import EventModal from '../components/EventModal';
import { Notification } from '../components/Notification';
import { capitalizeName } from '../utils/formatUtils';
import { Card, CardBody, Input, Button, useDisclosure, Pagination, Spinner, Select, SelectItem, Badge } from "@heroui/react";
import { Search, ShieldAlert, BadgeCheck, Info, CloudOff, CloudSync } from 'lucide-react';
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

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineData(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = async () => {
    const pending = await db.pendingEvents.where('sync_status').equals('pending').toArray();
    if (pending.length === 0) return;
    setNotification({ message: `Sincronizando registros...`, type: 'success' });
    for (const event of pending) {
      try {
        await supabase.from('registros_eventos').insert({
          estudiante_id: event.estudiante_id, docente_id: event.docente_id,
          tipo: event.tipo, demerito_id: event.demerito_id, redencion_id: event.redencion_id,
          observaciones: event.observaciones, fecha: event.fecha
        });
        await db.pendingEvents.delete(event.id!);
      } catch (e) { console.error(e); }
    }
    fetchDailyStats();
  };

  const fetchTeacherData = async () => {
    const teacherId = localStorage.getItem('teacher_id');
    if (!teacherId) return;
    try {
      const { data: groupsData } = await supabase.from('docentes_grupos').select('grupo_id, grupos(id, nombre)').eq('docente_id', teacherId);
      const groups = groupsData?.map((dg: any) => dg.grupos) || [];
      setAssignedGroups(groups);
      if (groups.length > 0 && (!selectedGroupId || !groups.find((g: any) => g.id === selectedGroupId))) {
        setSelectedGroupId(groups[0].id);
      }
    } catch (error) { console.error(error); }
  };

  const fetchDailyStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const teacherId = localStorage.getItem('teacher_id');
    const { count: demerits } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'demerito').eq('fecha', today).eq('docente_id', teacherId);
    const { count: redemptions } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'redencion').eq('fecha', today).eq('docente_id', teacherId);
    setDailyStats({ demerits: demerits || 0, redemptions: redemptions || 0 });
  };

  const fetchStudents = async () => {
    if (!selectedGroupId) return;
    setIsLoading(true);
    try {
      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;
      let result;
      if (isOnline) {
        if (search) {
          // @ts-ignore
          result = await supabase.rpc('buscar_estudiantes', { termino_busqueda: search.trim() }).select('*', { count: 'exact' } as any).eq('grupo_id', selectedGroupId).range(from, to);
        } else {
          // @ts-ignore
          result = await supabase.from('estudiantes').select('*, grupos(nombre)', { count: 'exact' } as any).eq('grupo_id', selectedGroupId).order('nombre', { ascending: true }).range(from, to);
        }
        if (!result.error) {
          const toCache = result.data.map((s: any) => ({ id: s.id, nie: s.nie, nombre: s.nombre, grupo_id: s.grupo_id, grupo_nombre: s.grupos?.nombre }));
          await db.students.bulkPut(toCache);
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

  useEffect(() => { fetchTeacherData(); fetchDailyStats(); }, []);
  useEffect(() => { if (selectedGroupId) { fetchStudents(); localStorage.setItem('teacher_group_id', selectedGroupId); } }, [page, search, selectedGroupId, isOnline]);

  return (
    <DashboardLayout role="docente">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1 uppercase">Control Conductual</h1>
              <div className="flex items-center gap-2">
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{assignedGroups.find(g => g.id === selectedGroupId)?.nombre || 'Seleccione grupo'}</p>
                {!isOnline && <Badge color="danger" variant="flat" size="sm" className="font-black text-[9px] uppercase"><CloudOff size={10} className="mr-1"/> Offline</Badge>}
              </div>
            </div>
            {assignedGroups.length > 1 && (
              <Select label="Grupo Activo" size="sm" variant="bordered" className="w-full md:max-w-[240px] bg-white" selectedKeys={new Set([selectedGroupId])} onSelectionChange={(keys) => setSelectedGroupId(Array.from(keys)[0] as string)} items={assignedGroups}>
                {(g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>}
              </Select>
            )}
          </div>

          {pendingCount > 0 && (
            <Card className="bg-orange-500 text-white border-none shadow-lg shadow-orange-500/20"><CardBody className="flex flex-row items-center justify-between p-5"><div className="flex items-center gap-3 font-bold text-sm"><CloudSync className="animate-spin-slow" /> {pendingCount} incidencias pendientes de sincronizar.</div>{isOnline && <Button size="sm" className="bg-white text-orange-600 font-black" onClick={syncOfflineData}>Subir ahora</Button>}</CardBody></Card>
          )}

          <Input isClearable fullWidth size="lg" placeholder="Escriba el nombre o NIE del alumno..." startContent={<Search className="text-slate-400" />} value={search} onValueChange={(v) => { setSearch(v); setPage(1); }} variant="bordered" className="bg-white rounded-2xl shadow-sm" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-20"><Spinner size="lg" /></div>
            ) : students.length === 0 ? (
              <div className="col-span-full text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-widest text-xs">Sin alumnos en este grupo</div>
            ) : students.map((student) => (
              <Card key={student.id} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-white group overflow-hidden">
                <CardBody className="p-6">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="size-14 rounded-[1.25rem] bg-[#1e3b8a] text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-900/20 group-hover:scale-110 transition-transform">{student.nombre.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 uppercase leading-tight text-lg mb-1 break-words">{capitalizeName(student.nombre)}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIE: {student.nie}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button className="bg-red-50 text-red-600 font-black uppercase text-[10px] h-12 rounded-xl" onPress={() => { setSelectedStudent(student); setInitialTab('demeritos'); onOpen(); }}>Registrar Falta</Button>
                    <Button className="bg-emerald-50 text-emerald-600 font-black uppercase text-[10px] h-12 rounded-xl" onPress={() => { setSelectedStudent(student); setInitialTab('redenciones'); onOpen(); }}>Dar Mérito</Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="flex justify-center pt-10">
            <Pagination isCompact showControls color="primary" page={page} total={Math.ceil(totalStudents / rowsPerPage)} onChange={setPage} classNames={{ cursor: "bg-[#1e3b8a] font-bold" }} />
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="bg-white p-8 rounded-[2rem] shadow-sm border-none">
            <h4 className="font-black text-gray-400 mb-8 flex items-center gap-2 uppercase text-[10px] tracking-[0.3em] border-b border-gray-50 pb-4"><Info size={16} /> Resumen Diario</h4>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-gray-50 pb-4">
                <div><p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Faltas</p><p className="text-4xl font-black text-red-600">{dailyStats.demerits}</p></div>
                <ShieldAlert size={32} className="text-red-100 mb-1" />
              </div>
              <div className="flex justify-between items-end border-b border-gray-50 pb-4">
                <div><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Méritos</p><p className="text-4xl font-black text-emerald-600">{dailyStats.redemptions}</p></div>
                <BadgeCheck size={32} className="text-emerald-100 mb-1" />
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <EventModal isOpen={isOpen} onOpenChange={onOpenChange} studentId={selectedStudent?.id} studentName={selectedStudent?.nombre} initialTab={initialTab} onSuccess={() => { setNotification({ message: "Registro guardado", type: 'success' }); fetchDailyStats(); }} />
    </DashboardLayout>
  );
}
