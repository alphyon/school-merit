import React from 'react';

interface Instrument003Props {
  schoolName: string;
  logoUrl?: string;
  config: {
    codigoCe: string;
    departamento: string;
    municipio: string;
    distrito: string;
  };
  period: string; // Mes/Año
  data: any[]; 
}

export const Instrument003 = React.forwardRef<HTMLDivElement, Instrument003Props>(
  ({ schoolName, logoUrl, config, period, data }, ref) => {
    // Calcular totales generales
    const total = data.reduce((acc, curr) => ({
      matM: acc.matM + curr.matM, matH: acc.matH + curr.matH, matT: acc.matT + curr.matT,
      demM: acc.demM + curr.demM, demH: acc.demH + curr.demH, demT: acc.demT + curr.demT,
      demA: acc.demA + curr.demA, demB: acc.demB + curr.demB, demC: acc.demC + curr.demC, demD: acc.demD + curr.demD, demTotal: acc.demTotal + curr.demTotal,
      redM: acc.redM + curr.redM, redH: acc.redH + curr.redH, redT: acc.redT + curr.redT,
      redA: acc.redA + curr.redA, redB: acc.redB + curr.redB, redC: acc.redC + curr.redC, redTotal: acc.redTotal + curr.redTotal,
      recM: acc.recM + curr.recM, recH: acc.recH + curr.recH, recT: acc.recT + curr.recT
    }), { 
      matM: 0, matH: 0, matT: 0, 
      demM: 0, demH: 0, demT: 0, demA: 0, demB: 0, demC: 0, demD: 0, demTotal: 0,
      redM: 0, redH: 0, redT: 0, redA: 0, redB: 0, redC: 0, redTotal: 0,
      recM: 0, recH: 0, recT: 0
    });

    return (
      <>
        <style>{`@media print { @page { size: landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; } }`}</style>
        <div ref={ref} className="p-8 bg-white text-black font-serif text-[8px] w-[29.7cm] min-h-[21cm] mx-auto print:m-0 print:w-full flex flex-col">
          {/* Header Oficial */}
          <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-2">
            {/* Izquierda: Logo Escuela */}
            <div className="w-24 flex justify-start">
              {logoUrl && <img src={logoUrl} className="h-14 w-auto object-contain" alt="Logo C.E." />}
            </div>
            
            {/* Centro: Títulos */}
            <div className="flex-1 text-center px-4">
              <h1 className="text-[10px] font-bold uppercase leading-none text-gray-800">Ministerio de Educación, Ciencia y Tecnología</h1>
              <h2 className="text-[10px] font-bold uppercase mt-1 italic">Instrumento No. 003</h2>
              <h3 className="text-xs font-black uppercase tracking-tight mt-1">Registro Consolidado Mensual de Deméritos/Redenciones/Reconocimientos (Director)</h3>
            </div>

            {/* Derecha: Logo Ministerio */}
            <img 
              src="/Logo_oficial_del_Ministerio_de_Educación_de_El_Salvador.png" 
              className="h-16 w-auto object-contain" 
              alt="MINED" 
            />
          </div>

          <div className="grid grid-cols-[3fr_1fr] gap-x-4 mb-3 text-[9px]">
            <div className="border-b border-black flex justify-start">1.Nombre del Centro Educativo: <span className="font-bold uppercase ml-2">{schoolName}</span></div>
            <div className="border-b border-black flex justify-start">2. Código del C.E: <span className="font-bold ml-2">{config.codigoCe}</span></div>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-x-4 mb-4 text-[9px]">
            <div className="border-b border-black flex justify-start">3. Departamento: <span className="font-bold ml-1">{config.departamento}</span></div>
            <div className="border-b border-black flex justify-start">4. Municipio: <span className="font-bold ml-1">{config.municipio}</span></div>
            <div className="border-b border-black flex justify-start">5. Distrito: <span className="font-bold ml-1">{config.distrito}</span></div>
            <div className="border-b border-black flex justify-start">6. Mes/Año: <span className="font-bold ml-1 uppercase">{period}</span></div>
          </div>

          {/* Tabla Principal */}
          <table className="w-full border-collapse border border-black text-center text-[7px] mb-4">
            <thead>
              <tr className="bg-gray-100 uppercase">
                <th rowSpan={2} className="border border-black p-1 w-6">No.</th>
                <th rowSpan={2} className="border border-black p-1 w-10">7. Grado</th>
                <th rowSpan={2} className="border border-black p-1 w-6">8. Sección</th>
                <th rowSpan={2} className="border border-black p-1 w-12">9. Turno / Modalidad</th>
                <th colSpan={3} className="border border-black p-1">10. Matrícula</th>
                <th colSpan={3} className="border border-black p-1">11. Número de Deméritos por sexo</th>
                <th colSpan={5} className="border border-black p-1">12. Número de Deméritos por causales</th>
                <th colSpan={3} className="border border-black p-1">13. Número de Redenciones por sexo</th>
                <th colSpan={4} className="border border-black p-1">14. Número de Redenciones por opción elegida</th>
                <th colSpan={3} className="border border-black p-1">15. Número de Reconocimientos</th>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black w-6">M</th><th className="border border-black w-6">H</th><th className="border border-black w-8">Total</th>
                <th className="border border-black w-6">M</th><th className="border border-black w-6">H</th><th className="border border-black w-8">Total</th>
                <th className="border border-black w-5">A</th><th className="border border-black w-5">B</th><th className="border border-black w-5">C</th><th className="border border-black w-5">D</th><th className="border border-black w-6">Total</th>
                <th className="border border-black w-6">M</th><th className="border border-black w-6">H</th><th className="border border-black w-8">Total</th>
                <th className="border border-black w-5">A</th><th className="border border-black w-5">B</th><th className="border border-black w-5">C</th><th className="border border-black w-6">Total</th>
                <th className="border border-black w-6">M</th><th className="border border-black w-6">H</th><th className="border border-black w-8">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="h-6 border-b border-gray-300">
                  <td className="border border-black text-gray-500">{i + 1}</td>
                  <td className="border border-black font-bold text-left px-1">{row.grado}</td>
                  <td className="border border-black font-bold">{row.seccion}</td>
                  <td className="border border-black text-[6px] uppercase">{row.turno}</td>
                  {/* Matrícula */}
                  <td className="border border-black">{row.matM || ''}</td>
                  <td className="border border-black">{row.matH || ''}</td>
                  <td className="border border-black font-bold bg-gray-50">{row.matT || ''}</td>
                  {/* Deméritos Sexo */}
                  <td className="border border-black">{row.demM || ''}</td>
                  <td className="border border-black">{row.demH || ''}</td>
                  <td className="border border-black font-bold bg-gray-50">{row.demT || ''}</td>
                  {/* Deméritos Causal */}
                  <td className="border border-black">{row.demA || ''}</td>
                  <td className="border border-black">{row.demB || ''}</td>
                  <td className="border border-black">{row.demC || ''}</td>
                  <td className="border border-black">{row.demD || ''}</td>
                  <td className="border border-black font-bold bg-gray-50">{row.demTotal || ''}</td>
                  {/* Redenciones Sexo */}
                  <td className="border border-black">{row.redM || ''}</td>
                  <td className="border border-black">{row.redH || ''}</td>
                  <td className="border border-black font-bold bg-gray-50">{row.redT || ''}</td>
                  {/* Redenciones Opción */}
                  <td className="border border-black">{row.redA || ''}</td>
                  <td className="border border-black">{row.redB || ''}</td>
                  <td className="border border-black">{row.redC || ''}</td>
                  <td className="border border-black font-bold bg-gray-50">{row.redTotal || ''}</td>
                  {/* Reconocimientos Sexo */}
                  <td className="border border-black">{row.recM || ''}</td>
                  <td className="border border-black">{row.recH || ''}</td>
                  <td className="border border-black font-bold bg-gray-50">{row.recT || ''}</td>
                </tr>
              ))}
              {/* Filas vacías para llenar espacio visual */}
              {[...Array(Math.max(0, 10 - data.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="h-6 border-b border-gray-200">
                  <td className="border border-black text-gray-300">{data.length + i + 1}</td>
                  {[...Array(24)].map((__, j) => <td key={j} className="border border-black"></td>)}
                </tr>
              ))}
              {/* TOTALES */}
              <tr className="h-6 font-black bg-gray-100 uppercase border-t-2 border-black">
                <td colSpan={4} className="border border-black text-right px-2">16. TOTAL</td>
                <td className="border border-black">{total.matM}</td><td className="border border-black">{total.matH}</td><td className="border border-black">{total.matT}</td>
                <td className="border border-black">{total.demM}</td><td className="border border-black">{total.demH}</td><td className="border border-black">{total.demT}</td>
                <td className="border border-black">{total.demA}</td><td className="border border-black">{total.demB}</td><td className="border border-black">{total.demC}</td><td className="border border-black">{total.demD}</td><td className="border border-black">{total.demTotal}</td>
                <td className="border border-black">{total.redM}</td><td className="border border-black">{total.redH}</td><td className="border border-black">{total.redT}</td>
                <td className="border border-black">{total.redA}</td><td className="border border-black">{total.redB}</td><td className="border border-black">{total.redC}</td><td className="border border-black">{total.redTotal}</td>
                <td className="border border-black">{total.recM}</td><td className="border border-black">{total.recH}</td><td className="border border-black">{total.recT}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="inline-block border-t border-black pt-1 px-32 uppercase font-bold text-[9px] tracking-widest">
              <p>Nombre, firma y sello del Director del C. E.</p>
            </div>
          </div>
        </div>
      </>
    );
  }
);
