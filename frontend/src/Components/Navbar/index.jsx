import React, { useState } from 'react';
import Logo from './layout/Logo';
import DesktopAuthButtons from './auth/DesktopAuthButtons';
import MobileMenu from './layout/MobileMenu';
import MobileToggleButton from './layout/MobileToggleButton';
import Categories from './layout/Categories';
import SearchMenu from './layout/SearchMenu';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

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
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center gap-4 h-16">
          <Logo />
          <div className="hidden lg:block flex-1 max-w-2xl ml-4">
            <SearchMenu search={search} onSearchInputChange={onSearchInputChange} />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {isAuthenticated && (
              <Link
                to="/create-topic"
                className="hidden lg:inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                토픽 생성
              </Link>
            )}
            <DesktopAuthButtons
              userName={user?.username || 'User'}
              isAuthenticated={isAuthenticated}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              onLoginClick={onLoginClick}
              onLogoutClick={onLogoutClick}
              onSignupClick={onSignupClick}
            />
            <MobileToggleButton isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <Categories activeCategory={category} onClick={onCategoryClick} />
          <div className="lg:hidden w-full max-w-md ml-4">
            <SearchMenu search={search} onSearchInputChange={onSearchInputChange} />
          </div>
        </div>
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
    </nav>
  );
};

export default Navbar;
