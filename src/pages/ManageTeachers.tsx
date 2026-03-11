import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { 
  Card, CardBody, Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner, Chip
} from "@heroui/react";
import { Plus, Pencil, Trash2, Users, AlertCircle, Key, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const teacherSchema = z.object({
  nombre: z.string().min(3, "Nombre muy corto (mín. 3 caracteres)"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "La contraseña debe tener al menos 6 caracteres"
  }),
  group_ids: z.array(z.string()).optional()
});

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onOpenChange: onDelOpenChange } = useDisclosure();
  const { isOpen: isPassOpen, onOpen: onPassOpen, onOpenChange: onPassOpenChange } = useDisclosure();
  
  const [newTeacher, setNewTeacher] = useState({ id: '', nombre: '', email: '', group_ids: [] as string[], password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: gData } = await supabase.from('grupos').select('*').order('nombre');
      setGroups(gData || []);
      
      const { data: tData } = await supabase.from('docentes').select('*, docentes_grupos(grupo_id), perfiles(id)').order('nombre');
      setTeachers(tData || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (onClose: () => void) => {
    try {
      setErrors({});
      
      // Validamos todo el objeto con Zod
      const result = teacherSchema.safeParse(newTeacher);
      
      // Si hay errores de Zod, los mostramos
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
        const formattedErrors: Record<string, string> = {};
        Object.keys(fieldErrors).forEach(key => {
          const messages = fieldErrors[key];
          if (messages && messages.length > 0) formattedErrors[key] = messages[0];
        });

        // Caso especial: Si es nuevo y no hay password en el objeto (Zod ya lo valida pero por si acaso)
        if (!isEditing && !newTeacher.password) {
          formattedErrors.password = "La contraseña es obligatoria para nuevos docentes";
        }

        if (Object.keys(formattedErrors).length > 0) {
          setErrors(formattedErrors);
          return;
        }
      }

      const payload = { nombre: newTeacher.nombre.trim().toUpperCase(), email: newTeacher.email.trim().toLowerCase() };
      let teacherId = newTeacher.id;

      if (isEditing) {
        const { error: uError } = await supabase.from('docentes').update(payload).eq('id', teacherId);
        if (uError) throw uError;
        await supabase.from('docentes_grupos').delete().eq('docente_id', teacherId);
      } else {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: newTeacher.email.toLowerCase(),
          password: newTeacher.password,
          email_confirm: true
        });
        if (authError) throw authError;

        const { data: tData, error: tError } = await supabase.from('docentes').insert(payload).select().single();
        if (tError) throw tError;
        teacherId = tData.id;

        const { error: pError } = await supabase.from('perfiles').insert([{
          id: authData.user!.id,
          username: newTeacher.email.toLowerCase().split('@')[0],
          full_name: newTeacher.nombre.toUpperCase(),
          role: 'docente',
          teacher_id: teacherId
        }]);
        if (pError) throw pError;
      }

      if (newTeacher.group_ids.length > 0) {
        const rels = newTeacher.group_ids.map(gid => ({ docente_id: teacherId, grupo_id: gid }));
        await supabase.from('docentes_grupos').insert(rels);
      }

      setNotification({ message: "Éxito al guardar docente", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: " + error.message, type: 'error' }); }
  };

  const confirmDelete = (id: string) => { setTeacherToDelete(id); onDelOpen(); };

  const handleDelete = async (onClose: () => void) => {
    if (!teacherToDelete) return;
    try {
      const { data: profile } = await supabase.from('perfiles').select('id').eq('teacher_id', teacherToDelete).single();
      if (profile?.id) {
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
      }
      const { error: tError } = await supabase.from('docentes').delete().eq('id', teacherToDelete);
      if (tError) throw tError;

      setNotification({ message: "Docente y cuenta eliminados", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: " + error.message, type: 'error' }); }
  };

  const handleOpenModal = (teacher?: any) => {
    setErrors({});
    if (teacher) {
      setNewTeacher({ 
        id: teacher.id, 
        nombre: teacher.nombre, 
        email: teacher.email, 
        group_ids: teacher.docentes_grupos?.map((dg: any) => dg.grupo_id) || [],
        password: '' 
      });
      setIsEditing(true);
    } else {
      setNewTeacher({ id: '', nombre: '', email: '', group_ids: [], password: '' });
      setIsEditing(false);
    }
    onOpen();
  };

  const handleResetPassword = (teacher: any) => {
    const profileId = teacher.perfiles?.[0]?.id;
    if (profileId) { setSelectedProfileId(profileId); onPassOpen(); }
    else setNotification({ message: "No hay perfil de usuario.", type: 'error' });
  };

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center mb-8 text-slate-900">
        <div><h1 className="text-3xl font-black flex items-center gap-2"><Users className="text-[#1e3b8a]" size={32} /> Docentes</h1></div>
        <Button color="primary" className="bg-[#1e3b8a] font-black shadow-lg text-xs" startContent={<Plus size={18} />} onPress={() => handleOpenModal()}>Nuevo Docente</Button>
      </div>

      <Card className="border-none shadow-sm bg-white min-h-[400px]">
        <CardBody className="p-0 text-slate-900">
          <Table removeWrapper aria-label="Docentes">
            <TableHeader>
              <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs">Nombre</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs">Email</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs">Grupos</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs text-right">Acciones</TableColumn>
            </TableHeader>
            <TableBody emptyContent={loading ? <Spinner /> : "No hay docentes."}>
              {teachers.map((t) => (
                <TableRow key={t.id} className="border-b border-gray-50 last:border-none">
                  <TableCell className="font-black text-xs">{t.nombre}</TableCell>
                  <TableCell className="text-gray-500 text-xs">{t.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {t.docentes_grupos?.length > 0 ? t.docentes_grupos.map((dg: any) => {
                        const g = groups.find(gr => gr.id === dg.grupo_id);
                        return <Chip key={dg.grupo_id} size="sm" variant="flat" color="primary" className="font-bold text-xs">{g?.nombre || '...'}</Chip>;
                      }) : <span className="text-xs text-gray-300 italic">SIN ASIGNAR</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button isIconOnly size="sm" variant="light" color="warning" onPress={() => handleResetPassword(t)}><Key size={16} /></Button>
                      <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleOpenModal(t)}><Pencil size={16} /></Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => confirmDelete(t.id)}><Trash2 size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>{(onClose) => (
            <>
              <ModalHeader className="border-b bg-gray-50 font-black text-[#1e3b8a]">{isEditing ? 'Editar' : 'Registrar'} Docente</ModalHeader>
              <ModalBody className="py-6 space-y-4 text-slate-900">
                <Input 
                  label="Nombre Completo" isRequired variant="bordered" value={newTeacher.nombre} onValueChange={(v) => setNewTeacher({...newTeacher, nombre: v})}
                  isInvalid={!!errors.nombre} errorMessage={errors.nombre}
                />
                <Input 
                  label="Email Institucional" isRequired variant="bordered" value={newTeacher.email} onValueChange={(v) => setNewTeacher({...newTeacher, email: v})} 
                  isInvalid={!!errors.email} errorMessage={errors.email}
                />
                {!isEditing && (
                  <Input 
                    label="Contraseña" isRequired variant="bordered" type={isPasswordVisible ? "text" : "password"} value={newTeacher.password} onValueChange={(v) => setNewTeacher({...newTeacher, password: v})} 
                    isInvalid={!!errors.password} errorMessage={errors.password}
                    endContent={<button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)}>{isPasswordVisible ? <EyeOff size={20} className="text-slate-400" /> : <Eye size={20} className="text-slate-400" />}</button>} 
                  />
                )}
                <div className="space-y-2">
                  <p className="text-xs font-black text-gray-400">Grupos Asignados</p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-3 rounded-xl">
                    {groups.map(g => (
                      <label key={g.id} className="flex items-center gap-2 text-xs font-bold cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input type="checkbox" checked={newTeacher.group_ids.includes(g.id)} onChange={(e) => {
                            const ids = e.target.checked ? [...newTeacher.group_ids, g.id] : newTeacher.group_ids.filter(id => id !== g.id);
                            setNewTeacher({...newTeacher, group_ids: ids});
                          }} /> {g.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="bg-gray-50 border-t p-4"><Button variant="light" onPress={onClose}>Cancelar</Button><Button color="primary" onPress={() => handleSave(onClose)} className="bg-[#1e3b8a]">Guardar</Button></ModalFooter>
            </>
        )}</ModalContent>
      </Modal>

      <ChangePasswordModal isOpen={isPassOpen} onOpenChange={onPassOpenChange} targetUserId={selectedProfileId} />
      <Modal isOpen={isDelOpen} onOpenChange={onDelOpenChange} size="sm" backdrop="blur">
        <ModalContent>{(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center"><AlertCircle className="mx-auto text-red-500 mb-2" size={40} /><h2 className="text-xl font-black text-red-600">¿Eliminar?</h2></ModalHeader>
              <ModalBody className="text-center text-gray-500 font-bold text-sm leading-relaxed"><p>Se perderá la cuenta de acceso y grupos vinculados.</p></ModalBody>
              <ModalFooter className="flex justify-center gap-4 p-6"><Button variant="flat" onPress={onClose}>No</Button><Button color="danger" onPress={() => handleDelete(onClose)}>Sí, eliminar</Button></ModalFooter>
            </>
        )}</ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
