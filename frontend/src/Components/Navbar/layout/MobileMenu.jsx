import React from 'react';
import SharedNavLinks from '../shared/SharedNavLinks';
import MobileAuthButtons from '../auth/MobileAuthButtons';
import { Link } from 'react-router-dom';
import SearchMenu from './SearchMenu';

const MobileMenu = ({
  isOpen,
  setIsOpen,
  isAuthenticated,
  onLoginClick,
  onLogoutClick,
  onSignupClick,
  searchValue,
  onSearchInputChange,
  onSearchSubmit,
}) => {
  return (
    <div
      className={`md:hidden transform transition-all duration-300 ease-in-out ${
        isOpen
          ? 'opacity-100 translate-y-0 bg-white border-t border-gray-200 shadow-sm'
          : 'opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden'
      }`}
    >
      <div className="px-4 pt-3 pb-4 space-y-3">
        <SearchMenu
          searchValue={searchValue}
          onSearchInputChange={onSearchInputChange}
          onSearchSubmit={() => {
            onSearchSubmit?.();
            setIsOpen(false);
          }}
        />

        <div className="pb-2 border-b border-gray-200">
          <SharedNavLinks
            linkClassName="block px-3 py-2 rounded-md text-base font-semibold text-gray-800 hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(false)}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {isAuthenticated && (
          <div className="pb-2">
            <Link
              to="/create-topic"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              토픽 만들기
            </Link>
          </div>
        )}

        <MobileAuthButtons
          isAuthenticated={isAuthenticated}
          setIsOpen={setIsOpen}
          onLoginClick={onLoginClick}
          onLogoutClick={onLogoutClick}
          onSignupClick={onSignupClick}
        />
      </div>
    </div>
  );
};

export default MobileMenu;
