import React from 'react'
import { Link } from "react-router-dom";
import { MENU_LINKS } from '../../../constants/menuLinks';

const SharedNavLinks = ({ linkClassName, onClick}) => 
  MENU_LINKS.map(({ to, label }) => (
    <Link key={to} to={to} onClick={onClick} className={linkClassName}>
      {label}
    </Link>
  ));

export default SharedNavLinks
