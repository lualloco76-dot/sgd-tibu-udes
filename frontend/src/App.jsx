import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import PasswordRequired from './components/PasswordRequired';
import Dashboard from './components/Dashboard';
import { Verificacion } from './components/ConnectedPages';
import './styles.css';

export function ProtectedRoute({ children }) {
  const { usuario, loading } = useAuth();
  if (loading) return <p role="status">Comprobando sesión…</p>;
  if (usuario?.debe_cambiar_password) return <PasswordRequired />;
  return usuario ? children : <Navigate to="/login" replace />;
}
export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/verificar/:codigo" element={<Verificacion />} />
    <Route path="/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  </Routes></BrowserRouter></AuthProvider>;
}
