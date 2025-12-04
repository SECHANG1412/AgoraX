import React, { useState } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import Navbar from './Components/Navbar';
import LoginModal from './Components/Modal/LoginModal';
import SignupModal from './Components/Modal/SignupModal';
import Footer from './Components/Footer/Footer';
import Main from './Pages/Main';
import CreateTopic from './Pages/CreateTopic';
import SingleTopic from './Pages/SingleTopic';
import Profile from './Pages/Profile';
import Swal from 'sweetalert2';
import { AuthProvider, useAuth } from './hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    Swal.fire({
      icon: 'warning',
      title: '로그인이 필요해요',
      text: '로그인 후 이용할 수 있는 메뉴입니다.',
      confirmButtonColor: '#2563EB',
    });
    return <Navigate to="/" replace />;
  }
  return children;
};

const RootLayout = () => {
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
      <div className="flex flex-col min-h-screen bg-[#F9FAFB]">
        <Navbar onLoginClick={onLoginClick} onSignupClick={onSignupClick} />
        <main className="flex-grow container mx-auto px-4 lg:px-6 py-8">
          <Outlet />
        </main>
        <Footer />
      </div>
      <LoginModal isOpen={isLoginOpen} onClose={handleCloseModals} onSignupClick={onSignupClick} />
      <SignupModal isOpen={isSignupOpen} onClose={handleCloseModals} onLoginClick={onLoginClick} />
    </AuthProvider>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Main /> },
      {
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          { path: 'create-topic', element: <CreateTopic /> },
          { path: 'profile', element: <Profile /> },
        ],
      },

      { path: 'topic/:id', element: <SingleTopic /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
