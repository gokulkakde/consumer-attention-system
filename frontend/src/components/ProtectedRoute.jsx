import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && userString) {
    try {
      const user = JSON.parse(userString);
      if (!user.role || !allowedRoles.includes(user.role.name)) {
        // Redirect to main page if role is unauthorized
        return <Navigate to="/" replace />;
      }
    } catch (e) {
      return <Navigate to="/login" replace />;
    }
  }
  
  return children;
}
