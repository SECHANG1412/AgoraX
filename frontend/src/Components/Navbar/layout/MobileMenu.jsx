import React from 'react';
import { BiSearch } from 'react-icons/bi';
import SharedNavLinks from '../shared/SharedNavLinks';
import MobileAuthButtons from '../auth/MobileAuthButtons';
import { Link } from 'react-router-dom';

const MobileMenu = ({
  isOpen,
  setIsOpen,
  isAuthenticated,
  onLoginClick,
  onLogoutClick,
  onSignupClick,
  search,
  onSearchInputChange,
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
        <form className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <BiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={onSearchInputChange}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
            placeholder="검색"
          />
        </form>

        <div className="pb-2 border-b border-gray-200">
          <SharedNavLinks
            linkClassName="block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-gray-100 transition-colors"
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
              토픽 생성
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
