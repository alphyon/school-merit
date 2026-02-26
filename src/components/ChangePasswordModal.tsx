import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Notification } from './Notification';

interface ChangePasswordProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  targetUserId?: string;
}

export default function ChangePasswordModal({ isOpen, onOpenChange, targetUserId }: ChangePasswordProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const handleUpdate = async (onClose: () => void) => {
    if (newPassword.length < 6) {
      setNotification({ message: "La contraseña debe tener al menos 6 caracteres", type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotification({ message: "Las contraseñas no coinciden", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (targetUserId) {
        const { error } = await supabase.auth.admin.updateUserById(targetUserId, { password: newPassword });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }

      setNotification({ message: "Contraseña actualizada con éxito", type: 'success' });
      setTimeout(() => {
        onClose();
        setNewPassword("");
        setConfirmPassword("");
      }, 1500);
    } catch (error: any) {
      setNotification({ message: "Error: " + error.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
      <ModalContent>
        {(onClose) => (
          <>
            {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <ModalHeader className="flex flex-col gap-1 uppercase font-black text-sm tracking-widest">
              {targetUserId ? 'Resetear Contraseña de Usuario' : 'Cambiar mi Contraseña'}
            </ModalHeader>
            <ModalBody className="space-y-4 py-6">
              <Input
                label="Nueva Contraseña"
                variant="bordered"
                type={isVisible ? "text" : "password"}
                value={newPassword}
                onValueChange={setNewPassword}
                endContent={
                  <button className="focus:outline-none" type="button" onClick={() => setIsVisible(!isVisible)}>
                    {isVisible ? (
                      <EyeOff size={20} className="text-slate-400" />
                    ) : (
                      <Eye size={20} className="text-slate-400" />
                    )}
                  </button>
                }
              />
              <Input
                label="Confirmar Contraseña"
                variant="bordered"
                type={isVisible ? "text" : "password"}
                value={confirmPassword}
                onValueChange={setConfirmPassword}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} className="font-bold">Cancelar</Button>
              <Button color="primary" className="bg-[#1e3b8a] font-bold" isLoading={isSubmitting} onPress={() => handleUpdate(onClose)}>
                Actualizar Contraseña
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
