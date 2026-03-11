import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { useReactToPrint } from 'react-to-print';
import { Instrument003 } from '../components/reports/Instrument003';
import { Instrument002 } from '../components/reports/Instrument002';
import { Card, CardBody, Button, Select, SelectItem, Spinner, Chip } from "@heroui/react";
import { Printer, FileText } from 'lucide-react';
import { Notification } from '../components/Notification';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ demerits: 0, redemptions: 0, active: 0, recognitions: 0 });
  const [consolidatedData, setConsolidatedData] = useState<any[]>([]);
  const [teacherReportData, setTeacherReportData] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [schoolConfig, setSchoolConfig] = useState({ name: '', logo: '', codigoCe: '', departamento: '', municipio: '', distrito: '' });
  
  const [dirStart, setDirStart] = useState<string>("1");
  const [dirEnd, setDirEnd] = useState<string>((new Date().getMonth() + 1).toString());
  const [dirYear, setDirYear] = useState<string>(new Date().getFullYear().toString());

  const [teachStart, setTeachStart] = useState<string>("1");
  const [teachEnd, setTeachEnd] = useState<string>((new Date().getMonth() + 1).toString());
  const [teachYear, setTeachYear] = useState<string>(new Date().getFullYear().toString());
  
  const [reportGroupId, setReportGroupId] = useState<string>("");
  const [assignedTeacherName, setAssignedTeacherName] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [isTeacherLoading, setIsTeacherLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const directorRef = useRef<HTMLDivElement>(null);
  const teacherRef = useRef<HTMLDivElement>(null);
  
  const printDirector = useReactToPrint({ contentRef: directorRef });
  const printTeacher = useReactToPrint({ contentRef: teacherRef });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: config } = await supabase.from('configuracion_sistema').select('*').single();
      if (config) setSchoolConfig({ name: config.nombre_escuela || '', logo: config.logo_url || '', codigoCe: config.codigo_ce || '', departamento: config.departamento || '', municipio: config.municipio || '', distrito: config.distrito || '' });

      const { data: groupsList } = await supabase.from('grupos').select('*').order('nombre');
      const safeGroups = groupsList || [];
      setGroups(safeGroups);

      const { count: active } = await supabase.from('estudiantes_reporte').select('*', { count: 'exact', head: true });
      const { count: demerits } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'demerito').eq('estado', 'activo');
      const { count: recognitions } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'reconocimiento');
      setStats({ demerits: demerits || 0, redemptions: 0, active: active || 0, recognitions: recognitions || 0 });

      await fetchDirectorData(safeGroups);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchDirectorData = async (currentGroups: any[]) => {
    const lastDay = new Date(parseInt(dirYear), parseInt(dirEnd), 0).getDate();
    const start = `${dirYear}-${dirStart.padStart(2, '0')}-01`;
    const end = `${dirYear}-${dirEnd.padStart(2, '0')}-${lastDay}`;
    
    const { data: students } = await supabase.from('estudiantes_reporte').select('id, genero, grupo_id, grupo_nombre');
    const { data: events } = await supabase.from('registros_eventos').select(`tipo, estado, estudiante_id, fecha, demeritos_catalogo(codigo), redenciones_catalogo(codigo), reconocimientos_catalogo(codigo)`).gte('fecha', start).lte('fecha', end);

    const map: any = {};
    students?.forEach((s: any) => {
      const gName = s.grupo_nombre || 'SIN GRUPO';
      if (!map[gName]) {
        const gInfo = currentGroups.find(gr => gr.id === s.grupo_id) || {};
        map[gName] = { groupName: gName, grado: gInfo.grado || '-', seccion: gInfo.seccion || '-', turno: gInfo.turno || '-', matM: 0, matH: 0, matT: 0, demM: 0, demH: 0, demT: 0, demA: 0, demB: 0, demC: 0, demD: 0, demTotal: 0, redM: 0, redH: 0, redT: 0, redA: 0, redB: 0, redC: 0, redTotal: 0, recM: 0, recH: 0, recT: 0 };
      }
      if (s.genero === 'F') map[gName].matM++; else map[gName].matH++;
      map[gName].matT++;
    });

    events?.forEach((ev: any) => {
      const s = students?.find((st: any) => st.id === ev.estudiante_id);
      const g = map[s?.grupo_nombre || 'SIN GRUPO'];
      if (!g) return;

      if (ev.tipo === 'demerito') {
        if (s?.genero === 'F') g.demM++; else g.demH++;
        const code = (ev.demeritos_catalogo as any)?.codigo;
        if (code === 'A') g.demA++; else if (code === 'B') g.demB++; else if (code === 'C') g.demC++; else if (code === 'D') g.demD++;
        g.demTotal = g.demA + g.demB + g.demC + g.demD;
      } else if (ev.tipo === 'redencion') {
        if (s?.genero === 'F') g.redM++; else g.redH++;
        const code = (ev.redenciones_catalogo as any)?.codigo;
        if (code === 'A') g.redA++; else if (code === 'B') g.redB++; else if (code === 'C') g.redC++;
        g.redTotal = g.redA + g.redB + g.redC;
      } else if (ev.tipo === 'reconocimiento') {
        if (s?.genero === 'F') g.recM++; else g.recH++;
        g.recT = g.recM + g.recH;
      }
    });
    setConsolidatedData(Object.values(map).sort((a: any, b: any) => a.groupName.localeCompare(b.groupName)));
  };

  const fetchTeacherData = async (groupId: string) => {
    setIsTeacherLoading(true);
    setTeacherReportData([]);
    try {
      const { data: rels } = await supabase.from('docentes_grupos').select('docentes(nombre)').eq('grupo_id', groupId);
      setAssignedTeacherName(rels && rels.length > 0 ? (rels[0] as any).docentes?.nombre : "DOCENTE NO ASIGNADO");

      const { data: students } = await supabase.from('estudiantes_reporte').select('*').eq('grupo_id', groupId);
      if (!students || students.length === 0) {
        setTeacherReportData(Array.from({length: 11}, (_, i) => ({ monthIndex: i + 1, matM: 0, matH: 0, matT: 0, demM: 0, demH: 0, demT: 0, demA: 0, demB: 0, demC: 0, demD: 0, demTotal: 0, redM: 0, redH: 0, redT: 0, redA: 0, redB: 0, redC: 0, redTotal: 0, recM: 0, recH: 0, recT: 0 })));
        setIsTeacherLoading(false);
        return;
      }

      const ids = students.map(s => s.id);
      const { data: events } = await supabase.from('registros_eventos').select(`tipo, fecha, demeritos_catalogo(codigo), redenciones_catalogo(codigo), reconocimientos_catalogo(codigo), estudiante_id`).in('estudiante_id', ids).gte('fecha', `${teachYear}-01-01`).lte('fecha', `${teachYear}-12-31`);
      
      const start = parseInt(teachStart);
      const end = parseInt(teachEnd);

      const monthsData = [];
      for (let i = 1; i <= 11; i++) {
        const isInRange = i >= start && i <= end;
        if (!isInRange) {
          monthsData.push({ monthIndex: i, matM: 0, matH: 0, matT: 0, demM: 0, demH: 0, demT: 0, demA: 0, demB: 0, demC: 0, demD: 0, demTotal: 0, redM: 0, redH: 0, redT: 0, redA: 0, redB: 0, redC: 0, redTotal: 0, recM: 0, recH: 0, recT: 0 });
          continue;
        }

        const mEvents = (events || []).filter(e => new Date(e.fecha).getUTCMonth() + 1 === i);
        let dM=0, dH=0, dA=0, dB=0, dC=0, dD=0, rM=0, rH=0, rA=0, rB=0, rC=0, recM=0, recH=0;
        mEvents.forEach((e: any) => {
          const s = students.find(st => st.id === e.estudiante_id);
          if (e.tipo === 'demerito') { if (s?.genero === 'F') dM++; else dH++; const c = (e.demeritos_catalogo as any)?.codigo; if (c==='A') dA++; else if (c==='B') dB++; else if (c==='C') dC++; else if (c==='D') dD++; }
          else if (e.tipo === 'redencion') { if (s?.genero === 'F') rM++; else rH++; const c = (e.redenciones_catalogo as any)?.codigo; if (c==='A') rA++; else if (c==='B') rB++; else if (c==='C') rC++; }
          else if (e.tipo === 'reconocimiento') { if (s?.genero === 'F') recM++; else recH++; }
        });
        monthsData.push({ monthIndex: i, matM: students.filter(s => s.genero === 'F').length, matH: students.filter(s => s.genero === 'M').length, matT: students.length, demM: dM, demH: dH, demT: dM+dH, demA: dA, demB: dB, demC: dC, demD: dD, demTotal: dA+dB+dC+dD, redM: rM, redH: rH, redT: rM+rH, redA: rA, redB: rB, redC: rC, redTotal: rA+rB+rC, recM, recH, recT: recM+recH });
      }
      setTeacherReportData(monthsData);
    } catch (e) { console.error(e); } finally { setIsTeacherLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dirStart, dirEnd, dirYear]);
  useEffect(() => { if (reportGroupId) fetchTeacherData(reportGroupId); }, [reportGroupId, teachStart, teachEnd, teachYear]);

  const monthsList = [
    {key: "1", label: "Ene"}, {key: "2", label: "Feb"}, {key: "3", label: "Mar"}, {key: "4", label: "Abr"},
    {key: "5", label: "May"}, {key: "6", label: "Jun"}, {key: "7", label: "Jul"}, {key: "8", label: "Ago"},
    {key: "9", label: "Sep"}, {key: "10", label: "Oct"}, {key: "11", label: "Nov"}
  ];

  const getPeriodText = (s: string, e: string, y: string) => {
    const sL = monthsList.find(m => m.key === s)?.label;
    const eL = monthsList.find(m => m.key === e)?.label;
    return s === e ? `${sL} ${y}` : `${sL} - ${eL} ${y}`;
  };

  if (loading && consolidatedData.length === 0) return <DashboardLayout role="admin"><div className="h-[80vh] flex items-center justify-center"><Spinner /></div></DashboardLayout>;

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-slate-900">
        <div><h1 className="text-3xl font-black tracking-tight">Panel Administrativo</h1><p className="text-gray-500 font-bold text-xs tracking-widest mt-1">Gestión Institucional</p></div>
        <div className="flex gap-2 items-center bg-white p-2 rounded-xl shadow-sm border border-gray-50">
          <Select aria-label="Mes inicio" size="sm" className="w-24" selectedKeys={[dirStart]} onSelectionChange={(k) => setDirStart(Array.from(k)[0] as string)}>{monthsList.map((m) => <SelectItem key={m.key}>{m.label}</SelectItem>)}</Select>
          <Select aria-label="Mes fin" size="sm" className="w-24" selectedKeys={[dirEnd]} onSelectionChange={(k) => setDirEnd(Array.from(k)[0] as string)}>{monthsList.map((m) => <SelectItem key={m.key}>{m.label}</SelectItem>)}</Select>
          <Select aria-label="Año" size="sm" className="w-24" selectedKeys={[dirYear]} onSelectionChange={(k) => setDirYear(Array.from(k)[0] as string)}>{["2024", "2025", "2026"].map((y) => <SelectItem key={y}>{y}</SelectItem>)}</Select>
          <Button isIconOnly color="primary" aria-label="Imprimir reporte director" className="bg-[#1e3b8a]" onPress={() => printDirector()}><Printer size={18} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-slate-900">
        <Card className="border-none shadow-sm bg-red-500 text-white"><CardBody className="p-4 text-center"><p className="text-xs font-black text-red-100">Deméritos Activos</p><h3 className="text-2xl font-black">{stats.demerits}</h3></CardBody></Card>
        <Card className="border-none shadow-sm bg-purple-600 text-white"><CardBody className="p-4 text-center"><p className="text-xs font-black text-purple-100">Reconocimientos</p><h3 className="text-2xl font-black">{stats.recognitions}</h3></CardBody></Card>
        <Card className="border-none shadow-sm bg-[#1e3b8a] text-white"><CardBody className="p-4 text-center"><p className="text-xs font-black text-blue-200">Matrícula Activa</p><h3 className="text-2xl font-black">{stats.active}</h3></CardBody></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900">
        <div className="lg:col-span-2">
           <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
             <div className="p-6 border-b flex justify-between items-center"><h3 className="text-lg font-black text-[#1e3b8a]">Consolidado (003)</h3><Chip size="sm" variant="flat" color="primary" className="font-bold">{getPeriodText(dirStart, dirEnd, dirYear)}</Chip></div>
             <CardBody className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left"><thead className="bg-gray-50/50 font-bold text-gray-400 text-xs"><tr><th className="p-4 text-[#1e3b8a]">Sección</th><th className="p-4 text-center">Matrícula</th><th className="p-4 text-center text-red-600">Deméritos</th><th className="p-4 text-center text-emerald-600">Redenciones</th><th className="p-4 text-center text-purple-600">Reconocimientos</th></tr></thead><tbody>{consolidatedData.map((d, i) => (<tr key={i} className="hover:bg-gray-50/50 transition-colors border-b last:border-none border-gray-50"><td className="p-4 font-black text-[#1e3b8a]">{d.groupName}</td><td className="p-4 text-center font-bold text-gray-500">{d.matT}</td><td className="p-4 text-center font-black text-red-600">{d.demTotal}</td><td className="p-4 text-center font-black text-emerald-600">{d.redTotal}</td><td className="p-4 text-center font-black text-purple-600">{d.recT}</td></tr>))}</tbody></table>
             </CardBody>
           </Card>
        </div>

        <div>
          <Card className="border-none shadow-sm bg-[#1e3b8a] text-white h-full">
            <CardBody className="p-8 space-y-6">
              <h3 className="text-lg font-black flex items-center gap-2"><FileText size={24} /> Reporte Grado</h3>
              <div className="grid grid-cols-2 gap-2">
                <Select aria-label="Mes inicio" label="Desde" variant="faded" classNames={{ trigger: "text-white" }} selectedKeys={[teachStart]} onSelectionChange={(k) => setTeachStart(Array.from(k)[0] as string)}>{monthsList.map((m) => <SelectItem key={m.key}>{m.label}</SelectItem>)}</Select>
                <Select aria-label="Mes fin" label="Hasta" variant="faded" classNames={{ trigger: "text-white" }} selectedKeys={[teachEnd]} onSelectionChange={(k) => setTeachEnd(Array.from(k)[0] as string)}>{monthsList.map((m) => <SelectItem key={m.key}>{m.label}</SelectItem>)}</Select>
              </div>
              <Select aria-label="Año" label="Año" variant="faded" classNames={{ trigger: "text-white" }} selectedKeys={[teachYear]} onSelectionChange={(k) => setTeachYear(Array.from(k)[0] as string)}>{["2024", "2025", "2026"].map((y) => <SelectItem key={y}>{y}</SelectItem>)}</Select>
              <Select aria-label="Grupo" label="Grupo" variant="faded" classNames={{ trigger: "text-white" }} selectedKeys={reportGroupId ? [reportGroupId] : []} onSelectionChange={(k) => setReportGroupId(Array.from(k)[0] as string)}>{groups.map((g) => <SelectItem key={g.id} textValue={g.nombre}>{g.nombre}</SelectItem>)}</Select>
              {reportGroupId && (<div className="bg-white/10 p-4 rounded-xl border border-white/20"><p className="text-xs font-black text-blue-300">Docente:</p><p className="text-sm font-bold">{assignedTeacherName}</p></div>)}
              <Button className="w-full bg-white text-[#1e3b8a] font-black h-12 shadow-lg" startContent={isTeacherLoading ? <Spinner size="sm" /> : <Printer size={18} />} isDisabled={!reportGroupId || isTeacherLoading || assignedTeacherName === "DOCENTE NO ASIGNADO"} onPress={() => printTeacher()}>Imprimir 002</Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <Instrument003 ref={directorRef} schoolName={schoolConfig.name} logoUrl={schoolConfig.logo} config={schoolConfig} period={getPeriodText(dirStart, dirEnd, dirYear)} data={consolidatedData} />
        <Instrument002 ref={teacherRef} schoolName={schoolConfig.name} logoUrl={schoolConfig.logo} config={schoolConfig} teacherName={assignedTeacherName} groupName={groups.find(g => g.id === reportGroupId)?.nombre || ""} shift={groups.find(g => g.id === reportGroupId)?.turno || ""} period={getPeriodText(teachStart, teachEnd, teachYear)} data={teacherReportData} />
      </div>
    </DashboardLayout>
  );
}
