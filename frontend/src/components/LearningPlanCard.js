import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A reusable card component for displaying a specific aspect of a personalized learning plan.
 * This can be used in various parts of the application to show learning recommendations.
 */
const LearningPlanCard = ({ title, icon, children, className, linkTo, linkText }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center mb-3">
        {icon && (
          <div className="flex-shrink-0 mr-3">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      
      <div className="mb-3">
        {children}
      </div>
      
      {linkTo && linkText && (
        <div className="mt-3 text-right">
          <Link 
            to={linkTo} 
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-800"
          >
            {linkText}
            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
};

export default LearningPlanCard;
