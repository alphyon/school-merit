import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { 
  Card, CardBody, Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner, Avatar
} from "@heroui/react";
import { Plus, Trash2, ShieldCheck, AlertCircle, Key, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const adminSchema = z.object({
  nombre: z.string().min(3, "Nombre muy corto (mín. 3 caracteres)"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

export default function ManageAdmins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onOpenChange: onDelOpenChange } = useDisclosure();
  const { isOpen: isPassOpen, onOpen: onPassOpen, onOpenChange: onPassOpenChange } = useDisclosure();
  
  const [newAdmin, setNewAdmin] = useState({ id: '', nombre: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adminToDelete, setAdminToDelete] = useState<any>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('perfiles').select('*').eq('role', 'admin').order('full_name');
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (onClose: () => void) => {
    try {
      setErrors({});
      const result = adminSchema.safeParse(newAdmin);
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

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: newAdmin.email.toLowerCase(),
        password: newAdmin.password,
        email_confirm: true
      });
      if (authError) throw authError;

      const { error: pError } = await supabase.from('perfiles').insert([{
        id: authData.user!.id,
        username: newAdmin.email.toLowerCase(),
        full_name: newAdmin.nombre.toUpperCase(),
        role: 'admin'
      }]);
      if (pError) throw pError;

      setNotification({ message: "Administrador registrado con éxito", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: " + error.message, type: 'error' }); }
  };

  const handleDelete = async (onClose: () => void) => {
    if (!adminToDelete) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === adminToDelete.id) throw new Error("No puedes eliminar tu propia cuenta.");

      await supabaseAdmin.auth.admin.deleteUser(adminToDelete.id);
      await supabase.from('perfiles').delete().eq('id', adminToDelete.id);

      setNotification({ message: "Administrador eliminado", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: " + error.message, type: 'error' }); }
  };

  const handleOpenModal = () => {
    setErrors({});
    setNewAdmin({ id: '', nombre: '', email: '', password: '' });
    onOpen();
  };

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center mb-8 text-slate-900">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2 uppercase"><ShieldCheck className="text-[#1e3b8a]" size={32} /> Administradores</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Gestión de privilegios</p>
        </div>
        <Button color="primary" className="bg-[#1e3b8a] font-black uppercase shadow-lg text-xs" startContent={<Plus size={18} />} onPress={handleOpenModal}>Nuevo Admin</Button>
      </div>

      <Card className="border-none shadow-sm bg-white min-h-[400px]">
        <CardBody className="p-0 text-slate-900">
          <Table removeWrapper aria-label="Administradores">
            <TableHeader>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase text-xs">Administrador</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase text-xs">Correo</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase text-xs text-right">Acciones</TableColumn>
            </TableHeader>
            <TableBody emptyContent={loading ? <Spinner /> : "No hay otros administradores."}>
              {admins.map((admin) => (
                <TableRow key={admin.id} className="border-b border-gray-50 last:border-none">
                  <TableCell><div className="flex items-center gap-3"><Avatar name={admin.full_name?.charAt(0)} size="sm" className="bg-blue-100 text-[#1e3b8a] font-black" /><span className="font-black uppercase text-xs">{admin.full_name}</span></div></TableCell>
                  <TableCell className="text-gray-500 text-xs">{admin.username}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button isIconOnly size="sm" variant="light" color="warning" onPress={() => { setSelectedProfileId(admin.id); onPassOpen(); }}><Key size={16} /></Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => { setAdminToDelete(admin); onDelOpen(); }}><Trash2 size={16} /></Button>
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
              <ModalHeader className="border-b bg-gray-50 font-black uppercase text-[#1e3b8a]">Registrar Administrador</ModalHeader>
              <ModalBody className="py-6 space-y-4 text-slate-900">
                <Input 
                  label="Nombre Completo" isRequired variant="bordered" value={newAdmin.nombre} onValueChange={(v) => setNewAdmin({...newAdmin, nombre: v})}
                  isInvalid={!!errors.nombre} errorMessage={errors.nombre}
                />
                <Input 
                  label="Correo Electrónico" isRequired variant="bordered" type="email" value={newAdmin.email} onValueChange={(v) => setNewAdmin({...newAdmin, email: v})} 
                  isInvalid={!!errors.email} errorMessage={errors.email}
                />
                <Input 
                  label="Contraseña" isRequired variant="bordered" type={isPasswordVisible ? "text" : "password"} value={newAdmin.password} onValueChange={(v) => setNewAdmin({...newAdmin, password: v})} 
                  isInvalid={!!errors.password} errorMessage={errors.password}
                  endContent={<button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)}>{isPasswordVisible ? <EyeOff size={20} className="text-slate-400" /> : <Eye size={20} className="text-slate-400" />}</button>} 
                />
              </ModalBody>
              <ModalFooter className="bg-gray-50 border-t p-4"><Button variant="light" onPress={onClose}>Cancelar</Button><Button color="primary" onPress={() => handleSave(onClose)} className="bg-[#1e3b8a]">Guardar</Button></ModalFooter>
            </>
        )}</ModalContent>
      </Modal>

      <ChangePasswordModal isOpen={isPassOpen} onOpenChange={onPassOpenChange} targetUserId={selectedProfileId} />
      <Modal isOpen={isDelOpen} onOpenChange={onDelOpenChange} size="sm" backdrop="blur">
        <ModalContent>{(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center"><AlertCircle className="mx-auto text-red-500 mb-2" size={40} /><h2 className="text-xl font-black uppercase text-red-600">¿Eliminar?</h2></ModalHeader>
              <ModalBody className="text-center text-gray-500 font-bold text-sm leading-relaxed"><p>Quitarás el acceso administrativo a <strong>{adminToDelete?.full_name}</strong>.</p></ModalBody>
              <ModalFooter className="flex justify-center gap-4 p-6"><Button variant="flat" onPress={onClose}>No</Button><Button color="danger" onPress={() => handleDelete(onClose)}>Sí, eliminar</Button></ModalFooter>
            </>
        )}</ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
