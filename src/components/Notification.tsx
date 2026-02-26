import { useEffect } from 'react';
import { Card, CardBody } from "@heroui/react";
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Notification = ({ message, type, onClose, duration = 2000 }: NotificationProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-4 right-4 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
      <Card className={`border-none shadow-2xl min-w-[320px] ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
        <CardBody className="flex flex-row items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">{type === 'success' ? 'Éxito' : 'Error'}</p>
              <p className="text-sm font-bold leading-tight">{message}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </CardBody>
      </Card>
    </div>
  );
};
