import React, { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Navbar from './Components/Navbar';
import LoginModal from './Components/Modal/LoginModal';
import { AuthProvider } from './hooks/useAuth';
import SignupModal from './Components/Modal/SignupModal';

const LootLayout = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  const onLoginClick = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  const onSignupClick = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  const handleCloseModals = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(false);
  };

  return (
    <AuthProvider>
      <Navbar onLoginClick={onLoginClick} onSignupClick={onSignupClick} />

      <LoginModal isOpen={isLoginOpen} onClose={handleCloseModals} onSignupClick={onSignupClick} />
      <SignupModal isOpen={isSignupOpen} onClose={handleCloseModals} onLoginClick={onLoginClick} />
    </AuthProvider>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <LootLayout />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
