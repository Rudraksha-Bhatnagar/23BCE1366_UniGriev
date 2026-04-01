import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SubmitGrievancePage from './pages/SubmitGrievancePage';
import GrievanceConfirmation from './pages/GrievanceConfirmation';
import MyGrievancesPage from './pages/MyGrievancesPage';
import GrievanceDetailPage from './pages/GrievanceDetailPage';
import AssignedGrievancesPage from './pages/AssignedGrievancesPage';
import ManageGrievancePage from './pages/ManageGrievancePage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminDepartmentsPage from './pages/AdminDepartmentsPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/submit-grievance" element={<ProtectedRoute><SubmitGrievancePage /></ProtectedRoute>} />
                    <Route path="/grievance-submitted" element={<ProtectedRoute><GrievanceConfirmation /></ProtectedRoute>} />
                    <Route path="/my-grievances" element={<ProtectedRoute><MyGrievancesPage /></ProtectedRoute>} />
                    <Route path="/grievance/:id" element={<ProtectedRoute><GrievanceDetailPage /></ProtectedRoute>} />

                    <Route path="/assigned-grievances" element={<ProtectedRoute roles={['officer', 'deptAdmin', 'sysAdmin']}><AssignedGrievancesPage /></ProtectedRoute>} />
                    <Route path="/manage-grievance/:id" element={<ProtectedRoute roles={['officer', 'deptAdmin', 'sysAdmin']}><ManageGrievancePage /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute roles={['sysAdmin']}><AdminUsersPage /></ProtectedRoute>} />
                    <Route path="/admin/departments" element={<ProtectedRoute roles={['sysAdmin']}><AdminDepartmentsPage /></ProtectedRoute>} />
                    <Route path="/admin/categories" element={<ProtectedRoute roles={['sysAdmin']}><AdminCategoriesPage /></ProtectedRoute>} />
                    <Route path="/admin/analytics" element={<ProtectedRoute roles={['sysAdmin', 'deptAdmin']}><AdminAnalyticsPage /></ProtectedRoute>} />

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
