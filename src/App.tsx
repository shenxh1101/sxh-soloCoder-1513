import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './store';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import RepairOrderList from './pages/RepairOrderList';
import ReportRepair from './pages/ReportRepair';
import FacilityManagement from './pages/FacilityManagement';
import Statistics from './pages/Statistics';
import Workbench from './pages/Workbench';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { currentUser } = useAppStore();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    if (currentUser.role === 'worker') {
      return <Navigate to="/workbench" replace />;
    } else {
      return <Navigate to="/orders" replace />;
    }
  }

  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>;
}

function WorkerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['admin', 'worker']}>{children}</ProtectedRoute>;
}

function RedirectBasedOnRole() {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'worker') {
        navigate('/workbench', { replace: true });
      } else {
        navigate('/orders', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);

  return null;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/report/:facilityId" element={<ReportRepair />} />
        <Route path="/" element={<RedirectBasedOnRole />} />
        <Route
          path="/orders"
          element={
            <WorkerRoute>
              <RepairOrderList />
            </WorkerRoute>
          }
        />
        <Route
          path="/facilities"
          element={
            <AdminRoute>
              <FacilityManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <AdminRoute>
              <Statistics />
            </AdminRoute>
          }
        />
        <Route
          path="/workbench"
          element={
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <Workbench />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
