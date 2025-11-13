import { useState, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (email, password) => {
    setError('로그인에 실패했습니다.');
    return false;
  };

  const signup = async (userData) => {
    setError('회원가입에 실패했습니다.');
    return false;
  };

  const logout = async () => {
    alert('로그아웃');
  };

  return (
    <AuthContext.Provider
      value={{
        error,
        setError,
        isAuthenticated,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 사용하기 위해 AuthProvider로 감싸야한다.');
  }
  return context;
};
