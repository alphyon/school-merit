import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../components/Notification';
import DashboardLayout from '../layouts/DashboardLayout';
import { useReactToPrint } from 'react-to-print';
import { Instrument002 } from '../components/reports/Instrument002';
import { Card, CardBody, Button, Spinner, Select, SelectItem } from "@heroui/react";
import { Printer, FileSpreadsheet } from 'lucide-react';

export default function TeacherReports() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalStudents: 0, demerits: 0, redemptions: 0 });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(localStorage.getItem('teacher_group_id') || "");
  const [teacherName, setTeacherName] = useState("");
  const [schoolConfig, setSchoolConfig] = useState({ 
    name: '', logo: '', codigoCe: '', departamento: '', municipio: '', distrito: ''
  });
  
  const [startMonth, setStartMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [endMonth, setEndMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: componentRef });

  const fetchData = async () => {
    if (!selectedGroupId) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('perfiles').select('teacher_id, full_name').eq('id', user.id).single();
      setTeacherName(profile?.full_name || "Docente");

      const { data: config } = await supabase.from('configuracion_sistema').select('*').single();
      if (config) setSchoolConfig({ 
        name: config.nombre_escuela || '', logo: config.logo_url || '',
        codigoCe: config.codigo_ce || '', departamento: config.departamento || '',
        municipio: config.municipio || '', distrito: config.distrito || ''
      });

      if (profile?.teacher_id) {
        const { data: groups } = await supabase.from('docentes_grupos').select('grupos(id, nombre, grado, seccion, turno)').eq('docente_id', profile.teacher_id);
        const groupList = groups?.map((dg: any) => dg.grupos).filter(Boolean) || [];
        setAssignedGroups(groupList);

        const { data: students } = await supabase.from('estudiantes').select('*').eq('grupo_id', selectedGroupId);
        const studentIds = students?.map(s => s.id) || [];

        const { data: events } = await supabase.from('registros_eventos').select(`
          tipo, fecha, estado, estudiante_id,
          demeritos_catalogo(codigo),
          redenciones_catalogo(codigo),
          reconocimientos_catalogo(codigo)
        `).in('estudiante_id', studentIds).gte('fecha', `${selectedYear}-01-01`).lte('fecha', `${selectedYear}-12-31`);
        
        const safeEvents = (events || []) as any[];

        setStats({
          totalStudents: students?.length || 0,
          demerits: safeEvents.filter(e => e.tipo === 'demerito').length,
          redemptions: safeEvents.filter(e => e.tipo === 'redencion').length
        });

        const start = parseInt(startMonth);
        const end = parseInt(endMonth);

        const grouped = [];
        for (let i = 1; i <= 11; i++) {
          const isInRange = i >= start && i <= end;
          if (!isInRange) {
            grouped.push({ monthIndex: i, matM: 0, matH: 0, matT: 0, demM: 0, demH: 0, demT: 0, demA: 0, demB: 0, demC: 0, demD: 0, demTotal: 0, redM: 0, redH: 0, redT: 0, redA: 0, redB: 0, redC: 0, redTotal: 0, recM: 0, recH: 0, recT: 0 });
            continue;
          }

          const monthEvents = safeEvents.filter(e => new Date(e.fecha).getMonth() + 1 === i);
          let demM=0, demH=0, demA=0, demB=0, demC=0, demD=0, redM=0, redH=0, redA=0, redB=0, redC=0, recM=0, recH=0;

          monthEvents.forEach(e => {
            const s = students?.find(st => st.id === e.estudiante_id);
            if (e.tipo === 'demerito') {
              if (s?.genero === 'M') demM++; else demH++;
              const c = e.demeritos_catalogo?.codigo;
              if (c === 'A') demA++; else if (c === 'B') demB++; else if (c === 'C') demC++; else if (c === 'D') demD++;
            } else if (e.tipo === 'redencion') {
              if (s?.genero === 'M') redM++; else redH++;
              const c = e.redenciones_catalogo?.codigo;
              if (c === 'A') redA++; else if (c === 'B') redB++; else if (c === 'C') redC++;
            } else if (e.tipo === 'reconocimiento') {
              if (s?.genero === 'M') recM++; else recH++;
            }
          });

          grouped.push({
            monthIndex: i, matM: students?.filter(s => s.genero === 'F').length || 0, matH: students?.filter(s => s.genero === 'M').length || 0, matT: students?.length || 0,
            demM, demH, demT: demM + demH, demA, demB, demC, demD, demTotal: demA + demB + demC + demD,
            redM, redH, redT: redM + redH, redA, redB, redC, redTotal: redA + redB + redC, recM, recH, recT: recM + recH
          });
        }
        setMonthlyData(grouped);
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedGroupId, selectedYear, startMonth, endMonth]);

  const activeGroup = assignedGroups.find(g => g.id === selectedGroupId);
  const months = [
    {key: "1", label: "Enero"}, {key: "2", label: "Febrero"}, {key: "3", label: "Marzo"}, {key: "4", label: "Abril"},
    {key: "5", label: "Mayo"}, {key: "6", label: "Junio"}, {key: "7", label: "Julio"}, {key: "8", label: "Agosto"},
    {key: "9", label: "Septiembre"}, {key: "10", label: "Octubre"}, {key: "11", label: "Noviembre"}
  ];

  return (
    <DashboardLayout role="docente">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-slate-900">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2"><FileSpreadsheet className="text-[#1e3b8a]" size={32} /> Reportes Docente</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 font-bold text-xs tracking-widest">Instrumento No. 002</p>
            {!navigator.onLine && (
              <span className="bg-red-100 text-red-700 px-3 py-0.5 rounded-full text-xs font-black border border-red-200">Offline - Consulta limitada</span>
            )}
          </div>
        </div>
        <Button 
          color="primary" 
          className="bg-[#1e3b8a] font-black text-xs h-12 shadow-lg px-8" 
          startContent={<Printer size={18} />} 
          onPress={() => handlePrint()}
          isDisabled={!navigator.onLine}
        >
          Imprimir Consolidado
        </Button>
      </div>

      {!navigator.onLine && (
        <Card className="mb-8 border-none shadow-sm bg-amber-50 text-amber-800">
          <CardBody className="p-4 flex flex-row items-center gap-4">
            <div className="bg-amber-100 p-2 rounded-full"><FileSpreadsheet size={20} /></div>
            <div>
              <p className="text-xs font-black">Modo Offline Detectado</p>
              <p className="text-xs font-bold">Los reportes requieren conexión para consultar datos históricos completos en la nube.</p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="mb-8 border-none shadow-sm bg-white">
        <CardBody className="p-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-64"><Select label="Grupo" variant="bordered" selectedKeys={selectedGroupId ? [selectedGroupId] : []} onSelectionChange={(keys) => setSelectedGroupId(Array.from(keys)[0] as string)} items={assignedGroups} classNames={{ trigger: "bg-gray-50 border-gray-200" }}>{(g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>}</Select></div>
          <div className="w-full md:w-40"><Select label="Desde" variant="bordered" selectedKeys={[startMonth]} onSelectionChange={(k) => setStartMonth(Array.from(k)[0] as string)} classNames={{ trigger: "bg-gray-50 border-gray-200" }}>{months.map((m) => <SelectItem key={m.key}>{m.label}</SelectItem>)}</Select></div>
          <div className="w-full md:w-40"><Select label="Hasta" variant="bordered" selectedKeys={[endMonth]} onSelectionChange={(k) => setEndMonth(Array.from(k)[0] as string)} classNames={{ trigger: "bg-gray-50 border-gray-200" }}>{months.map((m) => <SelectItem key={m.key}>{m.label}</SelectItem>)}</Select></div>
          <div className="w-full md:w-32"><Select label="Año" variant="bordered" selectedKeys={[selectedYear]} onSelectionChange={(k) => setSelectedYear(Array.from(k)[0] as string)} classNames={{ trigger: "bg-gray-50 border-gray-200" }}>{["2024", "2025", "2026"].map((y) => <SelectItem key={y}>{y}</SelectItem>)}</Select></div>
        </CardBody>
      </Card>

      {isLoading ? ( <div className="flex justify-center py-20"><Spinner size="lg" /></div> ) : (
        <div className="space-y-8 text-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="border-none shadow-sm bg-white p-6 flex flex-row items-center gap-4"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs">Matrícula</div><div><p className="text-2xl font-black">{stats.totalStudents}</p></div></Card>
             <Card className="border-none shadow-sm bg-white p-6 flex flex-row items-center gap-4"><div className="p-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs">Deméritos Anual</div><div><p className="text-2xl font-black">{stats.demerits}</p></div></Card>
          </div>
          <Card className="bg-white border-none shadow-sm overflow-hidden"><CardBody className="p-0 text-slate-900"><table className="w-full text-xs text-left"><thead className="bg-gray-50 font-bold text-gray-400 text-xs"><tr><th className="p-4">Mes</th><th className="p-4 text-center">Faltas</th><th className="p-4 text-center">Redenciones</th></tr></thead><tbody>{monthlyData.filter(m => m.monthIndex >= parseInt(startMonth) && m.monthIndex <= parseInt(endMonth)).map((m, i) => (<tr key={i} className="border-b border-gray-50"><td className="p-4 font-bold">{months[m.monthIndex-1].label}</td><td className="p-4 text-center text-red-600 font-bold">{m.demTotal}</td><td className="p-4 text-center text-emerald-600 font-bold">{m.redTotal}</td></tr>))}</tbody></table></CardBody></Card>
        </div>
      )}

      <div style={{ display: 'none' }}>
        <Instrument002 ref={componentRef} schoolName={schoolConfig.name} logoUrl={schoolConfig.logo} config={schoolConfig} teacherName={teacherName} groupName={activeGroup?.nombre || ""} shift={activeGroup?.turno || ""} period={`${months.find(m => m.key === startMonth)?.label} - ${months.find(m => m.key === endMonth)?.label} ${selectedYear}`} data={monthlyData} />
      </div>
    </DashboardLayout>
  );
}
