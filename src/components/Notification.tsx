import { useEffect } from 'react';
import { Card, CardBody } from "@heroui/react";
import { AlertCircle, CheckCircle2, X, Info, AlertTriangle } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export const Notification = ({ message, type, onClose, duration = 3000 }: NotificationProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const config = {
    success: { bg: 'bg-emerald-500', icon: <CheckCircle2 size={20} />, label: 'Éxito' },
    error: { bg: 'bg-red-500', icon: <AlertCircle size={20} />, label: 'Error' },
    info: { bg: 'bg-blue-500', icon: <Info size={20} />, label: 'Info' },
    warning: { bg: 'bg-yellow-500', icon: <AlertTriangle size={20} />, label: 'Aviso' }
  };

  const current = config[type];

  return (
    <div className="fixed top-4 right-4 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
      <Card className={`border-none shadow-2xl min-w-[320px] ${current.bg} text-white`}>
        <CardBody className="flex flex-row items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              {current.icon}
            </div>
            <div>
              <p className="text-xs font-black uppercase opacity-70 tracking-widest">{current.label}</p>
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
