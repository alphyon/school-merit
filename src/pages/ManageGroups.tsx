import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../components/Notification';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Card, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner
} from "@heroui/react";
import { Plus, Trash2, Layers } from 'lucide-react';

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
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="text-[#1e3b8a]" size={32} /> Grupos Escolares
          </h1>
          <p className="text-gray-500 font-medium text-sm">Estructura académica oficial</p>
        </div>
        <Button color="primary" className="bg-[#1e3b8a] font-bold shadow-lg" startContent={<Plus size={18} />} onPress={onOpen}>Nuevo Grupo</Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="w-full overflow-x-auto">
          <Table aria-label="Grupos" shadow="none" classNames={{ wrapper: "min-w-[600px] p-0 shadow-none", th: "bg-gray-50 text-gray-500 font-bold h-12" }}>
            <TableHeader>
              <TableColumn>NOMBRE DEL GRUPO</TableColumn>
              <TableColumn align="end">ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} loadingContent={<Spinner />}>
              {grupos.map((g) => (
                <TableRow key={g.id} className="hover:bg-gray-50 border-b border-gray-50">
                  <TableCell className="font-bold text-gray-900">{g.nombre}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button isIconOnly variant="light" size="sm" className="text-red-400 hover:text-red-600" onPress={() => { setSelectedGrupo(g); onDeleteOpen(); }}><Trash2 size={18} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="font-black uppercase">Nuevo Grupo</ModalHeader>
              <ModalBody><Input label="Nombre" placeholder="Ej: 9 A" variant="bordered" value={nombre} onValueChange={setNombre} /></ModalBody>
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
              <ModalHeader className="text-red-600 font-black">ELIMINAR</ModalHeader>
              <ModalBody>¿Borrar el grupo <strong>{selectedGrupo?.nombre}</strong>?</ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>No</Button>
                <Button color="danger" variant="flat" isLoading={isSubmitting} onPress={() => confirmDeleteGrupo(onClose)}>Eliminar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
