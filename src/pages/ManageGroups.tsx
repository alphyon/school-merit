import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import { 
  Card, CardBody, Button, Input, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner
} from "@heroui/react";
import { Plus, Pencil, Trash2, Layers, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const groupSchema = z.object({
  nombre: z.string().min(2, "Nombre de grupo obligatorio"),
  grado: z.string().min(1, "Grado obligatorio"),
  seccion: z.string().min(1, "Sección obligatoria"),
  turno: z.string().min(1, "Seleccione un turno")
});

export default function ManageGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onOpenChange: onDelOpenChange } = useDisclosure();
  
  const [newGroup, setNewGroup] = useState({ id: '', nombre: '', grado: '', seccion: '', turno: 'Matutino' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('grupos').select('*').order('nombre');
      setGroups(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (onClose: () => void) => {
    try {
      setErrors({});
      const result = groupSchema.safeParse(newGroup);
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
        nombre: `${newGroup.grado} "${newGroup.seccion.toUpperCase()}" (${newGroup.turno})`,
        grado: newGroup.grado,
        seccion: newGroup.seccion.toUpperCase(),
        turno: newGroup.turno
      };

      if (isEditing) await supabase.from('grupos').update(payload).eq('id', newGroup.id);
      else await supabase.from('grupos').insert(payload);
      
      setNotification({ message: "Grupo guardado", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: " + error.message, type: 'error' }); }
  };

  const handleDelete = async (onClose: () => void) => {
    if (!groupToDelete) return;
    try {
      const { error } = await supabase.from('grupos').delete().eq('id', groupToDelete);
      if (error) throw error;
      setNotification({ message: "Grupo eliminado", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { setNotification({ message: "No se puede eliminar: el grupo tiene alumnos o docentes asignados.", type: 'error' }); }
  };

  const handleOpenModal = (group?: any) => {
    setErrors({});
    if (group) { setNewGroup({ ...group }); setIsEditing(true); }
    else { setNewGroup({ id: '', nombre: '', grado: '', seccion: '', turno: 'Matutino' }); setIsEditing(false); }
    onOpen();
  };

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center mb-8 text-slate-900">
        <div><h1 className="text-3xl font-black flex items-center gap-2"><Layers className="text-[#1e3b8a]" size={32} /> Grupos</h1></div>
        <Button color="primary" className="bg-[#1e3b8a] font-black shadow-lg text-xs" startContent={<Plus size={18} />} onPress={() => handleOpenModal()}>Nuevo Grupo</Button>
      </div>

      <Card className="border-none shadow-sm bg-white min-h-[400px]">
        <CardBody className="p-0 text-slate-900">
          <Table removeWrapper aria-label="Grupos">
            <TableHeader>
              <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs">Nombre del Grupo</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs">Grado</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs text-right">Acciones</TableColumn>
            </TableHeader>
            <TableBody emptyContent={loading ? <Spinner /> : "No hay grupos registrados."}>
              {groups.map((g) => (
                <TableRow key={g.id} className="border-b border-gray-50 last:border-none">
                  <TableCell className="font-black text-xs text-[#1e3b8a]">{g.nombre}</TableCell>
                  <TableCell className="font-bold text-gray-500 text-xs">{g.grado} "{g.seccion}"</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleOpenModal(g)}><Pencil size={16} /></Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => { setGroupToDelete(g.id); onDelOpen(); }}><Trash2 size={16} /></Button>
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
              <ModalHeader className="border-b bg-gray-50 font-black text-[#1e3b8a]">{isEditing ? 'Editar' : 'Registrar'} Grupo</ModalHeader>
              <ModalBody className="py-6 space-y-4 text-slate-900">
                <Input 
                  label="Grado (Ej: 9°)" isRequired variant="bordered" value={newGroup.grado} onValueChange={(v) => setNewGroup({...newGroup, grado: v})}
                  isInvalid={!!errors.grado} errorMessage={errors.grado}
                />
                <Input 
                  label="Sección (Ej: A)" isRequired variant="bordered" value={newGroup.seccion} onValueChange={(v) => setNewGroup({...newGroup, seccion: v})} 
                  isInvalid={!!errors.seccion} errorMessage={errors.seccion}
                />
                <Select 
                  label="Turno" isRequired variant="bordered" selectedKeys={[newGroup.turno]} onSelectionChange={(k) => setNewGroup({...newGroup, turno: Array.from(k)[0] as string})}
                  isInvalid={!!errors.turno} errorMessage={errors.turno}
                >
                  <SelectItem key="Matutino" textValue="MATUTINO">MATUTINO</SelectItem>
                  <SelectItem key="Vespertino" textValue="VESPERTINO">VESPERTINO</SelectItem>
                  <SelectItem key="Nocturno" textValue="NOCTURNO">NOCTURNO</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter className="bg-gray-50 border-t p-4"><Button variant="light" onPress={onClose}>Cancelar</Button><Button color="primary" onPress={() => handleSave(onClose)} className="bg-[#1e3b8a]">Guardar</Button></ModalFooter>
            </>
        )}</ModalContent>
      </Modal>

      <Modal isOpen={isDelOpen} onOpenChange={onDelOpenChange} size="sm" backdrop="blur">
        <ModalContent>{(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center"><AlertCircle className="mx-auto text-red-500 mb-2" size={40} /><h2 className="text-xl font-black text-red-600">¿Eliminar?</h2></ModalHeader>
              <ModalBody className="text-center text-gray-500 font-bold text-sm leading-relaxed"><p>Asegúrate de que el grupo no tenga alumnos asignados.</p></ModalBody>
              <ModalFooter className="flex justify-center gap-4 p-6"><Button variant="flat" onPress={onClose}>No</Button><Button color="danger" onPress={() => handleDelete(onClose)}>Sí, eliminar</Button></ModalFooter>
            </>
        )}</ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
