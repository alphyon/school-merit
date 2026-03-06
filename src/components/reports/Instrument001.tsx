import React from 'react';

interface Instrument001Props {
  schoolName: string;
  logoUrl?: string;
  config: {
    codigoCe: string;
    departamento: string;
    municipio: string;
    distrito: string;
  };
  student: {
    nombre: string;
    nie: string;
    grado: string;
    genero?: string;
    turno?: string;
  };
  events: any[];
}

export const Instrument001 = React.forwardRef<HTMLDivElement, Instrument001Props>(
  ({ schoolName, logoUrl, config, student, events }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white text-black font-serif text-[9px] w-[21.59cm] min-h-[27.94cm] mx-auto print:m-0 flex flex-col justify-between">
        <div>
          {/* Header Oficial */}
          <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-2">
            {/* Izquierda: Logo Escuela */}
            <div className="w-24 flex justify-start">
              {logoUrl && <img src={logoUrl} className="h-14 w-auto object-contain" alt="Logo C.E." />}
            </div>
            
            {/* Centro: Títulos */}
            <div className="flex-1 text-center px-2">
              <h1 className="text-[10px] font-bold uppercase leading-none text-gray-800">Ministerio de Educación, Ciencia y Tecnología</h1>
              <h2 className="text-[10px] font-bold uppercase mt-1 italic">Instrumento No. 001</h2>
              <h3 className="text-sm font-black uppercase tracking-tight mt-1">Tarjeta de Deméritos del Estudiante</h3>
            </div>

            {/* Derecha: Logo Ministerio */}
            <img 
              src="/Logo_oficial_del_Ministerio_de_Educación_de_El_Salvador.png" 
              className="h-16 w-auto object-contain" 
              alt="MINED" 
            />
          </div>

          <div className="border border-black p-2 rounded mb-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-1">
              <div className="border-b border-gray-300 flex justify-start">1. Centro Educativo: <span className="font-bold uppercase ml-2">{schoolName}</span></div>
              <div className="border-b border-gray-300 flex justify-start">2. Código C.E.: <span className="font-bold ml-2">{config.codigoCe}</span></div>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 mb-1">
              <div className="border-b border-gray-300 flex justify-start">3. Depto: <span className="font-bold ml-1">{config.departamento}</span></div>
              <div className="border-b border-gray-300 flex justify-start">4. Mun: <span className="font-bold ml-1">{config.municipio}</span></div>
              <div className="border-b border-gray-300 flex justify-start">5. Dist: <span className="font-bold ml-1">{config.distrito}</span></div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 mb-1">
              <div className="border-b border-gray-300 flex justify-start">6. Nombre: <span className="font-bold uppercase ml-2">{student.nombre}</span></div>
              <div className="border-b border-gray-300 flex justify-start w-40">7. NIE: <span className="font-bold ml-2">{student.nie}</span></div>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              <div className="border-b border-gray-300 flex justify-start">8. Sexo: <span className="font-bold ml-2">{student.genero === 'M' ? 'Masculino' : (student.genero === 'F' ? 'Femenino' : student.genero)}</span></div>
              <div className="border-b border-gray-300 flex justify-start">9. Grado/Sección: <span className="font-bold ml-2">{student.grado}</span></div>
              <div className="border-b border-gray-300 flex justify-start">10. Turno: <span className="font-bold ml-2 uppercase">{student.turno || '_________'}</span></div>
            </div>
          </div>

          {/* Tabla de Registros */}
          <div className="mb-2 text-[8px] font-bold">
            ● 12. D: Deméritos, 13. R: Redención, 14. RC: Reconocimiento
          </div>
          <table className="w-full border-collapse border-2 border-black text-[8px] text-center mb-3">
            <thead>
              <tr className="bg-gray-100 uppercase">
                <th rowSpan={2} className="border border-black p-1 w-6">No.</th>
                <th rowSpan={2} className="border border-black p-1 w-14">11. Fecha</th>
                <th colSpan={4} className="border border-black p-1">12. D</th>
                <th colSpan={3} className="border border-black p-1">13. R</th>
                <th colSpan={2} className="border border-black p-1">14. RC</th>
                <th rowSpan={2} className="border border-black p-1 w-24">15. Nombre y firma registra</th>
                <th rowSpan={2} className="border border-black p-1 w-24">16. Nombre y firma Resp. Redención</th>
                <th rowSpan={2} className="border border-black p-1 w-20">17. Firma estudiante</th>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black w-5">A</th><th className="border border-black w-5">B</th><th className="border border-black w-5">C</th><th className="border border-black w-5">D</th>
                <th className="border border-black w-5">A</th><th className="border border-black w-5">B</th><th className="border border-black w-5">C</th>
                <th className="border border-black w-5">A</th><th className="border border-black w-5">B</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(18)].map((_, i) => {
                const event = events[i];
                const code = event?.code?.toUpperCase();
                return (
                  <tr key={i} className="h-6 border-b border-gray-200">
                    <td className="border border-black text-gray-400">{i + 1}</td>
                    <td className="border border-black">{event ? new Date(event.fecha).toLocaleDateString() : ''}</td>
                    {/* Deméritos */}
                    <td className="border border-black font-bold text-red-600">{code === 'A' && event.tipo === 'demerito' ? 'X' : ''}</td>
                    <td className="border border-black font-bold text-red-600">{code === 'B' && event.tipo === 'demerito' ? 'X' : ''}</td>
                    <td className="border border-black font-bold text-red-600">{code === 'C' && event.tipo === 'demerito' ? 'X' : ''}</td>
                    <td className="border border-black font-bold text-red-600">{code === 'D' && event.tipo === 'demerito' ? 'X' : ''}</td>
                    {/* Redenciones */}
                    <td className="border border-black font-bold text-emerald-600">{code === 'A' && event.tipo === 'redencion' ? 'X' : ''}</td>
                    <td className="border border-black font-bold text-emerald-600">{code === 'B' && event.tipo === 'redencion' ? 'X' : ''}</td>
                    <td className="border border-black font-bold text-emerald-600">{code === 'C' && event.tipo === 'redencion' ? 'X' : ''}</td>
                    {/* Reconocimientos */}
                    <td className="border border-black font-bold text-purple-600">{code === 'A' && event.tipo === 'reconocimiento' ? 'X' : ''}</td>
                    <td className="border border-black font-bold text-purple-600">{code === 'B' && event.tipo === 'reconocimiento' ? 'X' : ''}</td>
                    {/* Firmas */}
                    <td className="border border-black text-[7px] italic overflow-hidden whitespace-nowrap px-1">{event?.loggedBy}</td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                  </tr>
                );
              })}
              <tr className="h-6 font-bold bg-gray-50">
                <td colSpan={13} className="border border-black text-right px-2 uppercase">18. Total</td>
                <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
              </tr>
            </tbody>
          </table>

          {/* Director Footer */}
          <div className="mt-4 text-center">
             <div className="inline-block border-t border-black pt-1 px-16">
               <p className="font-bold uppercase text-[9px]">Nombre, firma y sello del Director del C. E.</p>
             </div>
          </div>
        </div>

        {/* Footer Legal */}
        <div className="border border-black p-2 mt-2 bg-gray-50 text-[8px] leading-tight grid grid-cols-4 gap-3">
          <div className="border-r border-gray-300 pr-2">
            <p className="font-bold uppercase mb-1 underline">Artículo 3. Asignación</p>
            <p className="mb-1">Los deméritos se asignarán en los siguientes casos:</p>
            <ul className="list-none pl-0 space-y-0.5">
              <li>A) No saludar al entrar o al salir del aula.</li>
              <li>B) Omitir "Por favor" al hacer una petición.</li>
              <li>C) Omitir "Gracias" al recibir un favor, material o atención.</li>
              <li>D) Usar un tono grosero o irrespetuoso.</li>
            </ul>
          </div>
          <div className="border-r border-gray-300 px-2">
            <p className="font-bold uppercase mb-1 underline">Artículo 5. Escala</p>
            <ul className="list-none pl-0 space-y-0.5">
              <li>- 3 deméritos: Advertencia verbal y reflexión.</li>
              <li>- 6 deméritos: Comunicación a familia.</li>
              <li>- 10 deméritos: Suspensión privilegios.</li>
              <li className="font-bold text-red-700">- 15 deméritos: No promoción de grado.</li>
            </ul>
          </div>
          <div className="border-r border-gray-300 px-2">
            <p className="font-bold uppercase mb-1 underline">Artículo 6. Redención</p>
            <ul className="list-none pl-0 space-y-0.5">
              <li>A) Semana completa cortesía ejemplar.</li>
              <li>B) Actividades orden y limpieza.</li>
              <li>C) Campañas de valores.</li>
            </ul>
          </div>
          <div className="pl-2">
            <p className="font-bold uppercase mb-1 underline">Artículo 7. Reconocim.</p>
            <ul className="list-none pl-0 space-y-0.5">
              <li>A) Diplomas.</li>
              <li>B) Menciones en Murales.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
);
