import React from 'react';
import { BiSearch } from 'react-icons/bi';
import SharedNavLinks from '../shared/SharedNavLinks';
import MobileAuthButtons from '../auth/MobileAuthButtons';

const MobileMenu = ({ isOpen, setIsOpen, isAuthenticated, onLoginClick, onLogoutClick, onSignupClick }) => {
  return (
    <div
      className={`md:hidden transform transition-all duration-500 ease-in-out ${
        isOpen
          ? 'opacity-100 translate-y-0 bg-emerald-500'
          : 'opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden'
      }`}
    >
      <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
        <form className="relative max-w-6xl mx-auto mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <BiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-md leading-5 bg-emerald-100 text-emerald-900 placeholder-emerald-500 hover:bg-white hover:text-emerald-900 hover:placeholder-emerald-400 sm:text-sm transition-all duration-500"
            placeholder="토픽 검색하기..."
          />
        </form>

        <div className="pb-2 mb-2">
          <SharedNavLinks
            linkClassName="text-white hover:bg-emerald-600 block px-3 py-2 rounded-md text-base font-medium transition-all duration-500"
            onClick={() => setIsOpen(false)}
          />
        </div>

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
