import React, { useState } from 'react';
import Logo from './layout/Logo';
import DesktopAuthButtons from './auth/DesktopAuthButtons';
import MobileMenu from './layout/MobileMenu';
import MobileToggleButton from './layout/MobileToggleButton';
import Categories from './layout/Categories';
import SearchMenu from './layout/SearchMenu';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';

const Navbar = ({ onLoginClick, onSignupClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, isAuthenticated, user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  const onLogoutClick = () => {
    logout();
  };

  const onCategoryClick = (newCategory) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('category', newCategory === '전체' ? '' : newCategory);
    updated.set('page', '1');
    setSearchParams(updated);
  };

  const onSearchInputChange = (e) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('search', e.target.value);
    updated.set('page', '1');
    setSearchParams(updated);
  };

  return (
    <nav className="bg-emerald-500">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-20">
          <div className="flex items-center flex-1">
            <Logo />
            <SearchMenu search={search} onSearchInputChange={onSearchInputChange} />
          </div>
          <MobileToggleButton isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />

          <DesktopAuthButtons
            userName={user?.username || 'User'}
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
          search={search}
          onSearchInputChange={onSearchInputChange}
        />
      </div>

      <Categories activeCategory={category} onClick={onCategoryClick} />
    </nav>
  );
};

export default Navbar;
