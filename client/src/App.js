import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import ResidentDashboard from './pages/resident/Dashboard';
import Payments from './pages/admin/Payments';
import Suppliers from './pages/admin/Suppliers';
import Maintenance from './pages/admin/Maintenance';
import Users from './pages/admin/Users';
import ResidentPayments from './pages/resident/Payments';
import ResidentMaintenance from './pages/resident/Maintenance';
import Profile from './pages/Profile';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Private Routes */}
      <Route path="/" element={<PrivateRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="profile" element={<Profile />} />
        
        {/* Admin Routes */}
        <Route path="admin" element={<AdminRoute />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="payments" element={<Payments />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="users" element={<Users />} />
        </Route>
        
        {/* Resident Routes */}
        <Route path="dashboard" element={<DashboardRouter />} />
        <Route path="payments" element={<ResidentPayments />} />
        <Route path="maintenance" element={<ResidentMaintenance />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// Dashboard router based on user role
const DashboardRouter = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <ResidentDashboard />;
};

export default App;