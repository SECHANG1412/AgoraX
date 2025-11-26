import React from 'react';
import { Link } from 'react-router-dom';
import { MENU_LINKS } from '../../../constants/menuLinks';

const SharedNavLinks = ({ linkClassName, onClick, isAuthenticated }) =>
  MENU_LINKS.filter(({ to }) => (to === '/create-topic' ? isAuthenticated : true)).map(({ to, label }) => (
    <Link key={to} to={to} onClick={onClick} className={linkClassName}>
      {label}
    </Link>
  ));

export default SharedNavLinks;
