import axios from 'axios';

// Base URL for API calls
const API_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to include auth token in requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication service functions
const authService = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error occurred' };
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Get user data after successful login
        const userResponse = await authService.getCurrentUser();
        return { ...response.data, user: userResponse.data };
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error occurred' };
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user data
  getCurrentUser: async () => {
    try {
      // Get user ID from token (this is a simplified approach)
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // In a real implementation, you would decode the token to get the user ID
      // For now, we'll make a request to a special endpoint
      const response = await apiClient.get('/auth/me');
      
      // Store user data in localStorage for convenience
      localStorage.setItem('user', JSON.stringify(response.data.data));
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error occurred' };
    }
  },

  // Check if user is logged in
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get stored user data
  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
};

export default authService;
