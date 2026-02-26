import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HeroUIProvider } from '@heroui/react'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

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
