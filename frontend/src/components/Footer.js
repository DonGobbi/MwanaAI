import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="container py-6 text-center text-sm">
        <p className="text-white font-semibold text-lg mb-1">MwanaAI</p>
        <p className="mb-2">
          AI-powered learning for every student in Malawi.
        </p>
        <p>&copy; {new Date().getFullYear()} MwanaAI. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
