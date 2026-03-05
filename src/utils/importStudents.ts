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
          
          // 1. Identificar grupos únicos (Grado + Sección + Turno)
          const groupsData = new Map();
          rawRows.forEach(row => {
            const grado = String(row['GRADO'] || row['grado'] || 'SIN GRADO').trim();
            const seccion = String(row['SECCION'] || row['seccion'] || row['SECCION '] || 'A').trim().toUpperCase();
            // Normalizar Turno (Matutino, Vespertino, Nocturno)
            let turno = String(row['TURNO'] || row['turno'] || 'Matutino').trim();
            turno = turno.charAt(0).toUpperCase() + turno.slice(1).toLowerCase();
            if (!['Matutino', 'Vespertino', 'Nocturno'].includes(turno)) turno = 'Matutino';

            if (!grado || grado === 'undefined') return;
            
            const key = `${grado}|${seccion}|${turno}`;
            if (!groupsData.has(key)) {
              groupsData.set(key, { grado, seccion, turno, nombre: `${grado} "${seccion}" (${turno})` });
            }
          });

          // Upsert de grupos (Busca por grado, sección y turno)
          const { data: createdGroups, error: groupError } = await supabase
            .from('grupos')
            .upsert(Array.from(groupsData.values()), { onConflict: 'nombre' }) // Usamos nombre o podrías usar un composite index si existe
            .select();

          if (groupError) throw groupError;
          const groupMap = new Map(createdGroups.map((g: any) => [`${g.grado}|${g.seccion}|${g.turno}`, g.id]));

          // 2. Preparar Estudiantes
          const studentMap = new Map();

          rawRows.forEach((row: any) => {
            const nie = String(row['NIE'] || '').trim();
            const nombre = String(row['NOMBRE DEL ESTUDIANTE'] || row['NOMBRE DEL ESTUDIANTES'] || row['NOMBRE'] || '').trim().toUpperCase();
            
            if (!nie || nie === 'null' || !nombre) return;

            let detectGender = 'M';
            for (const key of Object.keys(row)) {
              const val = String(row[key] || '').trim().toUpperCase();
              if (val === 'F' || val === 'FEMENINO') { detectGender = 'F'; break; }
              if (val === 'M' || val === 'MASCULINO') { detectGender = 'M'; break; }
            }

            const grado = String(row['GRADO'] || 'SIN GRADO').trim();
            const seccion = String(row['SECCION'] || row['SECCION '] || 'A').trim().toUpperCase();
            let turno = String(row['TURNO'] || 'Matutino').trim();
            turno = turno.charAt(0).toUpperCase() + turno.slice(1).toLowerCase();
            if (!['Matutino', 'Vespertino', 'Nocturno'].includes(turno)) turno = 'Matutino';

            const key = `${grado}|${seccion}|${turno}`;

            if (!studentMap.has(nie)) {
              studentMap.set(nie, {
                nie: nie,
                nombre: nombre,
                genero: detectGender,
                responsable: row['PADRE/MADRE O RESPONSABLE'] || row[' PADRE/MADRE O RESPONSABLE'] || '',
                dui_responsable: row['DUI'] || '',
                grupo_id: groupMap.get(key),
                grado: grado,
                seccion: seccion,
                turno: turno
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
