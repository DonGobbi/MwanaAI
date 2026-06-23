import React from 'react';

// MwanaAI brand mark: a graduation cap in a gradient rounded square.
const Logo = ({ size = 36, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    className={className}
    role="img"
    aria-label="MwanaAI logo"
  >
    <defs>
      <linearGradient id="mwanaai-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f59e0b" />
        <stop offset="0.55" stopColor="#ea580c" />
        <stop offset="1" stopColor="#c2410c" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#mwanaai-grad)" />
    {/* mortarboard */}
    <path fill="#ffffff" d="M24 13 L42 20 L24 27 L6 20 Z" />
    {/* cap band */}
    <path
      fill="#ffffff"
      fillOpacity="0.92"
      d="M15 22.7 L15 28.6 C15 31.6 33 31.6 33 28.6 L33 22.7 L24 26.3 Z"
    />
    {/* tassel */}
    <path
      stroke="#ffffff"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
      d="M40 20.6 L40 29"
    />
    <circle cx="40" cy="30.6" r="1.8" fill="#ffffff" />
  </svg>
);

export default Logo;
