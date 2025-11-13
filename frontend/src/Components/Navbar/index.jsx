import React, { useState } from 'react';
import Logo from './layout/Logo';
import DesktopAuthButtons from './auth/DesktopAuthButtons';
import MobileMenu from './layout/MobileMenu';
import MobileToggleButton from './layout/MobileToggleButton';
import Categories from './layout/Categories';
import SearchMenu from './layout/SearchMenu';
import { useAuth } from '../../hooks/useAuth';

const Navbar = ({ onLoginClick, onSignupClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, isAuthenticated } = useAuth();

  const onLogoutClick = () => {
    logout();
  };

  const onCategoryClick = (category) => {
    alert(category);
  };

  return (
    <nav className="bg-emerald-500">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-20">
          <div className="flex items-center flex-1">
            <Logo />
            <SearchMenu />
          </div>
          <MobileToggleButton isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />

          <DesktopAuthButtons
            isAuthenticated={isAuthenticated}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            onLoginClick={onLoginClick}
            onLogoutClick={onLogoutClick}
            onSignupClick={onSignupClick}
          />
        </div>

        <MobileMenu
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          isAuthenticated={isAuthenticated}
          onLoginClick={onLoginClick}
          onLogoutClick={onLogoutClick}
          onSignupClick={onSignupClick}
        />
      </div>

      <Categories onClick={onCategoryClick} />
    </nav>
  );
};

export default Navbar;
