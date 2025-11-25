import React from 'react';
import { FaHeart } from 'react-icons/fa';

const Header = ({ title, liked, likes, onLikeClick, actions }) => {
  return (
    <div className="flex justify-between items-start mb-4 gap-4">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-emerald-500">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={onLikeClick}
          className="flex items-center space-x-2 text-lg font-semibold transition-all"
        >
          <FaHeart className={`w-7 h-7 ${liked ? 'fill-emerald-500' : 'fill-none stroke-20 storke-black'}`} />
          <span>{likes}</span>
        </button>
      </div>
    </div>
  );
};

export default Header;
