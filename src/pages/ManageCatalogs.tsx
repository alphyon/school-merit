import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Notification } from '../components/Notification';
import AdminSidebar from '../components/AdminSidebar';
import { 
  Card, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Tabs, Tab, Chip, Textarea, Spinner
} from "@heroui/react";
import { Plus, Edit3, Trash2 } from 'lucide-react';

export default function ManageCatalogs() {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const {isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange} = useDisclosure();
  
  const [activeTab, setActiveTab] = useState("demeritos");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState({ codigo: '', descripcion: '', puntos_valor: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    const table = activeTab === 'demeritos' ? 'demeritos_catalogo' : 'redenciones_catalogo';
    try {
      const { data, error } = await supabase.from(table).select('*').order('codigo');
      setItems(data || []);
    } catch (error: any) {
      setNotification({ message: "Error al cargar catálogo", type: 'error' });
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [activeTab]);

  const handleCreateClick = () => {
    setModalMode('create');
    setSelectedItem(null);
    setFormData({ codigo: '', descripcion: '', puntos_valor: 0 });
    onOpen();
  };

  const handleEditClick = (item: any) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({
      codigo: item.codigo,
      descripcion: item.descripcion,
      puntos_valor: item.puntos_valor
    });
    onOpen();
  };

  const handleSaveItem = async (onClose: () => void) => {
    if (!formData.codigo || !formData.descripcion) return;
    
    setIsSubmitting(true);
    const table = activeTab === 'demeritos' ? 'demeritos_catalogo' : 'redenciones_catalogo';
    try {
      if (modalMode === 'create') {
        const { error } = await supabase.from(table).insert([formData]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).update(formData).eq('id', selectedItem.id);
        if (error) throw error;
      }
      
      setNotification({ message: `Código ${modalMode === 'create' ? 'creado' : 'actualizado'}`, type: 'success' });
      fetchItems();
      onClose();
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteClick = (item: any) => {
    setSelectedItem(item);
    onDeleteOpen();
  };

  const confirmDeleteItem = async (onClose: () => void) => {
    setIsSubmitting(true);
    const table = activeTab === 'demeritos' ? 'demeritos_catalogo' : 'redenciones_catalogo';
    try {
      const { error } = await supabase.from(table).delete().eq('id', selectedItem.id);
      if (error) throw error;
      setNotification({ message: "Código eliminado", type: 'success' });
      fetchItems();
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
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black tracking-tight uppercase">Catálogos de Conducta</h2>
            <Button color="primary" className="bg-[#1e3b8a]" startContent={<Plus size={18} />} onPress={handleCreateClick}>Nuevo Código</Button>
          </div>

          <Tabs selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(k as string)} variant="underlined" color="primary" className="mb-6">
            <Tab key="demeritos" title="Deméritos" />
            <Tab key="redenciones" title="Redenciones" />
          </Tabs>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table aria-label="Catalog Table">
              <TableHeader>
                <TableColumn>CÓDIGO</TableColumn>
                <TableColumn>DESCRIPCIÓN</TableColumn>
                <TableColumn>PUNTOS</TableColumn>
                <TableColumn align="end">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody isLoading={isLoading} loadingContent={<Spinner />}>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Chip color={activeTab === 'demeritos' ? 'danger' : 'success'} variant="flat" className="font-bold">{item.codigo}</Chip></TableCell>
                    <TableCell className="max-w-md truncate">{item.descripcion}</TableCell>
                    <TableCell><span className="font-bold">{item.puntos_valor} pts</span></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button isIconOnly variant="light" size="sm" color="primary" onPress={() => handleEditClick(item)}><Edit3 size={18} /></Button>
                        <Button isIconOnly variant="light" size="sm" color="danger" onPress={() => handleDeleteClick(item)}><Trash2 size={18} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </main>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="font-black uppercase">{modalMode === 'edit' ? 'Editar Código' : 'Nuevo Código'}</ModalHeader>
              <ModalBody className="space-y-4">
                <Input label="Código" variant="bordered" value={formData.codigo} onValueChange={(v) => setFormData({...formData, codigo: v})} />
                <Textarea label="Descripción" variant="bordered" value={formData.descripcion} onValueChange={(v) => setFormData({...formData, descripcion: v})} />
                <Input label="Puntos" type="number" variant="bordered" value={formData.puntos_valor.toString()} onValueChange={(v) => setFormData({...formData, puntos_valor: Number(v)})} />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" className="bg-[#1e3b8a]" isLoading={isSubmitting} onPress={() => handleSaveItem(onClose)}>Guardar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-red-600 font-black">⚠️ ELIMINAR CÓDIGO</ModalHeader>
              <ModalBody>¿Estás seguro de eliminar el código <strong>{selectedItem?.codigo}</strong>?</ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="danger" variant="flat" isLoading={isSubmitting} onPress={() => confirmDeleteItem(onClose)}>Eliminar permanentemente</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
