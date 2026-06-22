import React from 'react';

// A friendly illustrated empty state: a soft layered badge with an icon,
// a title, a short message and an optional call to action (children).
const EmptyState = ({ icon: Icon, title, description, children, compact = false }) => (
  <div className={`text-center animate-fade-in-up ${compact ? 'py-6' : 'py-10'}`}>
    <div className={`relative mx-auto mb-4 ${compact ? 'w-16 h-16' : 'w-24 h-24'}`}>
      <span className="absolute inset-0 rounded-full bg-primary-50" />
      <span className="absolute inset-[14%] rounded-full bg-primary-100" />
      <span className="absolute inset-0 flex items-center justify-center text-primary-500">
        {Icon && <Icon className={compact ? 'w-7 h-7' : 'w-10 h-10'} />}
      </span>
    </div>
    <h3 className={`font-semibold text-gray-800 ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
    {description && (
      <p className="text-gray-500 text-sm mt-1 mb-5 max-w-sm mx-auto">{description}</p>
    )}
    {children}
  </div>
);

export default EmptyState;
