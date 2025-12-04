import React from 'react';
import { Link } from 'react-router-dom';

const Logo = () => {
  return (
    <Link to={'/'} className="flex items-center gap-2 text-gray-900 font-extrabold text-2xl flex-shrink-0">
      <span>Waggle</span>
    </Link>
  );
};

export default Logo;
