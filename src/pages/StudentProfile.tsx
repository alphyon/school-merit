import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { useReactToPrint } from 'react-to-print';
import { PrintableReportCard } from '../components/PrintableReportCard';
import { Notification } from '../components/Notification';
import { Card, CardBody, Avatar, Button, Badge, Spinner, Pagination, Chip } from "@heroui/react";
import { 
  User, School, History, 
  Gavel, HeartHandshake, Printer, ArrowLeft, TrendingDown, BadgeCheck
} from 'lucide-react';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef<HTMLDivElement>(null);
  
  const [student, setStudent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'docente'>('docente');
  const [schoolConfig, setSchoolConfig] = useState({ name: '', logo: '' });
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [stats, setStats] = useState({ demerits: 0, redemptions: 0 });

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: config } = await supabase.from('configuracion_sistema').select('nombre_escuela, logo_url').single();
      if (config) setSchoolConfig({ name: config.nombre_escuela, logo: config.logo_url });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('perfiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || 'docente');
      }

      const { data: studentData, error: sError } = await supabase.from('estudiantes').select('*, grupos(nombre)').eq('id', id).single();
      if (sError) throw sError;
      setStudent(studentData);

      const { count: dCount } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('estudiante_id', id).eq('tipo', 'demerito');
      const { count: rCount } = await supabase.from('registros_eventos').select('*', { count: 'exact', head: true }).eq('estudiante_id', id).eq('tipo', 'redencion');
      setStats({ demerits: dCount || 0, redemptions: rCount || 0 });
      setTotalEventsCount((dCount || 0) + (rCount || 0));

      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      const { data: eventsData, error: eError } = await supabase.from('registros_eventos').select('*, demeritos_catalogo(codigo, descripcion, puntos_valor), redenciones_catalogo(codigo, descripcion, puntos_valor), docentes(nombre)').eq('estudiante_id', id).order('created_at', { ascending: false }).range(from, to);
      if (eError) throw eError;
      
      const formattedEvents = (eventsData || []).map((event: any) => {
        const isDemerito = event.tipo === 'demerito';
        const catalog = isDemerito ? event.demeritos_catalogo : event.redenciones_catalogo;
        return {
          id: event.id,
          type: event.tipo,
          code: catalog?.codigo || 'N/A',
          title: catalog?.descripcion || 'Sin descripción',
          description: event.observaciones,
          date: new Date(event.created_at).toLocaleString(),
          points: catalog?.puntos_valor ? (isDemerito ? -catalog.puntos_valor : catalog.puntos_valor) : 0,
          loggedBy: event.docentes?.nombre || 'Administración',
          icon: isDemerito ? <Gavel size={20} className="text-red-600" /> : <HeartHandshake size={20} className="text-emerald-600" />
        };
      });
      setEvents(formattedEvents);
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsLoading(false); }
  };

  useEffect(() => { if (id) fetchData(); }, [id, page]);

  if (isLoading && page === 1) return <div className="h-screen flex items-center justify-center bg-gray-50"><Spinner size="lg" color="primary" /></div>;

  return (
    <DashboardLayout role={userRole}>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Button variant="flat" size="sm" className="font-bold text-gray-500 bg-white" startContent={<ArrowLeft size={18} />} onPress={() => navigate(-1)}>Regresar</Button>
        </div>

        <Card className="border-none shadow-sm mb-10 bg-white overflow-hidden">
          <CardBody className="p-8 lg:p-12">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <Avatar className="h-32 w-32 rounded-[2.5rem] border-4 border-gray-50 shadow-xl" name={student?.nombre?.charAt(0)} />
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl lg:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2">
                  {student?.nombre}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-6 text-gray-400 font-bold text-xs uppercase tracking-widest">
                  <p className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><User size={14} className="text-[#1e3b8a]"/> NIE: {student?.nie}</p>
                  <p className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><School size={14} className="text-[#1e3b8a]"/> {student?.grupos?.nombre || 'SIN GRUPO'}</p>
                </div>
              </div>
              <Button color="primary" className="bg-[#1e3b8a] font-black uppercase text-xs h-14 px-10 shadow-xl shadow-blue-900/20" startContent={<Printer size={20} />} onPress={() => handlePrint()}>Imprimir Boleta</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
              <div className="p-8 rounded-[2rem] bg-red-50 border border-red-100 flex justify-between items-center group hover:bg-red-100 transition-colors">
                <div><p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-1">Faltas Totales</p><p className="text-5xl font-black text-red-600 tracking-tighter">{stats.demerits}</p></div>
                <TrendingDown size={48} className="text-red-200 group-hover:scale-110 transition-transform" />
              </div>
              <div className="p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex justify-between items-center group hover:bg-emerald-100 transition-colors">
                <div><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Méritos Totales</p><p className="text-5xl font-black text-emerald-600 tracking-tighter">{stats.redemptions}</p></div>
                <BadgeCheck size={48} className="text-emerald-200 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight text-gray-900">
            <History size={28} className="text-[#1e3b8a]" /> Línea de Tiempo
          </h2>
          <Chip variant="flat" color="primary" className="font-black text-[10px] uppercase">Registros: {totalEventsCount}</Chip>
        </div>

        <div className="flex flex-col gap-4 mb-20 relative min-h-[400px]">
          {isLoading && page > 1 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/60 backdrop-blur-sm rounded-[2rem]">
              <Spinner color="primary" label="Cargando historial..." />
            </div>
          )}

          {events.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 font-bold uppercase tracking-widest text-xs">Sin registros de conducta</div>
          ) : (
            <>
              {events.map((event) => (
                <Card key={event.id} className="border-none shadow-sm bg-white overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${event.type === 'demerito' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                  <CardBody className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex gap-5">
                        <div className={`size-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${event.type === 'demerito' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {event.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge color={event.type === 'demerito' ? 'danger' : 'success'} variant="flat" size="sm" className="font-black uppercase text-[9px] px-2">{event.type}</Badge>
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{event.date}</span>
                          </div>
                          <h3 className="text-gray-900 font-black text-lg mb-1">{event.code}: {event.title}</h3>
                          <p className="text-gray-500 text-sm font-medium leading-relaxed">{event.description || 'Sin observaciones adicionales'}</p>
                          <p className="mt-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Registrado por: <span className="text-[#1e3b8a]">{event.loggedBy}</span></p>
                        </div>
                      </div>
                      <div className={`text-3xl font-black ${event.type === 'demerito' ? 'text-red-600' : 'text-emerald-600'} flex items-center`}>
                        {event.points > 0 ? `+${event.points}` : event.points}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
              
              <div className="flex justify-center mt-10">
                <Pagination isCompact showControls color="primary" page={page} total={Math.ceil(totalEventsCount / rowsPerPage)} onChange={setPage} classNames={{ cursor: "bg-[#1e3b8a] font-bold shadow-lg shadow-blue-900/20" }} />
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <PrintableReportCard 
          ref={componentRef} 
          schoolName={schoolConfig.name}
          logoUrl={schoolConfig.logo}
          student={{ nombre: student?.nombre, nie: student?.nie, grado: student?.grupos?.nombre }} 
          events={events} 
        />
      </div>
    </DashboardLayout>
  );
}
