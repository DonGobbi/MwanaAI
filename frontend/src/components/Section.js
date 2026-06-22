import React from 'react';

const Section = ({
  children,
  className = '',
  bgColor = 'bg-white',
  spacing = 'py-12 md:py-16 lg:py-20',
  container = true,
  id,
  ...props
}) => {
  return (
    <section id={id} className={`${bgColor} ${spacing} ${className}`} {...props}>
      {container ? (
        <div className="container">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
};

// Section subcomponents
Section.Header = ({ 
  title, 
  subtitle, 
  centered = true, 
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  ...props 
}) => {
  const alignment = centered ? 'text-center' : '';
  
  return (
    <div className={`mb-12 ${alignment} ${className}`} {...props}>
      {title && (
        <h2 className={`text-3xl md:text-4xl font-bold text-gray-800 mb-4 ${titleClassName}`}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={`text-xl text-gray-600 max-w-3xl ${centered ? 'mx-auto' : ''} ${subtitleClassName}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

Section.Grid = ({
  children,
  cols = 3,
  gap = 8,
  className = '',
  ...props
}) => {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };
  
  return (
    <div 
      className={`grid ${colsClass[cols]} gap-${gap} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Section.TwoColumn = ({
  left,
  right,
  reversed = false,
  verticalAlign = 'items-center',
  className = '',
  leftClassName = '',
  rightClassName = '',
  ...props
}) => {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 ${verticalAlign} ${className}`} {...props}>
      <div className={`${reversed ? 'lg:order-2' : ''} ${leftClassName}`}>
        {left}
      </div>
      <div className={`${reversed ? 'lg:order-1' : ''} ${rightClassName}`}>
        {right}
      </div>
    </div>
  );
};

export default Section;
