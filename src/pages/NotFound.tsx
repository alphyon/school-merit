import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from "@heroui/react";
import { GraduationCap, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#121620] flex items-center justify-center p-6 font-['Lexend']">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="size-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center animate-bounce">
            <GraduationCap size={48} className="text-[#1e3b8a]" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-8xl font-black text-[#1e3b8a] opacity-20">404</h1>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Página no encontrada</h2>
          <p className="text-slate-500 font-medium">Lo sentimos, la ruta que intentas acceder no existe o no tienes permisos para verla.</p>
        </div>

        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem]">
          <CardBody className="p-8 flex flex-col gap-3">
            <Button 
              color="primary" 
              className="bg-[#1e3b8a] font-black text-xs tracking-widest h-14 shadow-lg shadow-primary/20"
              startContent={<Home size={18} />}
              onPress={() => navigate('/')}
            >
              Volver al Inicio
            </Button>
            <Button 
              variant="light" 
              className="font-bold text-slate-400 text-xs tracking-widest"
              startContent={<ArrowLeft size={14} />}
              onPress={() => navigate(-1)}
            >
              Regresar a la página anterior
            </Button>
          </CardBody>
        </Card>

        <p className="text-xs font-black text-slate-400 tracking-[0.3em]">Sistema de Gestión de Deméritos</p>
      </div>
    </div>
  );
}
