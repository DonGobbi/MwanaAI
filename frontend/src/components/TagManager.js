import React, { useState, useEffect } from 'react';

/**
 * TagManager Component
 * 
 * A reusable component for managing tags in the content management system.
 * Supports adding, removing, and displaying tags with customizable styling.
 * 
 * @param {Object} props
 * @param {Array} props.tags - Array of current tags
 * @param {Function} props.onChange - Callback when tags change
 * @param {String} props.placeholder - Placeholder text for input
 * @param {String} props.colorScheme - Color scheme for tags (primary, secondary, success, warning, danger)
 */
const TagManager = ({ 
  tags = [], 
  onChange, 
  placeholder = "Add a tag...",
  colorScheme = "primary" 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [localTags, setLocalTags] = useState(tags);
  
  // Color schemes for tags
  const colorSchemes = {
    primary: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      hover: 'bg-blue-200',
      button: 'text-blue-500'
    },
    secondary: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      hover: 'bg-gray-200',
      button: 'text-gray-500'
    },
    success: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      hover: 'bg-green-200',
      button: 'text-green-500'
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      hover: 'bg-yellow-200',
      button: 'text-yellow-500'
    },
    danger: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      hover: 'bg-red-200',
      button: 'text-red-500'
    }
  };
  
  // Get color classes based on selected scheme
  const colors = colorSchemes[colorScheme] || colorSchemes.primary;
  
  // Update local tags when props change
  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);
  
  // Add a new tag
  const handleAddTag = () => {
    if (inputValue.trim() && !localTags.includes(inputValue.trim())) {
      const updatedTags = [...localTags, inputValue.trim()];
      setLocalTags(updatedTags);
      onChange(updatedTags);
      setInputValue('');
    }
  };
  
  // Remove a tag
  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = localTags.filter(tag => tag !== tagToRemove);
    setLocalTags(updatedTags);
    onChange(updatedTags);
  };
  
  // Handle key press (Enter to add tag)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  return (
    <div className="w-full">
      {/* Display existing tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {localTags.map((tag, index) => (
          <span 
            key={index} 
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className={`ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full ${colors.hover} ${colors.button} hover:${colors.hover}`}
              aria-label={`Remove ${tag} tag`}
            >
              <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      
      {/* Input for adding new tags */}
      <div className="flex">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-grow rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
        />
        <button
          type="button"
          onClick={handleAddTag}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default TagManager;
