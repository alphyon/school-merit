import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import { 
  Card, CardBody, Button, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip, Spinner
} from "@heroui/react";
import { Plus, Pencil, Trash2, Layers, AlertCircle } from 'lucide-react';

export default function ManageGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onOpenChange: onDelOpenChange } = useDisclosure();
  
  const [newGroup, setNewGroup] = useState({ id: '', grado: '', seccion: '', turno: 'Matutino' });
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const grados = [
    "Parvularia 4", "Parvularia 5", "Parvularia 6",
    "1° Grado", "2° Grado", "3° Grado", "4° Grado", "5° Grado", "6° Grado", 
    "7° Grado", "8° Grado", "9° Grado", 
    "1er Año Bachillerato", "2do Año Bachillerato", "3er Año Bachillerato"
  ];
  const secciones = ["A", "B", "C", "D", "E", "F", "G", "U"];
  const turnos = ["Matutino", "Vespertino", "Nocturno"];

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('grupos').select('*').order('grado').order('seccion');
    setGroups(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateName = (g: string, s: string, t: string) => {
    return `${g} "${s}" - ${t}`;
  };

  const handleSave = async (onClose: () => void) => {
    if (!newGroup.grado || !newGroup.seccion || !newGroup.turno) {
      setNotification({ message: "Complete todos los campos", type: 'error' });
      return;
    }

    try {
      const nombreGenerado = generateName(newGroup.grado, newGroup.seccion, newGroup.turno);
      const payload = { grado: newGroup.grado, seccion: newGroup.seccion, turno: newGroup.turno, nombre: nombreGenerado };

      if (isEditing) await supabase.from('grupos').update(payload).eq('id', newGroup.id);
      else await supabase.from('grupos').insert(payload);
      
      setNotification({ message: "Estructura guardada", type: 'success' });
      fetchData();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: " + error.message, type: 'error' }); }
  };

  const confirmDelete = (id: string) => {
    setGroupToDelete(id);
    onDelOpen();
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
    if (group) { setNewGroup({ id: group.id, grado: group.grado || '', seccion: group.seccion || '', turno: group.turno || 'Matutino' }); setIsEditing(true); }
    else { setNewGroup({ id: '', grado: '', seccion: '', turno: 'Matutino' }); setIsEditing(false); }
    onOpen();
  };

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center mb-8 text-slate-900">
        <div><h1 className="text-3xl font-black flex items-center gap-2 uppercase"><Layers className="text-[#1e3b8a]" size={32} /> Grupos</h1></div>
        <Button color="primary" className="bg-[#1e3b8a] font-black uppercase shadow-lg text-xs" startContent={<Plus size={18} />} onPress={() => handleOpenModal()}>Nuevo Grupo</Button>
      </div>

      <Card className="border-none shadow-sm bg-white min-h-[400px]">
        <CardBody className="p-0">
          <Table removeWrapper aria-label="Grupos">
            <TableHeader>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase text-xs">Grado</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase text-xs">Sección</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase text-xs">Turno</TableColumn>
              <TableColumn className="bg-gray-50 font-black text-gray-400 uppercase text-xs text-right">Acciones</TableColumn>
            </TableHeader>
            <TableBody emptyContent={loading ? <Spinner /> : "No hay grupos registrados."}>
              {groups.map((g) => (
                <TableRow key={g.id} className="border-b border-gray-50 last:border-none hover:bg-gray-50/50">
                  <TableCell className="font-bold text-gray-700">{g.grado}</TableCell>
                  <TableCell><Chip size="sm" variant="flat" color="secondary" className="font-black">{g.seccion}</Chip></TableCell>
                  <TableCell className="text-xs uppercase font-bold text-gray-500">{g.turno}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleOpenModal(g)}><Pencil size={16} /></Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => confirmDelete(g.id)}><Trash2 size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b bg-gray-50"><h2 className="text-lg font-black uppercase text-[#1e3b8a]">{isEditing ? 'Editar' : 'Crear'} Grupo</h2></ModalHeader>
              <ModalBody className="py-6 space-y-6 text-slate-900">
                <Select label="Grado Académico" variant="bordered" selectedKeys={newGroup.grado ? [newGroup.grado] : []} onSelectionChange={(keys) => setNewGroup({...newGroup, grado: Array.from(keys)[0] as string})}>
                  {grados.map((g) => <SelectItem key={g}>{g}</SelectItem>)}
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Sección" variant="bordered" selectedKeys={newGroup.seccion ? [newGroup.seccion] : []} onSelectionChange={(keys) => setNewGroup({...newGroup, seccion: Array.from(keys)[0] as string})}>
                    {secciones.map((s) => <SelectItem key={s}>{s}</SelectItem>)}
                  </Select>
                  <Select label="Turno" variant="bordered" selectedKeys={newGroup.turno ? [newGroup.turno] : []} onSelectionChange={(keys) => setNewGroup({...newGroup, turno: Array.from(keys)[0] as string})}>
                    {turnos.map((t) => <SelectItem key={t}>{t}</SelectItem>)}
                  </Select>
                </div>
              </ModalBody>
              <ModalFooter className="bg-gray-50 border-t p-4">
                <Button variant="light" onPress={onClose} className="font-bold uppercase text-xs">Cancelar</Button>
                <Button color="primary" onPress={() => handleSave(onClose)} className="bg-[#1e3b8a] font-black uppercase text-xs shadow-lg">Guardar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDelOpen} onOpenChange={onDelOpenChange} size="sm" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center"><AlertCircle className="mx-auto text-red-500 mb-2" size={40} /><h2 className="text-xl font-black uppercase text-red-600">¿Eliminar Grupo?</h2></ModalHeader>
              <ModalBody className="text-center text-gray-500 font-bold text-sm leading-relaxed"><p>Asegúrese de que el grupo no tenga alumnos vinculados antes de proceder.</p></ModalBody>
              <ModalFooter className="flex justify-center gap-4 p-6">
                <Button variant="flat" onPress={onClose} className="font-black uppercase text-xs">Cancelar</Button>
                <Button color="danger" onPress={() => handleDelete(onClose)} className="font-black uppercase text-xs shadow-lg">Confirmar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
