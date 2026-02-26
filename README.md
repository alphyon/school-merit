# Sistema de Gestión Escolar 🏫

Plataforma integral para el registro de deméritos, redenciones y gestión de conducta estudiantil en escuelas públicas. Construido con **React 19**, **Tailwind CSS v4**, **HeroUI** y **Supabase**.

## 🚀 Guía de Inicio Rápido (Desarrollo)

### 1. Requisitos Previos
- Node.js (v18 o superior)
- Una cuenta en [Supabase](https://supabase.com/)

### 2. Configuración de Base de Datos
1. Crea un nuevo proyecto en Supabase.
2. Abre el **SQL Editor** y pega el contenido íntegro del archivo `schema.sql` (ubicado en la raíz).
3. En **Authentication -> Email Providers**, desactiva "Confirm email" para permitir la creación instantánea de docentes.

### 3. Instalación Local
```bash
# Entrar a la carpeta de la app
cd app

# Instalar dependencias
npm install

# Crear archivo de entorno
cp .env.example .env
```
*Edita el archivo `.env` con tu `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.*

### 4. Ejecución
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

---

## 🌍 Despliegue (Vercel / Netlify)

Este proyecto está optimizado para capas gratuitas.

### Pasos para Vercel:
1. Instala Vercel CLI: `npm i -g vercel`.
2. Ejecuta `vercel --prod` dentro de la carpeta `app`.
3. En el panel de control de Vercel, configura las **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. ¡Listo! Tu app tendrá una URL pública `.vercel.app`.

---

## 🛠️ Funcionalidades Clave
- **Admin:** Importación masiva de alumnos (CSV), gestión de docentes (múltiples grupos), catálogos de conducta y ajustes globales (Nombre/Logo).
- **Docente:** Dashboard filtrado por grupo, registro rápido de incidencias y reportes en Excel.
- **Alumno:** Perfil histórico paginado y generación de **Boleta Oficial** imprimible.
- **Búsqueda Inteligente:** Motor de búsqueda insensible a acentos y tildes.

---

## 📄 Notas de Seguridad
- Las contraseñas de los docentes se asignan inicialmente por el administrador.
- El sistema utiliza **RLS (Row Level Security)** de Supabase para proteger los datos escolares.
- Al cerrar sesión, se limpian todos los datos temporales del navegador.

© 2024 Sistema de Gestión Escolar.
