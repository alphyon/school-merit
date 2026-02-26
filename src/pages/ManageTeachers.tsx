import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../components/Notification';
import DashboardLayout from '../layouts/DashboardLayout';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { 
  Card, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Select, SelectItem, Avatar, Badge, Spinner, Chip
} from "@heroui/react";
import { Plus, Edit3, Trash2, Key, EyeOff, Shield, ShieldAlert, BadgeCheck, Eye } from 'lucide-react';

export default function ManageTeachers() {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const {isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange} = useDisclosure();
  const {isOpen: isPasswordOpen, onOpen: onPasswordOpen, onOpenChange: onPasswordOpenChange} = useDisclosure();
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', grupo_ids: [] as string[], password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: tData } = await supabase.from('docentes_reporte').select('*, docentes_grupos(grupo_id, grupos(nombre)), perfiles(id)').order('nombre');
      const { data: gData } = await supabase.from('grupos').select('*').order('nombre');
      setTeachers(tData || []);
      setGrupos(gData || []);
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateClick = () => {
    setModalMode('create');
    setSelectedTeacher(null);
    setFormData({ nombre: '', email: '', grupo_ids: [], password: '' });
    onOpen();
  };

  const handleEditClick = (teacher: any) => {
    setModalMode('edit');
    setSelectedTeacher(teacher);
    setFormData({
      nombre: teacher.nombre,
      email: teacher.email,
      grupo_ids: teacher.docentes_grupos?.map((dg: any) => dg.grupo_id) || [],
      password: ''
    });
    onOpen();
  };

  const handleSaveTeacher = async (onClose: () => void) => {
    if (!formData.nombre || !formData.email || (modalMode === 'create' && !formData.password)) {
      setNotification({ message: "Llene todos los campos", type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      let teacherId = selectedTeacher?.id;
      if (modalMode === 'create') {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email: formData.email, password: formData.password });
        if (authError) throw authError;
        const { data: tData, error: tError } = await supabase.from('docentes').insert([{ nombre: formData.nombre, email: formData.email }]).select().single();
        if (tError) throw tError;
        teacherId = tData.id;
        await supabase.from('perfiles').insert([{ id: authData.user!.id, username: formData.email.split('@')[0], full_name: formData.nombre, role: 'docente', teacher_id: teacherId }]);
      } else {
        await supabase.from('docentes').update({ nombre: formData.nombre, email: formData.email }).eq('id', teacherId);
      }
      await supabase.from('docentes_grupos').delete().eq('docente_id', teacherId);
      const relations = formData.grupo_ids.map(gid => ({ docente_id: teacherId, grupo_id: gid }));
      await supabase.from('docentes_grupos').insert(relations);
      setNotification({ message: "Éxito", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteTeacher = async (onClose: () => void) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('docentes').delete().eq('id', selectedTeacher.id);
      if (error) throw error;
      setNotification({ message: "Eliminado", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
            <Shield className="text-[#1e3b8a]" size={32} /> Docentes
          </h1>
          <p className="text-gray-500 font-medium text-sm">Control de personal y efectividad pedagógica</p>
        </div>
        <Button color="primary" className="bg-[#1e3b8a] font-bold shadow-lg" startContent={<Plus size={18} />} onPress={handleCreateClick}>Nuevo Docente</Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="w-full overflow-x-auto">
          <Table aria-label="Docentes" shadow="none" classNames={{ wrapper: "min-w-[900px] p-0 shadow-none", th: "bg-gray-50 text-gray-500 font-bold h-12" }}>
            <TableHeader>
              <TableColumn>NOMBRE</TableColumn>
              <TableColumn>GRUPOS</TableColumn>
              <TableColumn align="center">FALTAS</TableColumn>
              <TableColumn align="center">MÉRITOS</TableColumn>
              <TableColumn align="end">ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} loadingContent={<Spinner />}>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id} className="hover:bg-gray-50 border-b border-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={teacher.nombre.charAt(0)} size="sm" className="bg-blue-100 text-[#1e3b8a] font-bold" />
                      <div>
                        <p className="font-bold text-gray-900">{teacher.nombre}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{teacher.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {teacher.docentes_grupos?.map((dg: any) => <Badge key={dg.grupos?.nombre} color="primary" variant="flat" size="sm" className="font-bold border-none uppercase text-[9px]">{dg.grupos?.nombre}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip variant="flat" color="danger" size="sm" className="font-black h-7" startContent={<ShieldAlert size={12}/>}>
                      {teacher.total_demeritos}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip variant="flat" color="success" size="sm" className="font-black h-7" startContent={<BadgeCheck size={12}/>}>
                      {teacher.total_redenciones}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button isIconOnly variant="light" size="sm" className="text-orange-400 hover:text-orange-600" onClick={() => { setSelectedTeacher(teacher); onPasswordOpen(); }} title="Resetear Clave"><Key size={18} /></Button>
                      <Button isIconOnly variant="light" size="sm" className="text-blue-400 hover:text-blue-600" onPress={() => handleEditClick(teacher)}><Edit3 size={18} /></Button>
                      <Button isIconOnly variant="light" size="sm" className="text-red-400 hover:text-red-600" onPress={() => { setSelectedTeacher(teacher); onDeleteOpen(); }}><Trash2 size={18} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
        <ModalContent>{(onClose) => (
          <><ModalHeader className="font-black uppercase">{modalMode === 'edit' ? 'Editar' : 'Registrar'}</ModalHeader><ModalBody className="space-y-4">
            <Input label="Nombre" variant="bordered" value={formData.nombre} onValueChange={(v) => setFormData({...formData, nombre: v})} />
            <Input label="Email" variant="bordered" value={formData.email} onValueChange={(v) => setFormData({...formData, email: v})} />
            {modalMode === 'create' && <Input label="Pass" type={isPasswordVisible ? "text" : "password"} variant="bordered" value={formData.password} onValueChange={(v) => setFormData({...formData, password: v})} endContent={<button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)}>{isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}</button>} />}
            <Select label="Grupos" variant="bordered" selectionMode="multiple" selectedKeys={new Set(formData.grupo_ids)} onSelectionChange={(keys) => setFormData({...formData, grupo_ids: Array.from(keys) as string[]})} items={grupos}>
              {(g) => <SelectItem key={g.id}>{g.nombre}</SelectItem>}
            </Select></ModalBody><ModalFooter><Button variant="light" onPress={onClose}>Cerrar</Button><Button color="primary" className="bg-[#1e3b8a] font-black uppercase text-xs h-12 px-8" isLoading={isSubmitting} onPress={() => handleSaveTeacher(onClose)}>Guardar</Button></ModalFooter></>
        )}</ModalContent>
      </Modal>
      <ChangePasswordModal isOpen={isPasswordOpen} onOpenChange={onPasswordOpenChange} targetUserId={selectedTeacher?.perfiles?.[0]?.id} />
      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} backdrop="blur"><ModalContent>{(onClose) => (
        <><ModalHeader className="text-red-600 font-black">ELIMINAR</ModalHeader><ModalBody>¿Borrar a <strong>{selectedTeacher?.nombre}</strong>?</ModalBody><ModalFooter><Button variant="light" onPress={onClose}>No</Button><Button color="danger" variant="flat" isLoading={isSubmitting} onPress={() => handleDeleteTeacher(onClose)}>Eliminar</Button></ModalFooter></>
      )}</ModalContent></Modal>
    </DashboardLayout>
  );
}
