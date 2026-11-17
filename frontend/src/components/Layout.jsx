import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🏛️ Gestión Documental Parroquial</h1>
      <hr />
      <Outlet />
    </div>
  );
};

export default Layout;
