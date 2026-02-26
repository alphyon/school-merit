import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../components/Notification';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Card, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Tabs, Tab, Chip, Textarea, Spinner
} from "@heroui/react";
import { Plus, Edit3, Trash2, Shield, ShieldAlert, BadgeCheck } from 'lucide-react';

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
      const { data } = await supabase.from(table).select('*').order('codigo');
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
      
      setNotification({ message: "Éxito", type: 'success' });
      fetchItems();
      onClose();
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  const confirmDeleteItem = async (onClose: () => void) => {
    setIsSubmitting(true);
    const table = activeTab === 'demeritos' ? 'demeritos_catalogo' : 'redenciones_catalogo';
    try {
      const { error } = await supabase.from(table).delete().eq('id', selectedItem.id);
      if (error) throw error;
      setNotification({ message: "Eliminado", type: 'success' });
      fetchItems();
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
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Shield className="text-[#1e3b8a]" size={32} /> Catálogos
          </h1>
          <p className="text-gray-500 font-medium text-sm">Códigos de conducta oficiales</p>
        </div>
        <Button color="primary" className="bg-[#1e3b8a] font-bold shadow-lg" startContent={<Plus size={18} />} onPress={handleCreateClick}>Nuevo Código</Button>
      </div>

      <Tabs 
        selectedKey={activeTab} 
        onSelectionChange={(k) => setActiveTab(k as string)} 
        variant="light" 
        color="primary" 
        className="mb-6"
        classNames={{
          tabList: "bg-white p-1 rounded-xl shadow-sm border border-gray-100",
          cursor: "bg-[#1e3b8a] shadow-md",
          tab: "h-10",
          tabContent: "group-data-[selected=true]:text-white font-bold"
        }}
      >
        <Tab key="demeritos" title={<div className="flex items-center gap-2"><ShieldAlert size={16}/> Deméritos</div>} />
        <Tab key="redenciones" title={<div className="flex items-center gap-2"><BadgeCheck size={16}/> Redenciones</div>} />
      </Tabs>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="w-full overflow-x-auto">
          <Table aria-label="Catalog" shadow="none" classNames={{ wrapper: "min-w-[600px] p-0 shadow-none", th: "bg-gray-50 text-gray-500 font-bold h-12" }}>
            <TableHeader>
              <TableColumn>CÓDIGO</TableColumn>
              <TableColumn>DESCRIPCIÓN</TableColumn>
              <TableColumn>PUNTOS</TableColumn>
              <TableColumn align="end">ACCIONES</TableColumn>
            </TableHeader>
            <TableBody isLoading={isLoading} loadingContent={<Spinner />}>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50 border-b border-gray-50">
                  <TableCell><Chip color={activeTab === 'demeritos' ? 'danger' : 'success'} variant="flat" size="sm" className="font-bold">{item.codigo}</Chip></TableCell>
                  <TableCell className="max-w-md truncate font-medium text-gray-700">{item.descripcion}</TableCell>
                  <TableCell><span className={`font-black ${activeTab === 'demeritos' ? 'text-red-600' : 'text-emerald-600'}`}>{item.puntos_valor} pts</span></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button isIconOnly variant="light" size="sm" className="text-blue-400 hover:text-blue-600" onPress={() => handleEditClick(item)}><Edit3 size={18} /></Button>
                      <Button isIconOnly variant="light" size="sm" className="text-red-400 hover:text-red-600" onPress={() => { setSelectedItem(item); onDeleteOpen(); }}><Trash2 size={18} /></Button>
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
              <ModalHeader className="font-black uppercase">{modalMode === 'edit' ? 'Editar' : 'Nuevo'}</ModalHeader>
              <ModalBody className="space-y-4">
                <Input label="Código" variant="bordered" value={formData.codigo} onValueChange={(v) => setFormData({...formData, codigo: v})} />
                <Textarea label="Descripción" variant="bordered" value={formData.descripcion} onValueChange={(v) => setFormData({...formData, descripcion: v})} />
                <Input label="Puntos" type="number" variant="bordered" value={formData.puntos_valor.toString()} onValueChange={(v) => setFormData({...formData, puntos_valor: Number(v)})} />
              </ModalBody><ModalFooter><Button variant="light" onPress={onClose}>Cancelar</Button><Button color="primary" className="bg-[#1e3b8a]" isLoading={isSubmitting} onPress={() => handleSaveItem(onClose)}>Guardar</Button></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} backdrop="blur">
        <ModalContent>{(onClose) => (
          <><ModalHeader className="text-red-600 font-black">ELIMINAR</ModalHeader><ModalBody>¿Borrar código <strong>{selectedItem?.codigo}</strong>?</ModalBody><ModalFooter><Button variant="light" onPress={onClose}>No</Button><Button color="danger" variant="flat" isLoading={isSubmitting} onPress={() => confirmDeleteItem(onClose)}>Eliminar</Button></ModalFooter></>
        )}</ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
