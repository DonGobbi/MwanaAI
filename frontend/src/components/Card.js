import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  variant = 'default',
  hover = false,
  ...props 
}) => {
  // Base classes
  const baseClasses = 'rounded-lg overflow-hidden';
  
  // Variant classes
  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white shadow-md',
    flat: 'bg-white border border-gray-200',
    transparent: 'bg-transparent',
  };
  
  // Disable hover effects to prevent trembling
  const hoverClass = hover ? 'shadow-md' : '';
  
  // Combine all classes
  const classes = `${baseClasses} ${variantClasses[variant]} ${hoverClass} ${className}`;
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

// Card subcomponents
Card.Header = ({ children, className = '', ...props }) => (
  <div className={`p-4 border-b border-gray-200 ${className}`} {...props}>
    {children}
  </div>
);

Card.Body = ({ children, className = '', ...props }) => (
  <div className={`p-4 ${className}`} {...props}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '', ...props }) => (
  <div className={`p-4 border-t border-gray-200 ${className}`} {...props}>
    {children}
  </div>
);

Card.Image = ({ src, alt, className = '', ...props }) => (
  <div className="relative overflow-hidden">
    <img 
      src={src} 
      alt={alt || ''} 
      className={`w-full h-auto transform-gpu backface-visibility-hidden ${className}`}
      loading="lazy"
      onError={(e) => {
        e.target.onerror = null;
        // Use a data URI for the placeholder to avoid network requests
        e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%23EEEEEE%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22100%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23999999%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
      }}
      {...props}
    />
  </div>
);

Card.Title = ({ children, className = '', ...props }) => (
  <h3 className={`text-xl font-bold text-gray-900 ${className}`} {...props}>
    {children}
  </h3>
);

Card.Subtitle = ({ children, className = '', ...props }) => (
  <p className={`text-gray-700 ${className}`} {...props}>
    {children}
  </p>
);

export default Card;
