import { useState, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { supabase } from '../lib/supabase';
import { Notification } from '../components/Notification';
import { exportToExcel, formatStudentDataForExport } from '../utils/exportUtils';
import { Card, CardBody, Button, Spinner, Select, SelectItem } from "@heroui/react";
import { FileDown, Users, ShieldAlert, BadgeCheck, BarChart } from 'lucide-react';

export default function TeacherReports() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalStudents: 0, demerits: 0, redemptions: 0 });
  const [students, setStudents] = useState<any[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(localStorage.getItem('teacher_group_id') || "");
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchTeacherGroups = async () => {
    const teacherId = localStorage.getItem('teacher_id');
    if (!teacherId) return;
    const { data } = await supabase.from('docentes_grupos').select('grupos(id, nombre)').eq('docente_id', teacherId);
    const groups = data?.map((dg: any) => dg.grupos) || [];
    setAssignedGroups(groups);
    if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0].id);
  };

  const fetchData = async () => {
    if (!selectedGroupId) return;
    const teacherId = localStorage.getItem('teacher_id');
    setIsLoading(true);
    try {
      const { data: studentData } = await supabase.from('estudiantes_reporte').select('*').eq('grupo_id', selectedGroupId);
      const { data: events } = await supabase.from('registros_eventos').select('tipo').eq('docente_id', teacherId).in('estudiante_id', studentData?.map(s => s.id) || []);
      
      setStudents(studentData || []);
      setStats({
        totalStudents: studentData?.length || 0,
        demerits: events?.filter(e => e.tipo === 'demerito').length || 0,
        redemptions: events?.filter(e => e.tipo === 'redencion').length || 0
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTeacherGroups(); }, []);
  useEffect(() => { if (selectedGroupId) fetchData(); }, [selectedGroupId]);

  const handleExport = () => {
    const data = formatStudentDataForExport(students);
    const groupName = assignedGroups.find(g => g.id === selectedGroupId)?.nombre || 'Grupo';
    exportToExcel(data, `Reporte_${groupName}`);
    setNotification({ message: "Excel generado", type: 'success' });
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] text-slate-900 dark:text-slate-100 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <AppHeader role="docente" />
      <main className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div><h2 className="text-3xl font-black tracking-tight flex items-center gap-2"><BarChart className="text-[#1e3b8a]" size={32} /> Reportes</h2></div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {assignedGroups.length > 1 && (
              <Select label="Grupo" size="sm" variant="bordered" className="w-full md:w-48" selectedKeys={new Set([selectedGroupId])} onSelectionChange={(keys) => setSelectedGroupId(Array.from(keys)[0] as string)}>
                {assignedGroups.map((g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>)}
              </Select>
            )}
            <Button color="primary" className="bg-[#1e3b8a]" startContent={<FileDown size={18} />} onPress={handleExport} isDisabled={students.length === 0}>Excel</Button>
          </div>
        </div>
        {isLoading ? (<div className="flex justify-center py-20"><Spinner /></div>) : (
          <><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="border-none shadow-sm"><CardBody className="flex flex-row items-center gap-4 p-6"><div className="p-4 bg-blue-100 rounded-2xl text-[#1e3b8a]"><Users size={24} /></div><div><p className="text-xs font-black uppercase text-slate-400">Alumnos</p><p className="text-2xl font-black">{stats.totalStudents}</p></div></CardBody></Card>
            <Card className="border-none shadow-sm"><CardBody className="flex flex-row items-center gap-4 p-6"><div className="p-4 bg-red-100 rounded-2xl text-red-600"><ShieldAlert size={24} /></div><div><p className="text-xs font-black uppercase text-slate-400">Faltas</p><p className="text-2xl font-black">{stats.demerits}</p></div></CardBody></Card>
            <Card className="border-none shadow-sm"><CardBody className="flex flex-row items-center gap-4 p-6"><div className="p-4 bg-emerald-100 rounded-2xl text-emerald-600"><BadgeCheck size={24} /></div><div><p className="text-xs font-black uppercase text-slate-400">Méritos</p><p className="text-2xl font-black">{stats.redemptions}</p></div></CardBody></Card>
          </div>
          <Card className="bg-[#1e3b8a] text-white p-8 rounded-3xl"><CardBody className="text-center space-y-4"><h3 className="text-xl font-black uppercase">Reporte Detallado</h3><Button size="lg" className="bg-white text-[#1e3b8a] font-black uppercase" onPress={handleExport}>Descargar</Button></CardBody></Card></>
        )}
      </main>
    </div>
  );
}
