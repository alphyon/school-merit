import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../layouts/DashboardLayout';
import { Notification } from '../components/Notification';
import { 
  Card, CardBody, Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Tabs, Tab, Chip, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure
} from "@heroui/react";
import { Plus, Trash2, Gavel, HeartHandshake, Award, ShieldAlert, Pencil, AlertCircle } from 'lucide-react';

export default function ManageCatalogs() {
  const [activeTab, setActiveTab] = useState("demerito");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onOpenChange: onDelOpenChange } = useDisclosure();
  
  const [currentItem, setCurrentItem] = useState({ id: '', codigo: '', descripcion: '', puntos_valor: 0 });
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const table = activeTab === 'demerito' ? 'demeritos_catalogo' : (activeTab === 'redencion' ? 'redenciones_catalogo' : 'reconocimientos_catalogo');
    const { data } = await supabase.from(table).select('*').order('codigo');
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [activeTab]);

  const handleSave = async (onClose: () => void) => {
    try {
      const table = activeTab === 'demerito' ? 'demeritos_catalogo' : (activeTab === 'redencion' ? 'redenciones_catalogo' : 'reconocimientos_catalogo');
      const payload = { codigo: currentItem.codigo.toUpperCase(), descripcion: currentItem.descripcion, puntos_valor: parseInt(currentItem.puntos_valor.toString()) };

      if (isEditing) await supabase.from(table).update(payload).eq('id', currentItem.id);
      else await supabase.from(table).insert(payload);
      
      setNotification({ message: "Catálogo actualizado", type: 'success' });
      fetchItems();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: " + error.message, type: 'error' }); }
  };

  const confirmDelete = (id: string) => { setItemToDelete(id); onDelOpen(); };

  const handleDelete = async (onClose: () => void) => {
    if (!itemToDelete) return;
    const table = activeTab === 'demerito' ? 'demeritos_catalogo' : (activeTab === 'redencion' ? 'redenciones_catalogo' : 'reconocimientos_catalogo');
    try {
      await supabase.from(table).delete().eq('id', itemToDelete);
      setNotification({ message: "Elemento eliminado", type: 'success' });
      fetchItems();
      onClose();
    } catch (error: any) { setNotification({ message: "Error: No se puede eliminar si ya tiene registros asociados.", type: 'error' }); }
  };

  const handleOpenModal = (item?: any) => {
    if (item) { setCurrentItem({ id: item.id, codigo: item.codigo, descripcion: item.descripcion, puntos_valor: item.puntos_valor || 0 }); setIsEditing(true); }
    else { setCurrentItem({ id: '', codigo: '', descripcion: '', puntos_valor: 1 }); setIsEditing(false); }
    onOpen();
  };

  return (
    <DashboardLayout role="admin">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center mb-8 text-slate-900">
        <div><h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><Gavel className="text-[#1e3b8a]" size={32} /> Catálogos</h1></div>
        <Button color="primary" className="bg-[#1e3b8a] font-black shadow-lg text-xs" startContent={<Plus size={18} />} onPress={() => handleOpenModal()}>Nuevo Registro</Button>
      </div>

      <div className="space-y-6 text-slate-900">
        <Tabs aria-label="Catálogos" color={activeTab === "demerito" ? "danger" : (activeTab === "redencion" ? "success" : "secondary")} variant="underlined" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)} classNames={{ tabList: "gap-6 border-b", tabContent: "font-black tracking-widest text-xs" }}>
          <Tab key="demerito" title={<div className="flex items-center space-x-2"><ShieldAlert size={18} /><span>Deméritos</span></div>} />
          <Tab key="redencion" title={<div className="flex items-center space-x-2"><HeartHandshake size={18} /><span>Redenciones</span></div>} />
          <Tab key="reconocimiento" title={<div className="flex items-center space-x-2"><Award size={18} /><span>Reconocimientos</span></div>} />
        </Tabs>

        <Card className="border-none shadow-sm bg-white">
          <CardBody className="p-0 text-slate-900">
            <Table removeWrapper aria-label="Tabla de catálogo">
              <TableHeader>
                <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs">Código</TableColumn>
                <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs">Descripción</TableColumn>
                <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs">Puntos</TableColumn>
                <TableColumn className="bg-gray-50 font-black text-gray-400 text-xs text-right">Acciones</TableColumn>
              </TableHeader>
              <TableBody emptyContent={loading ? <Spinner /> : "Sin registros."}>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-b border-gray-50 last:border-none">
                    <TableCell><Chip size="sm" variant="flat" className="font-black" color={activeTab === 'demerito' ? 'danger' : (activeTab === 'redencion' ? 'success' : 'secondary')}>{item.codigo}</Chip></TableCell>
                    <TableCell className="font-medium text-xs leading-relaxed">{item.descripcion}</TableCell>
                    <TableCell className="font-black text-xs">{activeTab === 'reconocimiento' ? '-' : `${item.puntos_valor}`}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleOpenModal(item)}><Pencil size={16} /></Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => confirmDelete(item.id)}><Trash2 size={16} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b bg-gray-50 font-black text-[#1e3b8a]">Ficha de Catálogo</ModalHeader>
              <ModalBody className="py-6 space-y-4 text-slate-900">
                <Input label="Código" variant="bordered" value={currentItem.codigo} onValueChange={(v) => setCurrentItem({...currentItem, codigo: v})} />
                <Input label="Descripción" variant="bordered" value={currentItem.descripcion} onValueChange={(v) => setCurrentItem({...currentItem, descripcion: v})} />
                {activeTab !== 'reconocimiento' && <Input type="number" label="Puntos" variant="bordered" value={currentItem.puntos_valor.toString()} onValueChange={(v) => setCurrentItem({...currentItem, puntos_valor: Number(v)})} />}
              </ModalBody>
              <ModalFooter className="bg-gray-50 border-t p-4"><Button variant="light" onPress={onClose} className="font-bold text-xs">Cerrar</Button><Button color="primary" onPress={() => handleSave(onClose)} className="bg-[#1e3b8a] font-black text-xs shadow-lg">Guardar Cambios</Button></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDelOpen} onOpenChange={onDelOpenChange} size="sm" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center"><AlertCircle className="mx-auto text-red-500 mb-2" size={40} /><h2 className="text-xl font-black text-red-600">¿Eliminar registro?</h2></ModalHeader>
              <ModalBody className="text-center text-gray-500 font-bold text-sm">Esta acción es irreversible y afectará reportes pasados.</ModalBody>
              <ModalFooter className="flex justify-center gap-4 p-6"><Button variant="flat" onPress={onClose} className="font-black text-xs">No</Button><Button color="danger" onPress={() => handleDelete(onClose)} className="font-black text-xs shadow-lg">Sí, Eliminar</Button></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
