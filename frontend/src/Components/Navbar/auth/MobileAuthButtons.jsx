import React from 'react';
import { Link } from 'react-router-dom';

const MobileAuthButtons = ({ isAuthenticated, setIsOpen, onLoginClick, onLogoutClick, onSignupClick }) => {
  return (
    <div className="pt-2 flex flex-col space-y-2 w-full">
      {isAuthenticated ? (
        <>
          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-emerald-600 block px-3 py-2 rounded-md text-base font-medium transition-all duration-500 text-left"
          >
            프로필
          </Link>
          <button
            onClick={() => {
              setIsOpen(false);
              onLogoutClick();
            }}
            className="text-white hover:bg-emerald-600 block px-3 py-2 rounded-md text-base font-medium transition-all duration-500 text-left"
          >
            로그아웃
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              setIsOpen(false);
              onLoginClick();
            }}
            className="text-white hover:bg-emerald-600 block px-3 py-2 rounded-md text-base font-medium transition-all duration-500 text-left"
          >
            로그인
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onSignupClick();
            }}
            className="text-white hover:bg-emerald-600 block px-3 py-2 rounded-md text-base font-medium transition-all duration-500 text-left"
          >
            회원가입
          </button>
        </>
      )}
    </div>
  );
};

export default MobileAuthButtons;
