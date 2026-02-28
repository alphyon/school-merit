import Papa from 'papaparse';
import { supabase } from '../lib/supabase';

export interface ImportResult {
  success: boolean;
  count: number;
  error?: string;
}

export const importStudentsFromCSV = async (csvFile: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawRows = results.data as any[];
          
          // 1. Identificar grupos únicos (Grado + Sección)
          const groupsData = new Map();
          rawRows.forEach(row => {
            const grado = String(row['GRADO'] || row['grado'] || 'SIN GRADO').trim();
            const seccion = String(row['SECCION '] || row['seccion'] || 'A').trim().toUpperCase();
            if (!grado || grado === 'undefined') return;
            
            const key = `${grado}|${seccion}|Matutino`;
            if (!groupsData.has(key)) {
              groupsData.set(key, { grado, seccion, turno: 'Matutino', nombre: `${grado} "${seccion}"` });
            }
          });

          // Upsert de grupos
          const { data: createdGroups, error: groupError } = await supabase
            .from('grupos')
            .upsert(Array.from(groupsData.values()), { onConflict: 'grado,seccion,turno' })
            .select();

          if (groupError) throw groupError;
          const groupMap = new Map(createdGroups.map((g: any) => [`${g.grado}|${g.seccion}|${g.turno}`, g.id]));

          // 2. Preparar Estudiantes con Detección de Género y Limpieza de Duplicados
          const studentMap = new Map(); // Usamos un Map para evitar duplicados por NIE en el CSV

          rawRows.forEach((row: any) => {
            const nie = String(row['NIE'] || '').trim();
            const nombre = String(row['NOMBRE DEL ESTUDIANTES'] || row['NOMBRE'] || '').trim().toUpperCase();
            
            if (!nie || nie === 'null' || !nombre) return;

            // Detección de género en cualquier columna (por el desorden del CSV)
            let detectGender = 'M';
            for (const key of Object.keys(row)) {
              const val = String(row[key] || '').trim().toUpperCase();
              if (val === 'F' || val === 'FEMENINO') { detectGender = 'F'; break; }
              if (val === 'M' || val === 'MASCULINO') { detectGender = 'M'; break; }
            }

            const grado = String(row['GRADO'] || row['grado'] || 'SIN GRADO').trim();
            const seccion = String(row['SECCION '] || row['seccion'] || 'A').trim().toUpperCase();
            const key = `${grado}|${seccion}|Matutino`;

            // SI EL NIE YA EXISTE EN ESTA CARGA, SE IGNORA EL SEGUNDO (Evita error 21000)
            if (!studentMap.has(nie)) {
              studentMap.set(nie, {
                nie: nie,
                nombre: nombre,
                genero: detectGender,
                responsable: row[' PADRE/MADRE O RESPONSABLE'] || '',
                dui_responsable: row['DUI'] || '',
                grupo_id: groupMap.get(key),
                turno: 'Matutino'
              });
            }
          });

          const finalStudents = Array.from(studentMap.values());

          // 3. Insertar estudiantes (ahora el arreglo está garantizado sin duplicados internos)
          const { error: studentError } = await supabase
            .from('estudiantes')
            .upsert(finalStudents, { onConflict: 'nie' });

          if (studentError) throw studentError;
          
          resolve({ success: true, count: finalStudents.length });
        } catch (error: any) {
          console.error("Error importando:", error);
          resolve({ success: false, count: 0, error: error.message });
        }
      },
      error: (error) => resolve({ success: false, count: 0, error: error.message }),
    });
  });
};
