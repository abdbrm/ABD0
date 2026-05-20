import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { getUser } from './utils/api';
import Login      from './pages/Login';
import Kitchen    from './pages/Kitchen';
import Waiter     from './pages/Waiter';
import Admin      from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import Worker     from './pages/Worker';

function Protected({ roles, children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"      element={<Login />} />
        <Route path="/worker"     element={<Worker />} />

        <Route path="/kitchen"    element={
          <Protected roles={['cook','superadmin']}>
            <Kitchen />
          </Protected>
        } />
        <Route path="/waiter"     element={
          <Protected roles={['waiter','superadmin']}>
            <Waiter />
          </Protected>
        } />
        <Route path="/admin"      element={
          <Protected roles={['admin','superadmin']}>
            <Admin />
          </Protected>
        } />
        <Route path="/superadmin" element={
          <Protected roles={['superadmin']}>
            <SuperAdmin />
          </Protected>
        } />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  const map = { superadmin:'/superadmin', admin:'/admin', cook:'/kitchen', waiter:'/waiter' };
  return <Navigate to={map[user.role] || '/login'} replace />;
}
