import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiSliders, FiBookmark } from 'react-icons/fi';
import Logo from './layout/Logo';
import DesktopAuthButtons from './auth/DesktopAuthButtons';
import MobileMenu from './layout/MobileMenu';
import MobileToggleButton from './layout/MobileToggleButton';
import Categories from './layout/Categories';
import SearchMenu from './layout/SearchMenu';
import { useAuth } from '../../hooks/useAuth';

const Navbar = ({ onLoginClick, onSignupClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, isAuthenticated, user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(search);
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

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const onSearchSubmit = () => {
    const updated = new URLSearchParams(searchParams);
    if (searchInput) {
      updated.set('search', searchInput);
    } else {
      updated.delete('search');
    }
    updated.set('page', '1');
    setSearchParams(updated);
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4 lg:px-6 py-2">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="w-full lg:w-1/2">
            <SearchMenu
              searchValue={searchInput}
              onSearchInputChange={(e) => setSearchInput(e.target.value)}
              onSearchSubmit={onSearchSubmit}
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {isAuthenticated && (
              <Link
                to="/create-topic"
                className="hidden lg:inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                토픽 만들기
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

        <div className="mt-3">
          <Categories activeCategory={category} onClick={onCategoryClick} />
        </div>
      </div>

      <MobileMenu
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isAuthenticated={isAuthenticated}
        onLoginClick={onLoginClick}
        onLogoutClick={onLogoutClick}
        onSignupClick={onSignupClick}
        searchValue={searchInput}
        onSearchInputChange={(e) => setSearchInput(e.target.value)}
        onSearchSubmit={onSearchSubmit}
      />
    </nav>
  );
};

export default Navbar;
