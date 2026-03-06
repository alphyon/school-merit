import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import { 
  Card, CardBody, Button, Input, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Pagination, Spinner, Chip
} from "@heroui/react";
import { Plus, Search, Pencil, Trash2, Users, FileSpreadsheet, Filter, Eye, AlertCircle } from 'lucide-react';
import { importStudentsFromCSV, type ImportResult } from '../utils/importStudents';
import { z } from 'zod';

// Esquema de validación con Zod
const studentSchema = z.object({
  nie: z.string().min(1, "El NIE es obligatorio"),
  nombre: z.string().min(3, "Nombre muy corto (mín. 3 caracteres)"),
  responsable: z.string().min(3, "Nombre de responsable obligatorio"),
  dui_responsable: z.string().min(1, "El DUI es obligatorio"),
  grupo_id: z.string().min(1, "Debe seleccionar un grupo"),
  genero: z.string().min(1, "Seleccione un género"),
  turno: z.string().min(1, "Seleccione un turno"),
  estado: z.string().min(1, "Seleccione un estado"),
  telefono_responsable: z.string().optional()
});

export default function ManageStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("activo");
  const [page, setPage] = useState(1);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onOpenChange: onDelOpenChange } = useDisclosure();
  
  const [newStudent, setNewStudent] = useState({ 
    id: '', 
    nombre: '', 
    nie: '', 
    grupo_id: '', 
    genero: '', 
    turno: 'Matutino', 
    estado: 'activo',
    responsable: '',
    telefono_responsable: '',
    dui_responsable: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: gData } = await supabase.from('grupos').select('*').order('nombre');
      setGroups(gData || []);
      
      let query = supabase.from('estudiantes').select('*, grupos(nombre)').order('nombre');
      if (searchTerm) query = query.or(`nombre.ilike.%${searchTerm}%,nie.ilike.%${searchTerm}%`);
      if (selectedGroupFilter) query = query.eq('grupo_id', selectedGroupFilter);
      if (selectedStatusFilter) query = query.eq('estado', selectedStatusFilter);
      
      const { data: sData } = await query;
      setStudents(sData || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [searchTerm, selectedGroupFilter, selectedStatusFilter]);

  const handleSave = async (onClose: () => void) => {
    try {
      setErrors({});
      const result = studentSchema.safeParse(newStudent);
      
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
        const formattedErrors: Record<string, string> = {};
        Object.keys(fieldErrors).forEach(key => {
          const messages = fieldErrors[key];
          if (messages && messages.length > 0) {
            formattedErrors[key] = messages[0];
          }
        });
        setErrors(formattedErrors);
        return;
      }

      const payload = { 
        nombre: newStudent.nombre.trim().toUpperCase(), 
        nie: newStudent.nie.trim(), 
        grupo_id: newStudent.grupo_id, 
        genero: newStudent.genero, 
        turno: newStudent.turno, 
        estado: newStudent.estado,
        responsable: newStudent.responsable.trim().toUpperCase(),
        telefono_responsable: newStudent.telefono_responsable.trim(),
        dui_responsable: newStudent.dui_responsable.trim()
      };

      if (isEditing) await supabase.from('estudiantes').update(payload).eq('id', newStudent.id);
      else await supabase.from('estudiantes').insert(payload);
      
      setNotification({ message: "Guardado exitosamente", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { 
      setNotification({ message: "Error: " + error.message, type: 'error' }); 
    }
  };

  const confirmDelete = (id: string) => { setStudentToDelete(id); onDelOpen(); };

  const handleDelete = async (onClose: () => void) => {
    if (!studentToDelete) return;
    try {
      await supabase.from('estudiantes').delete().eq('id', studentToDelete);
      setNotification({ message: "Estudiante eliminado", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: " + error.message, type: 'error' }); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const result: ImportResult = await importStudentsFromCSV(file);
      if (result.success) { setNotification({ message: `Importación exitosa: ${result.count} alumnos.`, type: 'success' }); fetchData(); }
      else setNotification({ message: "Error en CSV: " + result.error, type: 'error' });
    } catch (err: any) { setNotification({ message: "Fallo: " + err.message, type: 'error' }); } finally { setIsImporting(false); }
  };

  const handleOpenModal = (student?: any) => {
    setErrors({});
    if (student) { setNewStudent({ ...student }); setIsEditing(true); }
    else { 
      setNewStudent({ 
        id: '', nombre: '', nie: '', grupo_id: '', genero: '', turno: 'Matutino', estado: 'activo',
        responsable: '', telefono_responsable: '', dui_responsable: ''
      }); 
      setIsEditing(false); 
    }
    onOpen();
  };

  const itemsPerPage = 15;
  const paginatedStudents = students.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-slate-900">
        <div><h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-2"><Users className="text-[#1e3b8a]" size={32} /> Estudiantes</h1></div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
            <Button as="span" variant="flat" color="success" isLoading={isImporting} startContent={<FileSpreadsheet size={18} />} className="font-black uppercase text-xs">Cargar CSV</Button>
          </label>
          <Button color="primary" className="bg-[#1e3b8a] font-black uppercase shadow-lg text-xs" startContent={<Plus size={18} />} onPress={() => handleOpenModal()}>Nuevo Alumno</Button>
        </div>
      </div>

      <Card className="mb-6 border-none shadow-sm bg-white">
        <CardBody className="p-4 flex flex-col md:flex-row gap-4">
          <Input className="flex-1" startContent={<Search size={18} className="text-gray-400" />} placeholder="Buscar por NIE o Nombre..." variant="bordered" value={searchTerm} onValueChange={setSearchTerm} />
          <Select 
            aria-label="Estado"
            className="w-full md:w-48" placeholder="Estado" variant="bordered" 
            selectedKeys={[selectedStatusFilter]} onSelectionChange={(keys) => setSelectedStatusFilter(Array.from(keys)[0] as string)}
          >
            <SelectItem key="activo" textValue="Activos">Solo Activos</SelectItem>
            <SelectItem key="inactivo" textValue="Inactivos">Desmatriculados</SelectItem>
          </Select>
          <Select 
            aria-label="Grupo"
            className="w-full md:w-64" placeholder="Filtrar por Grupo" startContent={<Filter size={16} />} variant="bordered" 
            selectedKeys={selectedGroupFilter ? [selectedGroupFilter] : []} onSelectionChange={(keys) => setSelectedGroupFilter(Array.from(keys)[0] as string)}
            items={[{id: "", nombre: "Todos los Grupos"}, ...groups]}
          >
            {(g) => <SelectItem key={g.id} textValue={g.nombre}>{g.nombre}</SelectItem>}
          </Select>
        </CardBody>
      </Card>

      <Card className="border-none shadow-sm bg-white min-h-[400px]">
        <CardBody className="p-0 text-slate-900 text-xs">
          <Table removeWrapper aria-label="Estudiantes">
            <TableHeader>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase">NIE</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase">Nombre Completo</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase">Estado</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase text-right">Acciones</TableColumn>
            </TableHeader>
            <TableBody emptyContent={loading ? <Spinner /> : "No hay resultados."}>
              {paginatedStudents.map((s) => (
                <TableRow key={s.id} className="border-b border-gray-50 last:border-none hover:bg-gray-50/50">
                  <TableCell className="font-bold text-gray-500 font-mono">{s.nie}</TableCell>
                  <TableCell><button onClick={() => navigate(`/student/${s.id}`)} className="font-black text-gray-900 uppercase hover:text-blue-700 text-left">{s.nombre}</button></TableCell>
                  <TableCell><Chip size="sm" variant="flat" color={s.estado === 'activo' ? 'success' : 'default'} className="font-black uppercase text-[8px]">{s.estado}</Chip></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => navigate(`/student/${s.id}`)}><Eye size={16} /></Button>
                      <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleOpenModal(s)}><Pencil size={16} /></Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => confirmDelete(s.id)}><Trash2 size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-center p-6 border-t border-gray-50">
            <Pagination total={Math.ceil(students.length / itemsPerPage)} page={page} onChange={setPage} color="primary" size="sm" showControls />
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b bg-gray-50 font-black uppercase text-[#1e3b8a]">Ficha de Estudiante</ModalHeader>
              <ModalBody className="py-6 space-y-4 text-slate-900 overflow-y-auto max-h-[70vh]">
                <Input 
                  label="NIE" isRequired variant="bordered" value={newStudent.nie} onValueChange={(v) => setNewStudent({...newStudent, nie: v})}
                  isInvalid={!!errors.nie} errorMessage={errors.nie}
                />
                <Input 
                  label="Nombre Estudiante" isRequired variant="bordered" value={newStudent.nombre} onValueChange={(v) => setNewStudent({...newStudent, nombre: v})} 
                  isInvalid={!!errors.nombre} errorMessage={errors.nombre}
                />
                
                <Input 
                  label="Nombre del Responsable" isRequired variant="bordered" value={newStudent.responsable} onValueChange={(v) => setNewStudent({...newStudent, responsable: v})} 
                  isInvalid={!!errors.responsable} errorMessage={errors.responsable}
                />
                <Input 
                  label="DUI del Responsable" isRequired variant="bordered" value={newStudent.dui_responsable} onValueChange={(v) => setNewStudent({...newStudent, dui_responsable: v})} 
                  isInvalid={!!errors.dui_responsable} errorMessage={errors.dui_responsable}
                />
                <Input label="Teléfono de Contacto" variant="bordered" value={newStudent.telefono_responsable} onValueChange={(v) => setNewStudent({...newStudent, telefono_responsable: v})} />

                <Select 
                  label="Sección / Grupo" isRequired variant="bordered" selectedKeys={newStudent.grupo_id ? [newStudent.grupo_id] : []} onSelectionChange={(keys) => setNewStudent({...newStudent, grupo_id: Array.from(keys)[0] as string})} items={groups}
                  isInvalid={!!errors.grupo_id} errorMessage={errors.grupo_id}
                >
                  {(g) => <SelectItem key={g.id} textValue={g.nombre}>{g.nombre}</SelectItem>}
                </Select>

                <Select 
                  label="Estado de Matrícula" isRequired variant="bordered" selectedKeys={[newStudent.estado]} onSelectionChange={(keys) => setNewStudent({...newStudent, estado: Array.from(keys)[0] as string})}
                  isInvalid={!!errors.estado} errorMessage={errors.estado}
                >
                  <SelectItem key="activo" textValue="ACTIVO">ACTIVO</SelectItem>
                  <SelectItem key="inactivo" textValue="INACTIVO">INACTIVO</SelectItem>
                </Select>

                <Select 
                  label="Género" isRequired variant="bordered" selectedKeys={newStudent.genero ? [newStudent.genero] : []} onSelectionChange={(keys) => setNewStudent({...newStudent, genero: Array.from(keys)[0] as string})}
                  isInvalid={!!errors.genero} errorMessage={errors.genero}
                >
                  <SelectItem key="M" textValue="MASCULINO">MASCULINO</SelectItem>
                  <SelectItem key="F" textValue="FEMENINO">FEMENINO</SelectItem>
                </Select>

                <Select 
                  label="Turno" isRequired variant="bordered" selectedKeys={newStudent.turno ? [newStudent.turno] : []} onSelectionChange={(keys) => setNewStudent({...newStudent, turno: Array.from(keys)[0] as string})}
                  isInvalid={!!errors.turno} errorMessage={errors.turno}
                >
                  <SelectItem key="Matutino" textValue="MATUTINO">MATUTINO</SelectItem>
                  <SelectItem key="Vespertino" textValue="VESPERTINO">VESPERTINO</SelectItem>
                  <SelectItem key="Nocturno" textValue="NOCTURNO">NOCTURNO</SelectItem>
                  <SelectItem key="Distancia" textValue="DISTANCIA">DISTANCIA</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter className="bg-gray-50 border-t p-4"><Button variant="light" onPress={onClose} className="font-bold">Cerrar</Button><Button color="primary" onPress={() => handleSave(onClose)} className="bg-[#1e3b8a] font-black uppercase text-xs">Guardar</Button></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDelOpen} onOpenChange={onDelOpenChange} size="sm" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center"><AlertCircle className="mx-auto text-red-500 mb-2" size={40} /><h2 className="text-xl font-black uppercase text-red-600">¿Confirmar?</h2></ModalHeader>
              <ModalBody className="text-center text-gray-500 font-bold text-sm leading-relaxed"><p>Esta acción es permanente y borrará todo el historial del estudiante.</p></ModalBody>
              <ModalFooter className="flex justify-center gap-4 p-6"><Button variant="flat" onPress={onClose} className="font-black">No</Button><Button color="danger" onPress={() => handleDelete(onClose)} className="font-black uppercase text-xs">Eliminar</Button></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
