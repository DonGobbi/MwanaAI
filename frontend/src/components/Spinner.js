import React from 'react';

// Lightweight spinner. Inherits the current text color, so it works on coloured
// buttons (white text) and on light backgrounds alike. Pass `label` to show text
// beside it, or use it on its own.
const Spinner = ({ className = 'w-5 h-5', label }) => (
  <span className="inline-flex items-center gap-2">
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    {label && <span>{label}</span>}
  </span>
);

// A centered spinner for loading a section/page of content.
export const PageLoader = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-12 text-primary-600">
    <Spinner className="w-8 h-8" />
    {label && <p className="text-sm text-gray-500 mt-3">{label}</p>}
  </div>
);

export default Spinner;
