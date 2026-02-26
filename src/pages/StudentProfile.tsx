import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AppHeader from '../components/AppHeader';
import AdminSidebar from '../components/AdminSidebar';
import { useReactToPrint } from 'react-to-print';
import { PrintableReportCard } from '../components/PrintableReportCard';
import { Notification } from '../components/Notification';
import { Card, CardBody, Avatar, Button, Badge, Spinner, Pagination } from "@heroui/react";
import { 
  User, School, History, 
  Gavel, HeartHandshake, Printer, ArrowLeft
} from 'lucide-react';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef<HTMLDivElement>(null);
  
  const [student, setStudent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
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

  if (isLoading && page === 1) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  const is_admin = userRole === 'admin';

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] text-slate-900 dark:text-slate-100 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex min-h-screen">
        {is_admin && <AdminSidebar />}
        <main className={`flex-1 p-4 md:p-8 ${is_admin ? 'md:ml-64' : ''}`}>
          {!is_admin && <AppHeader role="docente" />}
          <div className="max-w-5xl mx-auto mt-4">
            <div className="flex items-center gap-2 mb-6"><Button variant="light" size="sm" startContent={<ArrowLeft size={18} />} onPress={() => navigate(-1)}>Volver</Button></div>
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm mb-8"><CardBody className="p-6 lg:p-10"><div className="flex flex-col md:flex-row items-center gap-8"><Avatar className="h-32 w-32 border-4 border-white shadow-lg" name={student?.nombre?.charAt(0)} /><div className="flex-1 text-center md:text-left"><h1 className="text-slate-900 dark:text-slate-100 text-3xl font-black uppercase">{student?.nombre}</h1><div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-slate-500 font-bold text-xs uppercase"><p className="flex items-center gap-1"><User size={14} /> NIE: {student?.nie}</p><p className="flex items-center gap-1"><School size={14} /> {student?.grupos?.nombre || 'SIN GRUPO'}</p></div></div><Button color="primary" className="bg-[#1e3b8a] font-bold" startContent={<Printer size={18} />} onPress={() => handlePrint()}>Imprimir</Button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10"><div className="p-6 rounded-2xl border border-red-100 bg-red-50/30 flex justify-between items-center"><p className="text-red-600 text-xs font-black uppercase">Deméritos</p><p className="text-red-600 text-4xl font-black">{stats.demerits}</p></div><div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 flex justify-between items-center"><p className="text-emerald-600 text-xs font-black uppercase">Redenciones</p><p className="text-emerald-600 text-4xl font-black">{stats.redemptions}</p></div></div></CardBody></Card>
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black flex items-center gap-2 uppercase"><History size={24} className="text-[#1e3b8a]" /> Historial</h2><p className="text-[10px] font-black text-slate-400 uppercase">Total: {totalEventsCount}</p></div>
            <div className="flex flex-col gap-4 mb-10 relative min-h-[300px]">
              {isLoading && page > 1 && (<div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f6f6f8]/50 backdrop-blur-sm rounded-3xl"><Spinner /></div>)}
              {events.length === 0 ? (<div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic font-bold">Sin registros.</div>) : (<>{events.map((event) => (<Card key={event.id} className="relative overflow-hidden border border-slate-200 shadow-sm"><div className={`absolute left-0 top-0 bottom-0 w-1.5 ${event.type === 'demerito' ? 'bg-red-500' : 'bg-emerald-500'}`}></div><CardBody className="p-5"><div className="flex flex-col md:flex-row justify-between gap-4"><div className="flex gap-4"><div className={`size-12 rounded-full flex items-center justify-center ${event.type === 'demerito' ? 'bg-red-100' : 'bg-emerald-100'}`}>{event.icon}</div><div><div className="flex items-center gap-3 mb-1"><Badge color={event.type === 'demerito' ? 'danger' : 'success'} variant="flat" size="sm" className="font-black">{event.type.toUpperCase()}</Badge><span className="text-slate-400 text-[10px] font-bold">{event.date}</span></div><h3 className="text-slate-900 dark:text-white font-bold text-lg">{event.code}: {event.title}</h3><p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{event.description || 'Sin observaciones'}</p><p className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Docente: <strong className="text-primary">{event.loggedBy}</strong></p></div></div><span className={`font-black text-2xl ${event.type === 'demerito' ? 'text-red-600' : 'text-emerald-600'}`}>{event.points > 0 ? `+${event.points}` : event.points}</span></div></CardBody></Card>))}<div className="flex justify-center mt-6"><Pagination isCompact showControls color="primary" page={page} total={Math.ceil(totalEventsCount / rowsPerPage)} onChange={setPage} /></div></>)}
            </div>
          </div>
        </main>
      </div>
      <div style={{ display: 'none' }}><PrintableReportCard ref={componentRef} schoolName={schoolConfig.name} logoUrl={schoolConfig.logo} student={{ nombre: student?.nombre, nie: student?.nie, grado: student?.grupos?.nombre }} events={events} /></div>
    </div>
  );
}
