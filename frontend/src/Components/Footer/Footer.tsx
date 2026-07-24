import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const quickLinks = [
    { label: 'Home', url: '/' },
    { label: 'Profile', url: '/profile' },
    { label: 'Contact', url: '/contact' },
  ];

  return (
    <footer className="border-t border-gray-200 bg-white text-gray-700">
      <div className="mx-auto max-w-3xl px-4 py-7">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start md:pl-14">  
          <div className="flex flex-col">
            <h3 className="mb-3 text-base font-semibold text-gray-900">Waggle</h3>
            <p className="max-w-xs text-sm leading-6 text-gray-600">
              Vote and discuss ideas.
            </p>
          </div>

          <nav className="flex flex-col" aria-label="푸터 바로가기">
            <h3 className="mb-3 text-base font-semibold text-gray-900">Quick Links</h3>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm leading-6 text-gray-600">
              {quickLinks.map(({ label, url }) => (
                <li key={label}>
                  <Link to={url} className="hover:text-gray-900">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col">
            <h3 className="-mt-px mb-2 text-base font-semibold text-gray-900">Email</h3>
            <p className="text-sm leading-6 text-gray-600">waggle0123@gmail.com</p>
          </div>
        </div>

        <div className="mt-7 border-t border-gray-200 pt-4 text-center">
          <p className="text-xs text-gray-500">&copy; 2026 Waggle. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
