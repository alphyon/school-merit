import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebar from '../components/AdminSidebar';
import { Notification } from '../components/Notification';
import { capitalizeName } from '../utils/formatUtils';
import { importStudentsFromCSV } from '../utils/importStudents';
import { 
  Card, CardBody, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  User, Badge, Input, Pagination, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner, Chip
} from "@heroui/react";
import { Search, Edit3, Trash2, FileUp, GraduationCap, Plus, Eye, ShieldAlert } from 'lucide-react';

export default function ManageStudents() {
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
        result = await supabase.rpc('buscar_estudiantes', { termino_busqueda: search.trim() })
          .select('*', { count: 'exact' } as any)
          .range(from, to);
      } else {
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
      } else {
        const { error } = await supabase.from('estudiantes').insert([studentData]);
        if (error) throw error;
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

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] text-slate-900 dark:text-slate-100 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 md:ml-64 p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
                <GraduationCap className="text-[#1e3b8a]" size={32} />
                Gestión de Estudiantes
              </h2>
            </div>
            <div className="flex gap-3">
              <Button color="primary" className="bg-[#1e3b8a] font-bold" startContent={<Plus size={18} />} onPress={handleCreateClick}>Nuevo Estudiante</Button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
              <Button variant="bordered" className="bg-white" startContent={<FileUp size={18} />} isLoading={isImporting} onPress={() => fileInputRef.current?.click()}>Importar CSV</Button>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex flex-1 gap-4">
                <Input className="max-w-xs" placeholder="Buscar..." startContent={<Search size={16} className="text-slate-400" />} size="sm" variant="flat" value={search} onValueChange={(val) => { setSearch(val); setPage(1); }} />
                <Select className="max-w-xs" size="sm" placeholder="Grupo" selectedKeys={new Set([selectedGrupo])} onSelectionChange={(keys) => { setSelectedGrupo(Array.from(keys)[0] as string); setPage(1); }}>
                  <SelectItem key="all">Todos los Grupos</SelectItem>
                  {grupos.map((g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>)}
                </Select>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase">Total: {totalStudents}</p>
            </div>
            
            <Table aria-label="Students" bottomContent={totalStudents > rowsPerPage ? <div className="flex w-full justify-center py-4"><Pagination isCompact showControls color="primary" page={page} total={Math.ceil(totalStudents / rowsPerPage)} onChange={setPage} /></div> : null}>
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
                    <TableRow key={student.id} className={isAlert ? "bg-red-50 dark:bg-red-900/20" : ""}>
                      <TableCell><div className="flex items-center gap-2"><User name={capitalizeName(student.nombre)} avatarProps={{ name: student.nombre.charAt(0), size: "sm" }} description={student.nie} />{isAlert && <ShieldAlert size={16} className="text-red-600 animate-pulse" />}</div></TableCell>
                      <TableCell className="font-mono text-xs">{student.nie}</TableCell>
                      <TableCell><Badge color="primary" variant="flat" size="sm">{student.grupo_nombre || student.grado}</Badge></TableCell>
                      <TableCell><Chip color={isAlert ? "danger" : "default"} variant={isAlert ? "solid" : "flat"} size="sm" className="font-black">{student.total_demeritos || 0}</Chip></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button isIconOnly variant="light" size="sm" color="success" onClick={() => navigate(`/student/${student.id}`)}><Eye size={18} /></Button>
                          <Button isIconOnly variant="light" size="sm" color="primary" onClick={() => handleEditClick(student)}><Edit3 size={18} /></Button>
                          <Button isIconOnly variant="light" size="sm" color="danger" onClick={() => { setSelectedStudent(student); onDeleteOpen(); }}><Trash2 size={18} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </main>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{modalMode === 'edit' ? 'Editar' : 'Registrar'}</ModalHeader>
              <ModalBody className="space-y-4">
                <Input label="Nombre" variant="bordered" value={formData.nombre} onValueChange={(val) => setFormData({...formData, nombre: val})} />
                <Input label="NIE" variant="bordered" value={formData.nie} onValueChange={(val) => setFormData({...formData, nie: val})} />
                <Select label="Grupo" variant="bordered" selectedKeys={formData.grupo_id ? new Set([formData.grupo_id]) : new Set()} onSelectionChange={(keys) => setFormData({...formData, grupo_id: Array.from(keys)[0] as string})}>
                  {grupos.map((g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>)}
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" className="bg-[#1e3b8a]" isLoading={isSubmitting} onPress={() => handleSaveStudent(onClose)}>Guardar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-red-600 font-black">⚠️ ELIMINAR</ModalHeader>
              <ModalBody>¿Estás seguro de eliminar a <strong>{selectedStudent?.nombre}</strong>?</ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="danger" variant="flat" isLoading={isSubmitting} onPress={() => confirmDeleteStudent(onClose)}>Eliminar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
