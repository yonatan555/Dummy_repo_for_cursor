import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = () => {
  const { user } = useAuth();

  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" />;
};

export default AdminRoute;