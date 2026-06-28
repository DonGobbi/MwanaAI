import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { GRADE_LEVELS, getGradeLevel } from '../config/curriculum';

const ROLE_LABELS = { student: 'Student', teacher: 'Teacher', parent: 'Parent', admin: 'School Admin' };
// Roles a person may pick for themselves at signup. Elevated roles (admin) are
// never granted from the URL — they come from the real invite on first sign-in.
const SELF_ROLES = ['student', 'teacher', 'parent'];

const Signup = () => {
  const navigate = useNavigate();
  const { signup, error: authError, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'student',
    gradeLevel: '',
    subjects: [],
    agreeToTerms: false
  });
  // When arriving from an invite link, the role (and class/subjects for
  // students) come from the URL — we then skip asking those questions.
  const [invite, setInvite] = useState(null);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Pre-fill from an invite link (/signup?email=&role=&grade=&subjects=&school=).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const email = p.get('email');
    const role = p.get('role');
    const grade = p.get('grade') || '';
    const subjects = (p.get('subjects') || '').split(',').filter(Boolean);
    const school = p.get('school') || '';
    setFormData((prev) => ({
      ...prev,
      ...(email ? { email } : {}),
      ...(role ? { userType: SELF_ROLES.includes(role) ? role : 'student', gradeLevel: grade, subjects } : {}),
    }));
    if (role) setInvite({ role, gradeLevel: grade, gradeLabel: getGradeLevel(grade)?.label || grade, subjects, schoolName: school });
  }, []);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Only a student signing up on their own needs to pick a class — invited
    // people (and non-students) get their class from the invite or not at all.
    if (!invite && formData.userType === 'student' && !formData.gradeLevel) {
      newErrors.gradeLevel = 'Please select your class';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Update error message if authError changes
  useEffect(() => {
    if (authError) {
      if (authError.includes('email')) {
        setErrors({ email: authError });
      } else {
        setErrors({ general: authError });
      }
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Set loading state to true to show the spinner
    setIsLoading(true);
    
    try {
      // Prepare user data for registration
      const userData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        userType: formData.userType,
        gradeLevel: formData.gradeLevel,
        subjects: formData.subjects || []
      };

      // Call the signup method from AuthContext
      await signup(userData);

      // Keep loading state for at least 1 second to ensure the user sees the loading indicator
      // This is especially important for fast operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Registration successful, redirect to login page
      navigate('/login', { state: { message: 'Account created successfully! Please log in to start learning.' } });
    } catch (err) {
      // Handle specific error messages
      if (err.message && err.message.toLowerCase().includes('email')) {
        setErrors({ email: err.message || 'This email is already in use.' });
      } else if (err.message && err.message.toLowerCase().includes('password')) {
        setErrors({ password: err.message || 'Password is too weak.' });
      } else {
        setErrors({ general: err.message || 'Failed to create account. Please try again.' });
      }
      
      console.error('Signup error:', err);
      
      // Set loading to false on error
      setIsLoading(false);
    }
  };
  
  // Already signed in? Don't show the signup form inside the app shell.
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2">
          <Logo size={44} />
          <span className="text-2xl font-bold font-display text-primary-700">MwanaAI</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {invite && (
            <div className="mb-6 bg-primary-50 border border-primary-100 rounded-lg p-4">
              <p className="text-sm font-semibold text-primary-800">
                You've been invited{invite.schoolName ? ` to ${invite.schoolName}` : ''} 🎉
              </p>
              <p className="text-sm text-primary-700 mt-0.5">
                Joining as <strong>{ROLE_LABELS[invite.role] || invite.role}</strong>
                {invite.role === 'student' && invite.gradeLabel ? ` · ${invite.gradeLabel}` : ''}
                {invite.role === 'student' && invite.subjects.length ? ` · ${invite.subjects.length} subject${invite.subjects.length !== 1 ? 's' : ''}` : ''}
                . Just set a password to finish.
              </p>
            </div>
          )}
          {errors.general && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              </div>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 border ${errors.firstName ? 'border-red-300' : 'border-gray-300'} rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                  />
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 border ${errors.lastName ? 'border-red-300' : 'border-gray-300'} rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                  />
                  {errors.lastName && (
                    <p className="mt-2 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  readOnly={!!invite}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${invite ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 pr-10 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {!invite && (
              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                  I am a
                </label>
                <div className="mt-1">
                  <select
                    id="userType"
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>
              </div>
            )}

            {!invite && formData.userType === 'student' && (
              <div>
                <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">
                  Class / Form
                </label>
                <div className="mt-1">
                  <select
                    id="gradeLevel"
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 border ${errors.gradeLevel ? 'border-red-300' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                  >
                    <option value="">Select your class</option>
                    <optgroup label="Primary">
                      {GRADE_LEVELS.filter((g) => g.stage === 'Primary').map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Secondary">
                      {GRADE_LEVELS.filter((g) => g.stage === 'Secondary').map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </optgroup>
                  </select>
                  {errors.gradeLevel && (
                    <p className="mt-2 text-sm text-red-600">{errors.gradeLevel}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className={`h-4 w-4 ${errors.agreeToTerms ? 'text-red-600 border-red-300' : 'text-primary-600 border-gray-300'} rounded focus:ring-primary-500`}
              />
              <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <Link to="/terms" className="font-medium text-primary-600 hover:text-primary-500">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-medium text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="mt-2 text-sm text-red-600">{errors.agreeToTerms}</p>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </span>
                ) : 'Create account'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
