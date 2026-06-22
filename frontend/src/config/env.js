// Environment configuration
const env = {
  // Log the environment variables for debugging
  GROQ_API_KEY: process.env.REACT_APP_GROQ_API_KEY,
  GROQ_API_URL: process.env.REACT_APP_GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

// Debug log to see what environment variables are available
console.log('Available environment variables:', {
  GROQ_API_KEY: process.env.REACT_APP_GROQ_API_KEY ? 'exists' : 'missing',
  GROQ_API_URL: process.env.REACT_APP_GROQ_API_URL ? 'exists' : 'using default',
  NODE_ENV: process.env.NODE_ENV,
  ALL_ENV: process.env
});

export default env;
