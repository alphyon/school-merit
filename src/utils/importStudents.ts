import Papa from 'papaparse';
import { supabase } from '../lib/supabase';

export const importStudentsFromCSV = async (csvFileContent: string) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvFileContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          const rawRows = results.data as any[];
          const uniqueGroups = Array.from(new Set(rawRows.map(row => 
            `${row['GRADO']?.toString().trim().toUpperCase()}|${row['SECCION ']?.toString().trim().toUpperCase() || 'A'}`
          )));

          const groupsToInsert = uniqueGroups.map(g => {
            const [grado, seccion] = g.split('|');
            return { grado, seccion, nombre: `${grado} ${seccion}` };
          });

          const { data: createdGroups, error: groupError } = await supabase
            .from('grupos')
            .upsert(groupsToInsert, { onConflict: 'nombre' })
            .select();

          if (groupError) throw groupError;

          const groupMap = new Map(createdGroups.map((g: any) => [g.nombre, g.id]));

          const rawStudents = rawRows.map((row: any) => {
            const grado = row['GRADO']?.toString().trim().toUpperCase();
            const seccion = row['SECCION ']?.toString().trim().toUpperCase() || 'A';
            const nombreGrupo = `${grado} ${seccion}`;
            
            return {
              nie: row['NIE']?.toString().trim(),
              nombre: row['NOMBRE DEL ESTUDIANTES']?.toString().trim().toUpperCase(),
              genero: row['GENERO']?.toString().trim().toUpperCase(),
              responsable: row[' PADRE/MADRE O RESPONSABLE']?.toString().trim().toUpperCase(), 
              dui_responsable: row['DUI']?.toString().trim(),
              grupo_id: groupMap.get(nombreGrupo),
              grado: grado,
              seccion: seccion
            };
          }).filter(s => s.nie && s.nombre);

          const students = Array.from(new Map(rawStudents.map(s => [s.nie, s])).values());

          const { error: studentError } = await supabase
            .from('estudiantes')
            .upsert(students, { onConflict: 'nie' });

          if (studentError) throw studentError;
          resolve(true);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => reject(error),
    });
  });
};
