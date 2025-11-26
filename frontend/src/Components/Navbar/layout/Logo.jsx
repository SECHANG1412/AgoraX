import React from 'react';
import { Link } from 'react-router-dom';

const Logo = () => {
  return (
    <Link to={'/'} className="text-gray-900 font-bold text-2xl flex-shrink-0">
      Waggle
    </Link>
  );
};

export default Logo;
