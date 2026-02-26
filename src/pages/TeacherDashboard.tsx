import { useState, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import EventModal from '../components/EventModal';
import { Notification } from '../components/Notification';
import { capitalizeName } from '../utils/formatUtils';
import { Card, CardBody, Input, Button, useDisclosure, Pagination, Spinner, Select, SelectItem, Badge } from "@heroui/react";
import { Search, ShieldAlert, BadgeCheck, Info, Layers, CloudOff, CloudSync } from 'lucide-react';
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

  // Consultar eventos pendientes en local
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

    setNotification({ message: `Sincronizando ${pending.length} registros...`, type: 'success' });
    
    for (const event of pending) {
      try {
        const { error } = await supabase.from('registros_eventos').insert({
          estudiante_id: event.estudiante_id,
          docente_id: event.docente_id,
          tipo: event.tipo,
          demerito_id: event.demerito_id,
          redencion_id: event.redencion_id,
          observaciones: event.observaciones,
          fecha: event.fecha
        });
        if (!error) await db.pendingEvents.delete(event.id!);
      } catch (e) { console.error("Error sync:", e); }
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
          result = await supabase.rpc('buscar_estudiantes', { termino_busqueda: search.trim() }).select('*', { count: 'exact' }).eq('grupo_id', selectedGroupId).range(from, to);
        } else {
          // @ts-ignore
          result = await supabase.from('estudiantes').select('*, grupos(nombre)', { count: 'exact' }).eq('grupo_id', selectedGroupId).order('nombre', { ascending: true }).range(from, to);
        }
        if (!result.error) {
          const toCache = result.data.map((s: any) => ({
            id: s.id, nie: s.nie, nombre: s.nombre, grupo_id: s.grupo_id, grupo_nombre: s.grupos?.nombre
          }));
          await db.students.bulkPut(toCache);
        }
      } else {
        const localData = await db.students.where('grupo_id').equals(selectedGroupId)
          .filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()))
          .offset(from).limit(rowsPerPage).toArray();
        const localCount = await db.students.where('grupo_id').equals(selectedGroupId).count();
        result = { data: localData, count: localCount, error: null };
      }

      if (result.error) throw result.error;
      setStudents(result.data || []);
      setTotalStudents(result.count || 0);
    } catch (error: any) {
      console.error(error);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchTeacherData(); fetchDailyStats(); }, []);
  useEffect(() => { if (selectedGroupId) { fetchStudents(); localStorage.setItem('teacher_group_id', selectedGroupId); } }, [page, search, selectedGroupId, isOnline]);

  const handleOpenModal = (student: any, tab: string) => {
    setSelectedStudent(student);
    setInitialTab(tab);
    onOpen();
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] text-slate-900 dark:text-slate-100 min-h-screen font-['Lexend'] pb-20">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <AppHeader role="docente" />
      
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-[#1e3b8a] mb-2 uppercase tracking-tight">Gestión de Conducta</h2>
                <div className="flex items-center gap-2">
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">{assignedGroups.find(g => g.id === selectedGroupId)?.nombre || 'Docente'}</p>
                  {isOnline ? 
                    <Badge color="success" variant="flat" size="sm" className="font-black">Online</Badge> : 
                    <Badge color="danger" variant="flat" size="sm" className="font-black flex items-center gap-1"><CloudOff size={10}/> Offline</Badge>
                  }
                </div>
              </div>
            </div>
            
            {assignedGroups.length > 1 && (
              <div className="w-full md:w-64">
                <Select label="Grupo" size="sm" variant="flat" selectedKeys={new Set([selectedGroupId])} onSelectionChange={(keys) => setSelectedGroupId(Array.from(keys)[0] as string)} startContent={<Layers size={16} />} items={assignedGroups}>
                  {(item) => <SelectItem key={item.id}>{item.nombre}</SelectItem>}
                </Select>
              </div>
            )}
          </div>

          {pendingCount > 0 && (
            <Card className="bg-amber-50 border-amber-200 mb-6 border-none shadow-sm">
              <CardBody className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3 text-amber-700">
                  <CloudSync className="animate-spin-slow" />
                  <p className="text-sm font-bold">Tienes <strong>{pendingCount}</strong> registros pendientes.</p>
                </div>
                {isOnline && <Button size="sm" color="warning" variant="flat" className="font-black" onClick={syncOfflineData}>Subir</Button>}
              </CardBody>
            </Card>
          )}

          <div className="mb-6"><Input isClearable fullWidth size="lg" placeholder="Buscar..." startContent={<Search className="text-slate-400" />} value={search} onValueChange={(v) => { setSearch(v); setPage(1); }} variant="bordered" className="shadow-sm bg-white rounded-2xl" /></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-20"><Spinner size="lg" /></div>
            ) : students.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic font-bold">Sin alumnos cargados</div>
            ) : students.map((student) => (
              <Card key={student.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 overflow-hidden">
                <CardBody className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#1e3b8a]/10 flex items-center justify-center text-[#1e3b8a] font-black text-xl">{student.nombre.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-lg truncate uppercase">{capitalizeName(student.nombre)}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.grupo_nombre || student.grupos?.nombre}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-red-50 text-red-600 font-black uppercase text-[10px] h-12" startContent={<ShieldAlert size={16} />} onPress={() => handleOpenModal(student, 'demeritos')}>Falta</Button>
                    <Button className="flex-1 bg-emerald-50 text-emerald-600 font-black uppercase text-[10px] h-12" startContent={<BadgeCheck size={16} />} onPress={() => handleOpenModal(student, 'redenciones')}>Mérito</Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
          {totalStudents > rowsPerPage && (<div className="mt-10 flex justify-center border-t pt-6 border-slate-100"><Pagination isCompact showControls color="primary" page={page} total={Math.ceil(totalStudents / rowsPerPage)} onChange={setPage} /></div>)}
        </div>
        
        <aside className="w-full lg:w-80 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border-none">
            <h4 className="font-black text-[#1e3b8a] mb-6 flex items-center gap-2 uppercase text-xs tracking-widest border-b pb-4"><Info size={16} /> Resumen</h4>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-2xl flex justify-between items-center"><span className="text-xs font-black text-red-600 uppercase">Faltas</span><span className="text-2xl font-black text-red-600">{dailyStats.demerits}</span></div>
              <div className="p-4 bg-emerald-50 rounded-2xl flex justify-between items-center"><span className="text-xs font-black text-emerald-600 uppercase">Méritos</span><span className="text-2xl font-black text-emerald-600">{dailyStats.redemptions}</span></div>
            </div>
          </div>
        </aside>
      </main>
      
      <EventModal 
        isOpen={isOpen} onOpenChange={onOpenChange} studentId={selectedStudent?.id} studentName={selectedStudent?.nombre} initialTab={initialTab} 
        onSuccess={() => { setNotification({ message: "Éxito", type: 'success' }); fetchDailyStats(); }} 
      />
    </div>
  );
}
