import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { useReactToPrint } from 'react-to-print';
import { Instrument001 } from '../components/reports/Instrument001';
import { Notification } from '../components/Notification';
import EventModal from '../components/EventModal';
import { Card, CardBody, Avatar, Button, Spinner, Pagination, Chip, Tabs, Tab, Select, SelectItem } from "@heroui/react";
import { 
  Printer, ArrowLeft, BadgeCheck, ShieldAlert, Award, History
} from 'lucide-react';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef<HTMLDivElement>(null);
  
  const [student, setStudent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'docente'>('docente');
  const [schoolConfig, setSchoolConfig] = useState({ name: '', logo: '', codigoCe: '', departamento: '', municipio: '', distrito: '' });
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [stats, setStats] = useState({ balance: 0, historico: 0, limpiados: 0 });
  const [activeTab, setActiveTab] = useState("active");

  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("demerito");
  const [preselectedDemeritId, setPreselectedDemeritId] = useState<string | undefined>(undefined);

  const handlePrint = useReactToPrint({ contentRef: componentRef });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: config } = await supabase.from('configuracion_sistema').select('*').single();
      if (config) setSchoolConfig({ name: config.nombre_escuela, logo: config.logo_url, codigoCe: config.codigo_ce || '', departamento: config.departamento || '', municipio: config.municipio || '', distrito: config.distrito || '' });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('perfiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || 'docente');
      }

      const { data: studentData, error: sError } = await supabase.from('estudiantes_reporte').select('*').eq('id', id).single();
      if (sError) throw sError;
      setStudent(studentData);
      setStats({ 
        balance: studentData.balance_puntos || 0, 
        historico: studentData.total_historico_faltas || 0,
        limpiados: studentData.puntos_limpiados || 0
      });

      const { data: fullData } = await supabase.from('registros_eventos').select(`
        *, demeritos_catalogo(codigo, descripcion), redenciones_catalogo(codigo, descripcion), reconocimientos_catalogo(codigo, descripcion), docentes(nombre)
      `).eq('estudiante_id', id).order('fecha', { ascending: true });
      
      setAllHistory((fullData || []).map(ev => ({
        ...ev,
        code: ev.demeritos_catalogo?.codigo || ev.redenciones_catalogo?.codigo || ev.reconocimientos_catalogo?.codigo || '?',
        loggedBy: ev.docentes?.nombre || 'SISTEMA'
      })));

      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;
      let query = supabase.from('registros_eventos').select(`
        *,
        demeritos_catalogo(codigo, descripcion, puntos_valor),
        redenciones_catalogo(codigo, descripcion, puntos_valor),
        reconocimientos_catalogo(codigo, descripcion),
        docentes(nombre),
        referencia:evento_referencia_id(id, demeritos_catalogo(codigo, descripcion))
      `, { count: 'exact' }).eq('estudiante_id', id);
      
      if (activeTab === 'active') query = query.eq('tipo', 'demerito').eq('estado', 'activo');
      else if (activeTab === 'redeemed') query = query.eq('tipo', 'redencion');
      else if (activeTab === 'recognition') query = query.eq('tipo', 'reconocimiento');

      if (selectedMonth !== 'all') {
        const start = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
        const end = `${selectedYear}-${selectedMonth.padStart(2, '0')}-31`;
        query = query.gte('fecha', start).lte('fecha', end);
      }

      const { data: eventsData, count } = await query.order('fecha', { ascending: false }).range(from, to);
      
      setTotalEventsCount(count || 0);
      setEvents((eventsData || []).map(ev => {
        const catalog = ev.demeritos_catalogo || ev.reconocimientos_catalogo || ev.redenciones_catalogo;
        const refData = Array.isArray(ev.referencia) ? ev.referencia[0] : ev.referencia;
        return {
          ...ev,
          code: catalog?.codigo || '?',
          title: catalog?.descripcion || 'Sin descripción',
          pointsValue: catalog?.puntos_valor || 0,
          refInfo: refData ? `${refData.demeritos_catalogo?.codigo}: ${refData.demeritos_catalogo?.descripcion}` : null
        };
      }));

    } catch (error: any) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (id) fetchData(); }, [id, page, activeTab, selectedMonth, selectedYear]);

  const handleOpenAction = (tab: string, demeritId?: string) => {
    setModalTab(tab);
    setPreselectedDemeritId(demeritId);
    setIsModalOpen(true);
  };

  const months = [
    {key: "all", label: "Todo el Año"}, {key: "1", label: "Enero"}, {key: "2", label: "Febrero"}, {key: "3", label: "Marzo"}, {key: "4", label: "Abril"},
    {key: "5", label: "Mayo"}, {key: "6", label: "Junio"}, {key: "7", label: "Julio"}, {key: "8", label: "Agosto"},
    {key: "9", label: "Septiembre"}, {key: "10", label: "Octubre"}, {key: "11", label: "Noviembre"}, {key: "12", label: "Diciembre"}
  ];

  return (
    <DashboardLayout role={userRole}>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex justify-between items-center mb-8">
        <Button variant="flat" size="sm" className="font-bold text-gray-500 bg-white" startContent={<ArrowLeft size={18} />} onPress={() => navigate(-1)}>Volver</Button>
        <div className="flex gap-2">
          <Button size="sm" color="danger" variant="flat" className="font-black uppercase text-[10px]" onPress={() => handleOpenAction('demerito')}>Falta</Button>
          <Button size="sm" color="success" variant="flat" className="font-black uppercase text-[10px]" onPress={() => handleOpenAction('redencion')}>Redención</Button>
          <Button size="sm" color="secondary" variant="flat" className="font-black uppercase text-[10px]" onPress={() => handleOpenAction('reconocimiento')}>Premio</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Spinner label="Cargando expediente..." /></div>
      ) : (
        <div className="max-w-5xl mx-auto text-slate-900">
          <Card className="border-none shadow-sm mb-8 bg-white overflow-hidden">
            <CardBody className="p-8 lg:p-10">
              <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                <Avatar className="h-24 w-24 border-4 border-gray-50 shadow-lg" name={student?.nombre} />
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-black uppercase tracking-tighter mb-1">{student?.nombre}</h1>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">NIE: {student?.nie} | {student?.grupo_nombre}</p>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Responsable</span>
                      <span className="text-xs font-bold text-slate-700 uppercase">{student?.responsable || 'NO REGISTRADO'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">DUI</span>
                      <span className="text-xs font-bold text-slate-700">{student?.dui_responsable || '---'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Contacto</span>
                      <span className="text-xs font-bold text-[#1e3b8a]">{student?.telefono_responsable || 'SIN TELÉFONO'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    {stats.balance >= 15 && <Chip color="danger" variant="solid" className="font-black animate-pulse text-[10px]">NO PROMOCIÓN</Chip>}
                    {stats.balance >= 10 && stats.balance < 15 && <Chip color="warning" variant="solid" className="font-black text-[10px]">SUSPENSIÓN</Chip>}
                    {stats.balance >= 6 && stats.balance < 10 && <Chip color="warning" variant="flat" className="font-black text-[10px]">AVISO FAMILIA</Chip>}
                    {stats.balance >= 3 && stats.balance < 6 && <Chip color="primary" variant="flat" className="font-black text-[10px]">ADVERTENCIA</Chip>}
                  </div>
                </div>
                <Button color="primary" className="bg-[#1e3b8a] font-black uppercase text-[10px] h-12 px-8" startContent={<Printer size={18} />} onPress={() => handlePrint()}>Imprimir</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center"><p className="text-gray-400 text-[9px] font-black uppercase mb-1">Histórico</p><p className="text-3xl font-black text-gray-600">{stats.historico}</p></div>
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center"><p className="text-emerald-400 text-[9px] font-black uppercase mb-1">Redimidos</p><p className="text-3xl font-black text-emerald-600">+{stats.limpiados}</p></div>
                <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-200 text-center"><p className="text-red-400 text-[9px] font-black uppercase mb-1">Balance Actual</p><p className="text-3xl font-black text-red-600">{stats.balance}</p></div>
              </div>
            </CardBody>
          </Card>

          <Card className="mb-8 border-none shadow-sm bg-white">
            <CardBody className="p-4 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1"><h2 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2 mb-2"><History size={18} className="text-[#1e3b8a]" /> Historial</h2></div>
              <div className="w-full md:w-48"><Select label="Mes" size="sm" variant="bordered" selectedKeys={[selectedMonth]} onSelectionChange={(k) => setSelectedMonth(Array.from(k)[0] as string)}>{months.map((m) => <SelectItem key={m.key}>{m.label}</SelectItem>)}</Select></div>
              <div className="w-full md:w-32"><Select label="Año" size="sm" variant="bordered" selectedKeys={[selectedYear]} onSelectionChange={(k) => setSelectedYear(Array.from(k)[0] as string)}>{["2024", "2025", "2026"].map((y) => <SelectItem key={y}>{y}</SelectItem>)}</Select></div>
            </CardBody>
          </Card>

          <Tabs selectedKey={activeTab} onSelectionChange={(k) => { setActiveTab(k as string); setPage(1); }} variant="underlined" color="primary" classNames={{ tabList: "mb-6", tabContent: "font-black uppercase text-[10px]" }}>
            <Tab key="active" title="Pendientes" />
            <Tab key="redeemed" title="Redenciones" />
            <Tab key="recognition" title="Premios" />
            <Tab key="all" title="Todo" />
          </Tabs>

          <div className="flex flex-col gap-4 mb-20">
            {events.map((ev) => {
              const isDem = ev.tipo === 'demerito';
              const isRed = ev.tipo === 'redencion';
              const isRec = ev.tipo === 'reconocimiento';
              return (
                <Card key={ev.id} className={`border-none shadow-sm bg-white overflow-hidden ${ev.estado === 'redimido' ? 'opacity-50 grayscale' : ''}`}>
                  <CardBody className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-2xl ${isDem ? (ev.estado === 'redimido' ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600') : (isRec ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600')}`}>
                          {isDem ? <ShieldAlert size={20}/> : (isRec ? <Award size={20}/> : <BadgeCheck size={20}/>)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase">{new Date(ev.fecha).toLocaleDateString()}</span>
                            {isRed && <Chip size="sm" variant="flat" color="primary" className="h-4 text-[8px] font-black uppercase">Redención Aplicada</Chip>}
                            {isDem && ev.estado === 'redimido' && <Chip size="sm" variant="flat" color="success" className="h-4 text-[8px] font-black uppercase">Redimido</Chip>}
                          </div>
                          <h3 className="font-black text-gray-900 uppercase text-sm">{ev.code}: {ev.title}</h3>
                          {isRed && ev.refInfo && <p className="text-[9px] font-bold text-gray-500 uppercase italic mt-1">Limpió falta: {ev.refInfo}</p>}
                          <p className="text-gray-500 text-xs mt-1 italic">{ev.observaciones || 'Sin detalles'}</p>
                          {isDem && ev.estado === 'activo' && (
                            <Button size="sm" color="success" variant="flat" className="mt-3 font-black text-[9px] h-7 uppercase" onPress={() => handleOpenAction('redencion', ev.id)}>Redimir ahora</Button>
                          )}
                        </div>
                      </div>
                      <div className={`text-xl font-black ${isDem ? (ev.estado === 'redimido' ? 'text-gray-300' : 'text-red-600') : 'text-emerald-600'}`}>
                        {ev.pointsValue !== 0 && `${isDem ? '-' : '+'}${ev.pointsValue}`}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
            <div className="flex justify-center mt-6"><Pagination isCompact showControls color="primary" page={page} total={Math.ceil(totalEventsCount / rowsPerPage)} onChange={setPage} /></div>
          </div>
        </div>
      )}

      <EventModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} studentId={id} studentName={student?.nombre} initialTab={modalTab} initialDemeritId={preselectedDemeritId} onSuccess={fetchData} />
      
      <div style={{ display: 'none' }}>
        <Instrument001 ref={componentRef} schoolName={schoolConfig.name} logoUrl={schoolConfig.logo} config={schoolConfig} student={{ nombre: student?.nombre, nie: student?.nie, grado: student?.grupo_nombre, genero: student?.genero }} events={allHistory} />
      </div>
    </DashboardLayout>
  );
}
