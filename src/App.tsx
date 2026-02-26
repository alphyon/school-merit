import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherReports from './pages/TeacherReports';
import AdminDashboard from './pages/AdminDashboard';
import ManageStudents from './pages/ManageStudents';
import ManageTeachers from './pages/ManageTeachers';
import ManageGroups from './pages/ManageGroups';
import ManageCatalogs from './pages/ManageCatalogs';
import AdminSettings from './pages/AdminSettings';
import StudentProfile from './pages/StudentProfile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas de Administrador */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/estudiantes" element={<ManageStudents />} />
        <Route path="/admin/docentes" element={<ManageTeachers />} />
        <Route path="/admin/grupos" element={<ManageGroups />} />
        <Route path="/admin/catalogos" element={<ManageCatalogs />} />
        <Route path="/admin/configuracion" element={<AdminSettings />} />
        
        {/* Rutas de Docente */}
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/reportes" element={<TeacherReports />} />
        <Route path="/student/:id" element={<StudentProfile />} />
        
        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<div className="p-20 text-center font-bold text-xl uppercase tracking-widest text-slate-400">404 - Página No Encontrada</div>} />
      </Routes>
    </Router>
  );
}

export default App;
