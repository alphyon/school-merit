import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AppHeader from '../components/AppHeader';
import AdminSidebar from '../components/AdminSidebar';
import { Notification } from '../components/Notification';
import { capitalizeName } from '../utils/formatUtils';
import { exportGroupsToExcel } from '../utils/exportUtils';
import { Card, CardBody, Button, Progress } from "@heroui/react";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  BadgeCheck, 
  Users, 
  Printer,
  History,
  BarChart3
} from 'lucide-react';

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
            'Deméritos del Mes': 0,
            'Redenciones del Mes': 0,
            'Responsable': student.responsable || 'N/A',
            'DUI Resp.': student.dui_responsable || 'N/A'
          };
        }
        if (event.tipo === 'demerito') studentMap[id]['Deméritos del Mes']++;
        else studentMap[id]['Redenciones del Mes']++;
      });

      const grouped: { [key: string]: any[] } = {};
      Object.values(studentMap).forEach(student => {
        const groupName = student['Grupo'];
        if (!grouped[groupName]) grouped[groupName] = [];
        student['Balance del Mes'] = student['Redenciones del Mes'] - student['Deméritos del Mes'];
        grouped[groupName].push(student);
      });

      const monthName = now.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      exportGroupsToExcel(grouped, `Reporte_Mensual_${monthName}_${now.getFullYear()}`);
      setNotification({ message: `Reporte generado`, type: 'success' });
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
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] text-slate-900 dark:text-slate-100 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <AppHeader role="admin" />
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-2"><LayoutDashboard className="text-[#1e3b8a]" size={32} /> Panel de Control</h2>
            <Button color="primary" className="bg-[#1e3b8a]" startContent={<Printer size={18} />} isLoading={isExporting} onPress={handleMonthlyReport}>Reporte</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { label: 'Deméritos', value: stats.demerits, icon: <ShieldAlert className="text-red-600" />, bg: 'bg-red-100', color: 'text-red-600' },
              { label: 'Redenciones', value: stats.redemptions, icon: <BadgeCheck className="text-blue-600" />, bg: 'bg-blue-100', color: 'text-blue-600' },
              { label: 'Alumnos', value: stats.active, icon: <Users className="text-emerald-600" />, bg: 'bg-emerald-100', color: 'text-emerald-600' }
            ].map((metric, idx) => (
              <Card key={idx} className="border-none shadow-sm overflow-hidden">
                <CardBody className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-slate-500 text-xs font-black uppercase mb-1">{metric.label}</p>
                      <h3 className={`text-4xl font-black ${metric.color}`}>{metric.value.toLocaleString()}</h3>
                    </div>
                    <div className={`p-4 ${metric.bg} dark:bg-opacity-20 rounded-2xl`}>{metric.icon}</div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm">
              <CardBody className="p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-[#1e3b8a]" /> Incidencias por Grupo</h3>
                <div className="space-y-6">
                  {topGroups.map((g, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-2"><span className="font-bold">{g.grupo_nombre}</span><span className="text-red-600 font-bold">{g.total_demeritos}</span></div>
                      <Progress size="md" value={(g.total_demeritos / maxDemerits) * 100} color="danger" className="max-w-full" />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="border-none shadow-sm">
              <CardBody className="p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><History size={20} className="text-[#1e3b8a]" /> Actividad Reciente</h3>
                <div className="space-y-4">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                      <div className={`size-10 rounded-full flex items-center justify-center font-bold text-xs ${act.tipo === 'demerito' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {act.tipo === 'demerito' ? 'D' : 'R'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold truncate">{capitalizeName(act.estudiantes?.nombre || 'Estudiante')}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{new Date(act.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
