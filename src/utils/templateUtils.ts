import * as XLSX from 'xlsx';

export const downloadStudentTemplate = () => {
  // Columnas actualizadas incluyendo TURNO
  const headers = [
    ['NIE', 'NOMBRE DEL ESTUDIANTE', 'GENERO', 'GRADO', 'SECCION', 'TURNO', 'PADRE/MADRE O RESPONSABLE', 'DUI'],
    ['1234567', 'JUAN PEREZ GARCIA', 'M', 'Primer Grado', 'A', 'Matutino', 'MARIA GARCIA', '00000000-0'],
    ['7654321', 'MARIA LOPEZ TORRES', 'F', 'Segundo Grado', 'B', 'Vespertino', 'JOSE LOPEZ', '11111111-1'],
    ['9876543', 'CARLOS RIVAS', 'M', 'Noveno Grado', 'A', 'Nocturno', 'ELENA RIVAS', '22222222-2']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(headers);

  // Ajustar anchos
  ws['!cols'] = [
    { wch: 12 }, // NIE
    { wch: 35 }, // NOMBRE
    { wch: 10 }, // GENERO
    { wch: 20 }, // GRADO
    { wch: 10 }, // SECCION
    { wch: 15 }, // TURNO
    { wch: 35 }, // RESPONSABLE
    { wch: 15 }  // DUI
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Alumnos');
  XLSX.writeFile(wb, 'Plantilla_Carga_Alumnos.xlsx');
};
