import React from 'react';

/**
 * A reusable loading spinner component with configurable size
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner: 'sm', 'md', 'lg'
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSpinner = ({ size = 'md', className = '' }) => {
  // Determine size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  const spinnerSize = sizeClasses[size] || sizeClasses.md;
  
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className={`${spinnerSize} border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin`}></div>
    </div>
  );
};

export default LoadingSpinner;
