import React, { useCallback, useState } from 'react';
import { ModalLayout, ErrorMessage, FormButton, FormInput, SwitchAuthLink } from '../Ui';
import { useAuth } from '../../../hooks/useAuth';

const LoginModal = ({ isOpen, onClose, onSignupClick }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { error, setError, login } = useAuth();

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');

      try {
        const success = await login(formData.email, formData.password);
        if (success) {
          onClose();
        }
      } catch (err) {
        console.error('Login error:', err);
      }
    },
    [formData, login, onClose, setError]
  );

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} title="로그인">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormInput type="email" name="email" value={formData.email} onChange={handleChange} placeholder="이메일" />

        <FormInput
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="비밀번호"
        />

        <ErrorMessage error={error} />
        <FormButton>로그인</FormButton>
      </form>
      <SwitchAuthLink message="계정이 없으신가요?" buttonText="회원가입" onClick={onSignupClick} />
    </ModalLayout>
  );
};

export default LoginModal;
