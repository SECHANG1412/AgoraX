import React from 'react';
import { FaHeart } from 'react-icons/fa';

const Header = ({ title, liked, likes, onLikeClick, actions }) => {
  return (
    <div className="flex justify-between items-start mb-4 gap-4">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={onLikeClick}
          className="flex items-center space-x-2 text-lg font-semibold transition-all px-3 py-2 rounded-xl border border-gray-200 hover:border-blue-400"
        >
          <FaHeart className={`w-6 h-6 ${liked ? 'text-rose-500' : 'text-gray-300'}`} />
          <span>{likes}</span>
        </button>
      </div>
    </div>
  );
};

export default Header;
