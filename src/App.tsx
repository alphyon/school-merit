import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherReports from './pages/TeacherReports';
import AdminDashboard from './pages/AdminDashboard';
import ManageStudents from './pages/ManageStudents';
import ManageTeachers from './pages/ManageTeachers';
import ManageAdmins from './pages/ManageAdmins';
import ManageGroups from './pages/ManageGroups';
import ManageCatalogs from './pages/ManageCatalogs';
import AdminSettings from './pages/AdminSettings';
import StudentProfile from './pages/StudentProfile';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas de Administrador */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/estudiantes" element={<ManageStudents />} />
        <Route path="/admin/docentes" element={<ManageTeachers />} />
        <Route path="/admin/administradores" element={<ManageAdmins />} />
        <Route path="/admin/grupos" element={<ManageGroups />} />
        <Route path="/admin/catalogos" element={<ManageCatalogs />} />
        <Route path="/admin/configuracion" element={<AdminSettings />} />
        
        {/* Rutas de Docente */}
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/reportes" element={<TeacherReports />} />
        <Route path="/student/:id" element={<StudentProfile />} />
        
        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
