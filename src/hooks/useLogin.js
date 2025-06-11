import { useState } from 'react';

const MASTER_PASSWORD = '0904';

export default function useLogin() {
  const [userType, setUserType] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (passwordInput === MASTER_PASSWORD) {
      setAuthenticated(true);
      setShowLogin(false);
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta');
    }
  };

  const resetLogin = () => {
    setUserType(null);
    setShowLogin(false);
    setPasswordInput('');
    setAuthenticated(false);
    setAuthError('');
  };

  return {
    userType,
    setUserType,
    showLogin,
    setShowLogin,
    passwordInput,
    setPasswordInput,
    authenticated,
    setAuthenticated,
    authError,
    handleLogin,
    resetLogin,
  };
}
