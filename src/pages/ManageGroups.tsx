import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../components/Notification';
import AdminSidebar from '../components/AdminSidebar';
import { 
  Card, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner
} from "@heroui/react";
import { Plus, Trash2 } from 'lucide-react';

export default function ManageGroups() {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const {isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange} = useDisclosure();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [nombre, setNombre] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGrupos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('grupos').select('*').order('nombre');
      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      setNotification({ message: "Error al cargar grupos", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGrupos(); }, []);

  const handleAddGrupo = async (onClose: () => void) => {
    if (!nombre) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('grupos').insert([{ nombre: nombre.toUpperCase().trim() }]);
      if (error) throw error;
      setNotification({ message: "Grupo creado", type: 'success' });
      fetchGrupos();
      onClose();
      setNombre('');
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (grupo: any) => {
    setSelectedGrupo(grupo);
    onDeleteOpen();
  };

  const confirmDeleteGrupo = async (onClose: () => void) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('grupos').delete().eq('id', selectedGrupo.id);
      if (error) throw error;
      setNotification({ message: "Grupo eliminado", type: 'success' });
      fetchGrupos();
      onClose();
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121620] font-['Lexend'] text-slate-900 dark:text-slate-100 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 md:ml-64 p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black tracking-tight">Gestión de Grupos</h2>
            <Button color="primary" className="bg-[#1e3b8a]" startContent={<Plus size={18} />} onPress={onOpen}>Nuevo Grupo</Button>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table aria-label="Grupos Table">
              <TableHeader>
                <TableColumn>NOMBRE DEL GRUPO</TableColumn>
                <TableColumn align="end">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody isLoading={isLoading} loadingContent={<Spinner />}>
                {grupos.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-bold">{g.nombre}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button isIconOnly variant="light" size="sm" color="danger" onPress={() => handleDeleteClick(g)}><Trash2 size={18} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </main>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Registrar Grupo</ModalHeader>
              <ModalBody><Input label="Nombre del Grupo" placeholder="Ej: 9 A" variant="bordered" value={nombre} onValueChange={setNombre} /></ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" className="bg-[#1e3b8a]" isLoading={isSubmitting} onPress={() => handleAddGrupo(onClose)}>Guardar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-red-600">⚠️ Confirmar Eliminación</ModalHeader>
              <ModalBody>¿Estás seguro de eliminar el grupo <strong>{selectedGrupo?.nombre}</strong>?</ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="danger" variant="flat" isLoading={isSubmitting} onPress={() => confirmDeleteGrupo(onClose)}>Eliminar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
