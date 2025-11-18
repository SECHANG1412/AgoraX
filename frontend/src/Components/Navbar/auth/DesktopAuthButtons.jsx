import React from 'react';
import { Link } from 'react-router-dom';

const AvatarPlaceholder = ({ name }) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="w-10 h-10 bg-gray-200 text-gray-800 flex items-center justify-center rounded-full font-bold text-sm cursor-pointer">
      {initials}
    </div>
  );
};

const DesktopAuthButtons = ({ userName, isAuthenticated, isOpen, setIsOpen, onLoginClick, onLogoutClick, onSignupClick }) => {
  return (
    <div className="hidden md:flex items-center ml-8">
      {isAuthenticated ? (
        <div className="relative ml-4">
          <button onClick={() => setIsOpen(!isOpen)} className="flex items-center focus:outline-none">
            <AvatarPlaceholder name={userName} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
              <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                프로필
              </Link>
              <Link to="/contact" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                문의하기
              </Link>
              <button
                onClick={onLogoutClick}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex space-x-4">
          <button
            onClick={onLoginClick}
            className="text-white hover:bg-emerald-600 px-3 py-2 rounded-md text-sm font-medium transition-all duration-500"
          >
            로그인
          </button>
          <button
            onClick={onSignupClick}
            className="text-emerald-500 bg-white hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-all duration-500"
          >
            회원가입
          </button>
        </div>
      )}
    </div>
  );
};

export default DesktopAuthButtons;
