import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Genera un Excel con múltiples pestañas (una por grupo)
 * Asegurando compatibilidad total.
 */
export const exportGroupsToExcel = (groupedData: { [key: string]: any[] }, fileName: string) => {
  const wb = XLSX.utils.book_new();

  // Ordenar grupos por nombre
  const groupNames = Object.keys(groupedData).sort();

  groupNames.forEach((groupName) => {
    // 1. Crear la hoja desde los datos JSON
    const ws = XLSX.utils.json_to_sheet(groupedData[groupName]);
    
    // 2. Limpiar nombre de la pestaña (máx 31 caracteres, sin caracteres prohibidos : \ / ? * [ ] )
    const safeSheetName = groupName.replace(/[:\\/?*[\]]/g, "_").substring(0, 31);
    
    // 3. Añadir la hoja al libro con su nombre específico
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  });

  // 4. Escribir el archivo
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const formatStudentDataForExport = (students: any[]) => {
  return students.map(s => ({
    'NIE': s.nie,
    'Nombre Completo': s.nombre,
    'Grupo': s.grupo_nombre || s.grado || 'Sin Grupo',
    'Total Deméritos': Number(s.total_demeritos || 0),
    'Total Redenciones': Number(s.total_redenciones || 0),
    'Puntaje Neto': Number(s.total_redenciones || 0) - Number(s.total_demeritos || 0),
    'Responsable': s.responsable || 'N/A',
    'DUI': s.dui_responsable || 'N/A'
  }));
};
