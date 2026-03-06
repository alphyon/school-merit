import React from 'react';

interface ReportCardProps {
  student: any;
  events: any[];
  schoolName?: string;
  logoUrl?: string;
}

export const PrintableReportCard = React.forwardRef<HTMLDivElement, ReportCardProps>(({ student, events, schoolName, logoUrl }, ref) => {
  return (
    <div ref={ref} className="p-10 bg-white text-black font-serif print:block hidden min-h-screen">
      <div className="flex items-center justify-between border-b-2 border-black pb-6 mb-8">
        <div className="flex items-center gap-4">
          {logoUrl && <img src={logoUrl} className="h-20 w-auto object-contain" alt="Escuela Logo" />}
          <div className="text-left">
            <h1 className="text-2xl font-bold uppercase">{schoolName || 'CENTRO ESCOLAR PÚBLICO'}</h1>
            <h2 className="text-lg font-semibold italic">Boleta de Historial Conductual</h2>
            <p className="text-xs font-bold uppercase tracking-widest">Sistema de Gestión de Deméritos</p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p><strong>AÑO LECTIVO:</strong> 2024</p>
          <p><strong>FECHA:</strong> {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
        <div className="space-y-1">
          <p><strong>ALUMNO:</strong> <span className="uppercase">{student.nombre}</span></p>
          <p><strong>NIE:</strong> {student.nie}</p>
        </div>
        <div className="space-y-1 text-right">
          <p><strong>GRADO / SECCIÓN:</strong> {student.grado}</p>
          <p><strong>ESTADO:</strong> ACTIVO</p>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-[11px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black p-2 text-left">FECHA</th>
            <th className="border border-black p-2 text-left">CÓDIGO</th>
            <th className="border border-black p-2 text-left">DESCRIPCIÓN DE LA CONDUCTA</th>
            <th className="border border-black p-2 text-center">TIPO</th>
            <th className="border border-black p-2 text-center">VALOR</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr><td colSpan={5} className="border border-black p-10 text-center italic text-slate-400">Sin registros registrados a la fecha.</td></tr>
          ) : events.map((event, idx) => (
            <tr key={idx}>
              <td className="border border-black p-2">{event.date.split(',')[0]}</td>
              <td className="border border-black p-2 font-bold">{event.code}</td>
              <td className="border border-black p-2">
                <p className="font-bold">{event.title}</p>
                {event.description && <p className="italic text-[10px] mt-1 text-slate-600">Obs: {event.description}</p>}
              </td>
              <td className="border border-black p-2 text-center uppercase font-black">{event.type}</td>
              <td className={`border border-black p-2 text-center font-black ${event.type === 'demerito' ? 'text-red-600' : 'text-emerald-600'}`}>
                {event.points > 0 ? `+${event.points}` : event.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-3 gap-10 text-center text-[10px] font-bold">
        <div className="border-t border-black pt-2">FIRMA DOCENTE</div>
        <div className="border-t border-black pt-2">FIRMA DIRECTOR(A)</div>
        <div className="border-t border-black pt-2">FIRMA RESPONSABLE</div>
      </div>

      <footer className="fixed bottom-10 left-0 right-0 text-center text-[8px] text-slate-400 uppercase tracking-[0.3em]">
        Documento oficial generado por el Sistema de Gestión de Deméritos
      </footer>
    </div>
  );
});
