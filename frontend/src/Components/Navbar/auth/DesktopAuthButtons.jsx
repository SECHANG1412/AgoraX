import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const AvatarPlaceholder = ({ name }) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="w-10 h-10 bg-blue-50 text-blue-700 flex items-center justify-center rounded-full font-bold text-sm cursor-pointer border border-blue-100">
      {initials}
    </div>
  );
};

const DesktopAuthButtons = ({
  userName,
  isAuthenticated,
  isOpen,
  setIsOpen,
  onLoginClick,
  onLogoutClick,
  onSignupClick,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  return (
    <div className="hidden md:flex items-center">
      {isAuthenticated ? (
        <div className="relative ml-4" ref={containerRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center focus:outline-none border border-gray-200 rounded-full p-1 hover:border-blue-300 transition"
          >
            <AvatarPlaceholder name={userName} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-3 w-60 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <AvatarPlaceholder name={userName} />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">{userName}</span>
                  <span className="text-xs text-gray-500">내 프로필</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                  onClick={() => setIsOpen(false)}
                >
                  <span>프로필</span>
                </Link>
              </div>

              <div className="border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogoutClick();
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-gray-50"
                >
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex space-x-3">
          <button
            onClick={onLoginClick}
            className="px-3 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            로그인
          </button>
          <button
            onClick={onSignupClick}
            className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            가입하기
          </button>
        </div>
      )}
    </div>
  );
};

export default DesktopAuthButtons;
