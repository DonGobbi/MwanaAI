import React from 'react';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="container py-6 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Logo size={28} />
          <p className="text-white font-semibold text-lg font-display">MwanaAI</p>
        </div>
        <p className="mb-2">
          AI-powered learning for every student in Malawi.
        </p>
        <p>&copy; {new Date().getFullYear()} MwanaAI. All rights reserved.</p>
        <p className="mt-1 text-xs">A Rexplore Research Labs product</p>
      </div>
    </footer>
  );
};

export default Footer;
