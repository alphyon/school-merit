import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { capitalizeName } from '../utils/formatUtils';
import { exportGroupsToExcel } from '../utils/exportUtils';
import { Card, CardBody, Button, Progress } from "@heroui/react";
import { 
  ShieldAlert, BadgeCheck, Users, Printer, History, BarChart3
} from 'lucide-react';
import { Notification } from '../components/Notification';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ demerits: 0, redemptions: 0, active: 0 });
  const [topGroups, setTopGroups] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const handleMonthlyReport = async () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: events, error } = await supabase
        .from('registros_eventos')
        .select(`
          tipo,
          estudiante_id,
          estudiantes (
            nie,
            nombre,
            responsable,
            dui_responsable,
            grupos (nombre)
          )
        `)
        .gte('fecha', firstDay)
        .lte('fecha', lastDay);

      if (error) throw error;
      if (!events || events.length === 0) {
        setNotification({ message: "Sin actividad este mes", type: 'error' });
        return;
      }

      const studentMap: { [key: string]: any } = {};
      events.forEach((event: any) => {
        const student = event.estudiantes;
        if (!student) return;
        const id = event.estudiante_id;
        if (!studentMap[id]) {
          studentMap[id] = {
            'NIE': student.nie,
            'Nombre Completo': student.nombre,
            'Grupo': student.grupos?.nombre || "SIN GRUPO",
            'Faltas Mes': 0,
            'Méritos Mes': 0,
            'Responsable': student.responsable || 'N/A'
          };
        }
        if (event.tipo === 'demerito') studentMap[id]['Faltas Mes']++;
        else studentMap[id]['Méritos Mes']++;
      });

      const grouped: { [key: string]: any[] } = {};
      Object.values(studentMap).forEach(student => {
        const groupName = student['Grupo'];
        if (!grouped[groupName]) grouped[groupName] = [];
        student['Balance'] = student['Méritos Mes'] - student['Faltas Mes'];
        grouped[groupName].push(student);
      });

      const monthName = now.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      exportGroupsToExcel(grouped, `Reporte_Mensual_${monthName}_${now.getFullYear()}`);
      setNotification({ message: `Reporte de ${monthName} generado`, type: 'success' });
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsExporting(false); }
  };

  const fetchData = async () => {
    try {
      const { count: demerits } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'demerito');
      const { count: redemptions } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'redencion');
      const { count: active } = await supabase.from('estudiantes').select('*', { count: 'exact', head: true });
      setStats({ demerits: demerits || 0, redemptions: redemptions || 0, active: active || 0 });

      const { data: recent } = await supabase.from('registros_eventos').select('*, estudiantes(nombre)').order('created_at', { ascending: false }).limit(5);
      setRecentActivity(recent || []);

      const { data: groupStats } = await supabase.from('demeritos_por_grupo').select('*').limit(5);
      setTopGroups(groupStats || []);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchData(); }, []);

  const maxDemerits = Math.max(...topGroups.map(g => g.total_demeritos), 1);

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Control</h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Resumen del Estado Escolar</p>
        </div>
        <Button 
          color="primary" 
          className="bg-[#1e3b8a] font-black uppercase text-xs h-14 px-10 shadow-xl shadow-blue-900/20" 
          startContent={<Printer size={20} />} 
          isLoading={isExporting} 
          onPress={handleMonthlyReport}
        >
          Reporte Mensual
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Faltas Totales', value: stats.demerits, icon: <ShieldAlert className="text-white" size={24} />, bg: 'from-red-500 to-red-600', color: 'text-red-600' },
          { label: 'Méritos Totales', value: stats.redemptions, icon: <BadgeCheck className="text-white" size={24} />, bg: 'from-emerald-500 to-emerald-600', color: 'text-emerald-600' },
          { label: 'Alumnos Activos', value: stats.active, icon: <Users className="text-white" size={24} />, bg: 'from-[#1e3b8a] to-blue-700', color: 'text-[#1e3b8a]' }
        ].map((metric, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:translate-y-[-4px] transition-all duration-300 bg-white">
            <CardBody className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">{metric.label}</p>
                  <h3 className={`text-4xl font-black text-gray-900 tracking-tighter`}>{metric.value.toLocaleString()}</h3>
                </div>
                <div className={`p-4 rounded-2xl shadow-lg bg-gradient-to-br ${metric.bg}`}>{metric.icon}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardBody className="p-8">
            <h3 className="text-lg font-black mb-8 flex items-center gap-3 uppercase tracking-tighter"><BarChart3 size={24} className="text-[#1e3b8a]" /> Incidencias por Grupo</h3>
            <div className="space-y-8">
              {topGroups.map((g, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="font-black uppercase text-gray-700">{g.grupo_nombre}</span>
                    <span className="font-black text-red-600">{g.total_demeritos} Faltas</span>
                  </div>
                  <Progress size="md" value={(g.total_demeritos / maxDemerits) * 100} color="danger" className="max-w-full" aria-label={g.grupo_nombre} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="border-none shadow-sm">
          <CardBody className="p-8">
            <h3 className="text-lg font-black mb-8 flex items-center gap-3 uppercase tracking-tighter"><History size={24} className="text-[#1e3b8a]" /> Actividad Reciente</h3>
            <div className="space-y-4">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors">
                  <div className={`size-12 rounded-2xl flex items-center justify-center font-black text-sm ${act.tipo === 'demerito' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {act.tipo === 'demerito' ? 'F' : 'M'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900 uppercase">{capitalizeName(act.estudiantes?.nombre || 'Estudiante')}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(act.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
