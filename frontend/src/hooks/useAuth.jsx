import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { showErrorAlert, showSuccessAlert } from '../utils/alertUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const login = async (email, password) => {
    try {
      const response = await api.post('/users/login', { email, password });

      if (response.status === 200) {
        setUser(response.data);
        setIsAuthenticated(true);
        await verifyJWT();
        showSuccessAlert('환영합니다.');
        return true;
      }
    } catch (error) {
      console.error(error);
      setError(error.response?.data.detail || '로그인에 실패했습니다.');
      setIsAuthenticated(false);
      return false;
    }
  };

  const signup = async ({ email, username, password, confirmPassword }) => {
    if (!email.includes('@')) {
      setError('유효한 이메일을 입력하세요.');
      return false;
    }
    if (username.length < 2) {
      setError('닉네임은 최소 2글자 이상이어야 합니다.');
      return false;
    }
    if (password.length < 6) {
      setError('비밀번호는 최소 6자리 이상이어야 합니다.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    try {
      const response = await api.post('/users/signup', {
        email,
        username,
        password,
      });

      if (response.status === 200) {
        showSuccessAlert('회원가입이 완료되었습니다.');
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      setError(error.response?.data.detail || '회원가입에 실패했습니다.');
      return false;
    }
  };

  const logout = async () => {
    try {
      const response = await api.post('/users/logout');
      setIsAuthenticated(false);
      setUser(null);

      if (response.status === 200) {
        showSuccessAlert('로그아웃 되었습니다.');
        navigate('/');
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      navigate('/');
    }
  };

  const verifyJWT = async () => {
    try {
      const response = await api.get('/users/me');
      setIsAuthenticated(true);
      setUser(response.data);
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        const detail = error.response.data?.detail;

        if (detail === 'token_expired') {
          showErrorAlert('세션이 만료되었습니다. 다시 로그인 해주세요.');
          navigate('/login');
        }
      }
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      await verifyJWT();
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        error,
        isAuthenticated,
        login,
        signup,
        logout,
        user,
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
