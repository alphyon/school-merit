import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../components/Notification';
import DashboardLayout from '../layouts/DashboardLayout';
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
    try {
      const { data } = await supabase.from('docentes_grupos').select('grupos(id, nombre)').eq('docente_id', teacherId);
      const groups = data?.map((dg: any) => dg.grupos) || [];
      setAssignedGroups(groups);
      if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0].id);
    } catch (e) { console.error(e); }
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
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchTeacherGroups(); }, []);
  useEffect(() => { if (selectedGroupId) fetchData(); }, [selectedGroupId]);

  const handleExport = () => {
    const data = formatStudentDataForExport(students);
    const groupName = assignedGroups.find(g => g.id === selectedGroupId)?.nombre || 'Grupo';
    exportToExcel(data, `Reporte_${groupName}`);
    setNotification({ message: "Excel descargado", type: 'success' });
  };

  return (
    <DashboardLayout role="docente">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
            <BarChart className="text-[#1e3b8a]" size={32} /> Reportes de Grupo
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Análisis y descarga de resultados</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {assignedGroups.length > 1 && (
            <Select 
              label="Cambiar de Grupo" 
              size="sm" 
              variant="bordered" 
              className="w-full sm:w-48 bg-white" 
              selectedKeys={new Set([selectedGroupId])} 
              onSelectionChange={(keys) => setSelectedGroupId(Array.from(keys)[0] as string)}
              items={assignedGroups}
            >
              {(g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>}
            </Select>
          )}
          <Button 
            color="primary" 
            className="bg-[#1e3b8a] font-black uppercase text-[10px] tracking-widest h-12 shadow-lg shadow-blue-900/20 px-8" 
            startContent={<FileDown size={18} />} 
            onPress={handleExport} 
            isDisabled={students.length === 0}
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" color="primary" /></div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardBody className="flex flex-row items-center gap-5 p-6">
                <div className="p-4 bg-blue-50 rounded-[1.25rem] text-[#1e3b8a]"><Users size={24} /></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alumnos</p><p className="text-2xl font-black text-gray-900">{stats.totalStudents}</p></div>
              </CardBody>
            </Card>
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardBody className="flex flex-row items-center gap-5 p-6">
                <div className="p-4 bg-red-50 rounded-[1.25rem] text-red-600"><ShieldAlert size={24} /></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faltas Puestas</p><p className="text-2xl font-black text-gray-900">{stats.demerits}</p></div>
              </CardBody>
            </Card>
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardBody className="flex flex-row items-center gap-5 p-6">
                <div className="p-4 bg-emerald-50 rounded-[1.25rem] text-emerald-600"><BadgeCheck size={24} /></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Méritos Dados</p><p className="text-2xl font-black text-gray-900">{stats.redemptions}</p></div>
              </CardBody>
            </Card>
          </div>

          <Card className="bg-[#1e3b8a] text-white p-10 rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all duration-1000"></div>
            <CardBody className="text-center space-y-6 relative z-10">
              <h3 className="text-2xl font-black uppercase tracking-tight">Reporte Consolidado: {assignedGroups.find(g => g.id === selectedGroupId)?.nombre}</h3>
              <p className="text-blue-100 text-sm max-w-xl mx-auto font-medium">
                Descarga el documento oficial en formato Excel con el resumen acumulado de conductas de todos los estudiantes asignados a este grupo.
              </p>
              <div className="pt-4">
                <Button 
                  size="lg" 
                  className="bg-white text-[#1e3b8a] font-black uppercase tracking-widest px-12 h-14 shadow-xl hover:scale-105 active:scale-95 transition-all" 
                  onPress={handleExport}
                >
                  Descargar Reporte Ahora
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
