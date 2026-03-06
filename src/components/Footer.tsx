import { Link } from "@heroui/react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-8 flex flex-col items-center justify-center gap-4 bg-transparent">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Momotolabs Logo" className="h-8 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700"></div>
        <img src="/icon.svg" alt="App Icon" className="h-5 w-5 opacity-30" />
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          © {currentYear} Sistema de Gestión de Deméritos
        </p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400/80 dark:text-slate-500/80 flex items-center gap-1">
          Desarrollado por 
          <Link 
            href="https://momotolabs.com" 
            target="_blank" 
            className="text-[9px] font-black text-[#1e3b8a] dark:text-blue-400 hover:underline underline-offset-4"
          >
            MOMOTOLABS
          </Link>
        </p>
      </div>
    </footer>
  );
}
