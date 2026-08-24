import React, { createContext } from 'react';
import { Toaster, toast } from 'react-hot-toast';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast(message, { icon: 'ℹ️' });

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo }}>
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
            },
          },
        }} 
      />
      {children}
    </ToastContext.Provider>
  );
};
