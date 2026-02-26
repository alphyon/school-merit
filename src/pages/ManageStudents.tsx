import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import { capitalizeName } from '../utils/formatUtils';
import { importStudentsFromCSV } from '../utils/importStudents';
import { 
  Card, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  User, Badge, Input, Pagination, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner, Chip
} from "@heroui/react";
import { Search, Edit3, Trash2, FileUp, Plus, Eye, ShieldAlert } from 'lucide-react';

export default function ManageStudents() {
  // ... (Mantener estados existentes)
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const {isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange} = useDisclosure();
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [alertLimit, setAlertLimit] = useState(10);
  
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', nie: '', grupo_id: '' });
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ... (Mantener funciones fetchData, handles, etc. igual que antes)
  const fetchGrupos = async () => {
    const { data } = await supabase.from('grupos').select('*').order('nombre');
    setGrupos(data || []);
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const { data: config } = await supabase.from('configuracion_sistema').select('limite_demeritos_alerta').single();
      if (config) setAlertLimit(config.limite_demeritos_alerta);

      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      let result;
      if (search) {
        // @ts-ignore
        result = await supabase.rpc('buscar_estudiantes', { termino_busqueda: search.trim() }).select('*', { count: 'exact' }).range(from, to);
      } else {
        // @ts-ignore
        let query = supabase.from('estudiantes_reporte').select('*', { count: 'exact' });
        if (selectedGrupo !== "all") query = query.eq('grupo_id', selectedGrupo);
        result = await query.order('nombre', { ascending: true }).range(from, to);
      }

      if (result.error) throw result.error;
      setStudentsList(result.data || []);
      setTotalStudents(result.count || 0);
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGrupos(); }, []);
  useEffect(() => { fetchStudents(); }, [page, search, selectedGrupo]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        await importStudentsFromCSV(content);
        setNotification({ message: "Éxito!", type: 'success' });
        fetchStudents(); 
      } catch (error: any) {
        setNotification({ message: "Error: " + error.message, type: 'error' });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleCreateClick = () => {
    setModalMode('create');
    setSelectedStudent(null);
    setFormData({ nombre: '', nie: '', grupo_id: '' });
    onOpen();
  };

  const handleEditClick = (student: any) => {
    setModalMode('edit');
    setSelectedStudent(student);
    setFormData({ nombre: student.nombre, nie: student.nie, grupo_id: student.grupo_id || '' });
    onOpen();
  };

  const handleSaveStudent = async (onClose: () => void) => {
    if (!formData.nombre || !formData.nie || !formData.grupo_id) {
      setNotification({ message: "Llene todos los campos", type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedGroupObj = grupos.find(g => g.id === formData.grupo_id);
      const studentData = {
        nombre: formData.nombre.toUpperCase().trim(),
        nie: formData.nie.trim(),
        grupo_id: formData.grupo_id,
        grado: selectedGroupObj?.grado || '',
        seccion: selectedGroupObj?.seccion || ''
      };
      if (modalMode === 'edit') {
        const { error } = await supabase.from('estudiantes').update(studentData).eq('id', selectedStudent.id);
        if (error) throw error;
        setNotification({ message: "Actualizado", type: 'success' });
      } else {
        const { error } = await supabase.from('estudiantes').insert([studentData]);
        if (error) throw error;
        setNotification({ message: "Creado", type: 'success' });
      }
      fetchStudents();
      onClose();
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  const confirmDeleteStudent = async (onClose: () => void) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('estudiantes').delete().eq('id', selectedStudent.id);
      if (error) throw error;
      setNotification({ message: "Eliminado", type: 'success' });
      fetchStudents();
      onClose();
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteClick = (student: any) => {
    setSelectedStudent(student);
    onDeleteOpen();
  };

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Estudiantes</h1>
          <p className="text-gray-500 font-medium text-sm">Directorio oficial y gestión académica</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button color="primary" className="bg-[#1e3b8a] font-bold shadow-lg shadow-blue-900/20 flex-1 md:flex-none" startContent={<Plus size={18} />} onPress={handleCreateClick}>Nuevo</Button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          <Button variant="bordered" className="bg-white border-gray-200 font-bold text-gray-700 flex-1 md:flex-none" startContent={<FileUp size={18} />} isLoading={isImporting} onPress={() => fileInputRef.current?.click()}>Importar CSV</Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row flex-1 gap-3 w-full">
            <Input 
              className="w-full sm:max-w-xs" 
              placeholder="Buscar por nombre..." 
              startContent={<Search size={18} className="text-gray-400" />} 
              size="md" 
              variant="bordered" 
              value={search} 
              onValueChange={(val) => { setSearch(val); setPage(1); }} 
            />
            <Select 
              className="w-full sm:max-w-xs" 
              size="md" 
              placeholder="Filtrar por Grupo" 
              variant="bordered"
              selectedKeys={new Set([selectedGrupo])} 
              onSelectionChange={(keys) => { setSelectedGrupo(Array.from(keys)[0] as string); setPage(1); }}
              items={[{id: 'all', nombre: 'Todos'}, ...grupos]}
            >
              {(item) => <SelectItem key={item.id}>{item.nombre}</SelectItem>}
            </Select>
          </div>
          <Chip variant="flat" color="primary" className="font-bold">Total: {totalStudents}</Chip>
        </div>
        
        {/* TABLA RESPONSIVA VERDADERA */}
        <div className="w-full overflow-x-auto">
          <Table 
            aria-label="Students" 
            shadow="none"
            classNames={{
              wrapper: "min-w-[800px] p-0 shadow-none", // Forzar ancho mínimo
              th: "bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider h-12",
              td: "border-b border-gray-50 h-16"
            }}
          >
            <TableHeader>
              <TableColumn>ESTUDIANTE</TableColumn>
              <TableColumn>NIE</TableColumn>
              <TableColumn>GRUPO</TableColumn>
              <TableColumn>FALTAS</TableColumn>
              <TableColumn align="end">ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} loadingContent={<Spinner />}>
              {studentsList.map((student) => {
                const isAlert = student.total_demeritos >= alertLimit;
                return (
                  <TableRow key={student.id} className={isAlert ? "bg-red-50/50" : "hover:bg-gray-50"}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <User 
                          name={capitalizeName(student.nombre)} 
                          avatarProps={{ name: student.nombre.charAt(0), size: "sm", className: isAlert ? "bg-red-100 text-red-600" : "bg-blue-100 text-[#1e3b8a]" }} 
                          classNames={{ name: "font-bold text-gray-900", description: "text-gray-400" }}
                        />
                        {isAlert && <ShieldAlert size={16} className="text-red-500 animate-pulse" />}
                      </div>
                    </TableCell>
                    <TableCell><span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{student.nie}</span></TableCell>
                    <TableCell><Badge color="primary" variant="flat" size="sm" className="font-bold border-none">{student.grupo_nombre || student.grado}</Badge></TableCell>
                    <TableCell>
                      <Chip color={isAlert ? "danger" : "default"} variant={isAlert ? "solid" : "flat"} size="sm" className="font-black min-w-[40px] text-center">
                        {student.total_demeritos || 0}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button isIconOnly variant="light" size="sm" className="text-gray-400 hover:text-blue-600" onClick={() => navigate(`/student/${student.id}`)}><Eye size={18} /></Button>
                        <Button isIconOnly variant="light" size="sm" className="text-gray-400 hover:text-orange-500" onClick={() => handleEditClick(student)}><Edit3 size={18} /></Button>
                        <Button isIconOnly variant="light" size="sm" className="text-gray-400 hover:text-red-500" onClick={() => handleDeleteClick(student)}><Trash2 size={18} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* PAGINACIÓN EXTERNA Y LIMPIA */}
        {totalStudents > rowsPerPage && (
          <div className="flex w-full justify-center py-6 border-t border-gray-100 bg-white">
            <Pagination 
              isCompact 
              showControls 
              color="primary" 
              page={page} 
              total={Math.ceil(totalStudents / rowsPerPage)} 
              onChange={setPage}
              classNames={{
                cursor: "bg-[#1e3b8a] shadow-lg shadow-blue-900/20 font-bold"
              }}
            />
          </div>
        )}
      </Card>

      {/* Modals remain the same... */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
        <ModalContent>{(onClose) => (
          <><ModalHeader>{modalMode === 'edit' ? 'Editar' : 'Registrar'}</ModalHeader><ModalBody className="space-y-4">
            <Input label="Nombre" variant="bordered" value={formData.nombre} onValueChange={(val) => setFormData({...formData, nombre: val})} />
            <Input label="NIE" variant="bordered" value={formData.nie} onValueChange={(val) => setFormData({...formData, nie: val})} />
            <Select label="Grupo" variant="bordered" selectedKeys={formData.grupo_id ? new Set([formData.grupo_id]) : new Set()} onSelectionChange={(keys) => setFormData({...formData, grupo_id: Array.from(keys)[0] as string})}>
              {grupos.map((g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>)}
            </Select></ModalBody><ModalFooter><Button variant="light" onPress={onClose}>Cancelar</Button><Button color="primary" className="bg-[#1e3b8a]" isLoading={isSubmitting} onPress={() => handleSaveStudent(onClose)}>Guardar</Button></ModalFooter></>
        )}</ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} backdrop="blur">
        <ModalContent>{(onClose) => (
          <><ModalHeader className="text-red-600 font-black">⚠️ ELIMINAR</ModalHeader><ModalBody>¿Borrar a <strong>{selectedStudent?.nombre}</strong>?</ModalBody><ModalFooter><Button variant="light" onPress={onClose}>No</Button><Button color="danger" variant="flat" isLoading={isSubmitting} onPress={() => confirmDeleteStudent(onClose)}>Eliminar</Button></ModalFooter></>
        )}</ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
