import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HeroUIProvider } from '@heroui/react'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Aplica la escala de fuente guardada antes del primer render
const savedScale = localStorage.getItem('font_scale');
if (savedScale === 'large') document.documentElement.classList.add('font-scale-lg');
else if (savedScale === 'xl') document.documentElement.classList.add('font-scale-xl');

// Registrar Service Worker para PWA
if (typeof window !== 'undefined') {
  registerSW({ 
    onNeedRefresh() { console.log('Nueva versión disponible'); },
    onOfflineReady() { console.log('Aplicación lista para trabajar offline'); },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </StrictMode>,
)
