// Base URL the browser uses to reach the MwanaAI backend API.
// In Docker the backend is exposed on host port 5100; override with
// REACT_APP_API_BASE for other environments.
export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5100';
