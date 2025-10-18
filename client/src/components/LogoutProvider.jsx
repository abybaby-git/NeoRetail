import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutConfirmation from './LogoutConfirmation';

const LogoutContext = createContext({
  open: () => {},
  cancel: () => {},
  confirm: async () => {},
  isOpen: false,
  isLoading: false,
});

export const LogoutProvider = ({ children }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const cancel = useCallback(() => { setIsOpen(false); setIsLoading(false); }, []);
  const confirm = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  return (
    <LogoutContext.Provider value={{ open, cancel, confirm, isOpen, isLoading }}>
      {children}
      <LogoutConfirmation isOpen={isOpen} onConfirm={confirm} onCancel={cancel} isLoading={isLoading} />
    </LogoutContext.Provider>
  );
};

export const useLogout = () => useContext(LogoutContext);


