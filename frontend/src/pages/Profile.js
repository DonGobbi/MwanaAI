import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { uploadFile } from '../services/fileUploadService';
import { calculateAge, formatDate, todayISO } from '../utils/age';
import { getGradeLevel } from '../config/curriculum';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
  linkWithPopup,
  unlink,
  deleteUser
} from 'firebase/auth';

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};
const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];

const StatusBadge = ({ status }) => {
  const s = (status || 'active').toLowerCase();
  const styles = {
    active: 'bg-green-100 text-green-700',
    deactivated: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-600',
    archived: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[s] || styles.inactive}`}>
      {s}
    </span>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // OAuth providers state
  const [isLinkingProvider, setIsLinkingProvider] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [linkedProviders, setLinkedProviders] = useState([]);
  const [isPasswordAccount, setIsPasswordAccount] = useState(true);

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Profile photo upload
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const { currentUser } = useAuth();

  // User data state (editable personal info)
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    location: '',
    bio: '',
    profileImage: ''
  });

  // Read-only account info (role, school, status, membership)
  const [accountMeta, setAccountMeta] = useState({
    uid: '',
    role: 'student',
    school: '',
    status: 'active',
    gradeLabel: '',
    memberSince: '',
    lastSignIn: ''
  });

  // Form state for editing profile
  const [formData, setFormData] = useState({ ...userData });

  // Load user data from Firebase Auth + Firestore when component mounts.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!currentUser) return;

      // The real Firebase Auth user carries metadata + providerData (the context
      // copy is a trimmed plain object).
      const authUser = firebaseService.getCurrentUser();
      let profile = {};
      try {
        profile = (await firebaseService.getUserProfile()) || {};
      } catch (err) {
        console.error('Error loading profile:', err);
      }
      if (cancelled) return;

      const displayName = currentUser.displayName || profile.displayName || '';

      const data = {
        name: displayName,
        email: currentUser.email || profile.email || '',
        phone: profile.phone || '',
        gender: profile.gender || '',
        dateOfBirth: profile.dateOfBirth || '',
        location: profile.location || '',
        bio: profile.bio || '',
        profileImage: currentUser.photoURL || profile.photoURL || '',
      };
      setUserData(data);
      setFormData(data);

      setAccountMeta({
        uid: currentUser.uid,
        role: profile.userType || 'student',
        school: profile.schoolName || '',
        status: profile.status || 'active',
        gradeLabel: getGradeLevel(profile.gradeLevel)?.label || '',
        memberSince: authUser?.metadata?.creationTime || profile.createdAt || '',
        lastSignIn: authUser?.metadata?.lastSignInTime || '',
      });

      // Linked providers (read from the real auth user).
      const providers = [];
      let hasPassword = false;
      (authUser?.providerData || []).forEach((provider) => {
        if (provider.providerId === 'google.com') providers.push('google');
        else if (provider.providerId === 'facebook.com') providers.push('facebook');
        else if (provider.providerId === 'password') hasPassword = true;
      });
      setLinkedProviders(providers);
      setIsPasswordAccount(hasPassword);
    };
    load();
    return () => { cancelled = true; };
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const user = firebaseService.getCurrentUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Display name lives on the Firebase Auth profile.
      if (formData.name !== userData.name) {
        await updateProfile(user, { displayName: formData.name });
      }

      // Everything else is persisted to Firestore so it survives reloads.
      await firebaseService.saveUserProfile({
        displayName: formData.name,
        phone: formData.phone || '',
        gender: formData.gender || '',
        dateOfBirth: formData.dateOfBirth || '',
        location: formData.location || '',
        bio: formData.bio || '',
      });

      setUserData({ ...formData });
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
      console.error('Profile update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file (JPG or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be smaller than 5 MB.');
      return;
    }
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file, 'avatars');
      const user = firebaseService.getCurrentUser();
      await updateProfile(user, { photoURL: url });
      await firebaseService.saveUserProfile({ photoURL: url });
      setUserData((p) => ({ ...p, profileImage: url }));
      setFormData((p) => ({ ...p, profileImage: url }));
      setSuccessMessage('Profile photo updated!');
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoError('Could not upload the photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setIsChangingPassword(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      setIsChangingPassword(false);
      return;
    }

    try {
      const user = firebaseService.getCurrentUser();
      if (user) {
        const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwordData.newPassword);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordSuccess('Password updated successfully');
      } else {
        setPasswordError('User not authenticated');
      }
    } catch (err) {
      console.error('Password update error:', err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (err.code === 'auth/weak-password') {
        setPasswordError('Password is too weak. Choose a stronger password');
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordError('This operation requires recent authentication. Please log in again before retrying.');
      } else {
        setPasswordError('Failed to update password: ' + err.message);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const age = calculateAge(isEditing ? formData.dateOfBirth : userData.dateOfBirth);
  const initials = (userData.name || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section matching About/Resources page style */}
      <div className="bg-primary-700 text-white py-16 md:py-24">
        <div className="container">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              My Profile
            </h1>
            <p className="text-white text-lg mx-auto font-medium max-w-2xl mb-6">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <div className="p-6 text-center">
                <div className="relative inline-block">
                  {userData.profileImage ? (
                    <img
                      src={userData.profileImage}
                      alt={userData.name || 'Profile'}
                      className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow bg-primary-600 text-white flex items-center justify-center text-3xl font-bold select-none">
                      {initials}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full shadow-md hover:bg-primary-700 disabled:opacity-60"
                    onClick={handlePickPhoto}
                    disabled={uploadingPhoto}
                    title="Change photo"
                  >
                    {uploadingPhoto ? (
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                <h2 className="text-xl font-bold mt-4">{userData.name || 'User'}</h2>
                <p className="text-gray-600 text-sm">{userData.email}</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                    {ROLE_LABELS[accountMeta.role] || accountMeta.role}
                  </span>
                  <StatusBadge status={accountMeta.status} />
                </div>
                {photoError && <p className="mt-2 text-xs text-red-600">{photoError}</p>}
              </div>

              <div className="border-t border-gray-200">
                <nav className="flex flex-col">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center px-6 py-3 text-sm font-medium ${
                      activeTab === 'profile'
                        ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile Information
                  </button>

                  <button
                    onClick={() => setActiveTab('account')}
                    className={`flex items-center px-6 py-3 text-sm font-medium ${
                      activeTab === 'account'
                        ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </button>
                </nav>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <Card>
                  <Card.Header className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Profile Information</h2>
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(true);
                          setError('');
                          setSuccessMessage('');
                        }}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Profile
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData({ ...userData });
                            setIsEditing(false);
                            setError('');
                            setSuccessMessage('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSaveProfile} disabled={isLoading}>
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </span>
                          ) : 'Save Changes'}
                        </Button>
                      </div>
                    )}
                  </Card.Header>

                  <Card.Body>
                    {successMessage && (
                      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{successMessage}</span>
                      </div>
                    )}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{error}</span>
                      </div>
                    )}

                    {isEditing ? (
                      <form onSubmit={handleSaveProfile}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                              type="text" id="name" name="name"
                              value={formData.name || ''}
                              onChange={handleInputChange}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              required
                            />
                          </div>

                          <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                              type="email" id="email" name="email"
                              value={formData.email || ''}
                              className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm cursor-not-allowed"
                              disabled
                            />
                            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                          </div>

                          <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                              type="tel" id="phone" name="phone"
                              value={formData.phone || ''}
                              onChange={handleInputChange}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select
                              id="gender" name="gender"
                              value={formData.gender || ''}
                              onChange={handleInputChange}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                              <option value="">Select gender</option>
                              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                            <input
                              type="date" id="dateOfBirth" name="dateOfBirth"
                              value={formData.dateOfBirth || ''}
                              max={todayISO()}
                              onChange={handleInputChange}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="ageDisplay" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                            <input
                              id="ageDisplay"
                              type="text"
                              value={age != null ? `${age} years` : '—'}
                              readOnly
                              className="w-full rounded-md border-gray-200 bg-gray-50 text-gray-600 shadow-sm cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-500">Calculated from date of birth</p>
                          </div>

                          <div className="md:col-span-2">
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                              type="text" id="location" name="location"
                              value={formData.location || ''}
                              onChange={handleInputChange}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                            <textarea
                              id="bio" name="bio" rows={4}
                              value={formData.bio || ''}
                              onChange={handleInputChange}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                            <p className="mt-1 text-sm text-gray-900">{userData.name || 'Not set'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                            <p className="mt-1 text-sm text-gray-900">{userData.email || 'Not set'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                            <p className="mt-1 text-sm text-gray-900">{userData.phone || 'Not set'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                            <p className="mt-1 text-sm text-gray-900">{userData.gender || 'Not set'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
                            <p className="mt-1 text-sm text-gray-900">{userData.dateOfBirth ? formatDate(userData.dateOfBirth) : 'Not set'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Age</h3>
                            <p className="mt-1 text-sm text-gray-900">{age != null ? `${age} years` : 'Not set'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Location</h3>
                            <p className="mt-1 text-sm text-gray-900">{userData.location || 'Not set'}</p>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                          <p className="mt-1 text-sm text-gray-900">{userData.bio || 'Not set'}</p>
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>

                {/* Account information — read-only, managed by the school / system */}
                <Card>
                  <Card.Header>
                    <h2 className="text-xl font-bold">Account Information</h2>
                  </Card.Header>
                  <Card.Body>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Role</h3>
                        <p className="mt-1 text-sm text-gray-900">{ROLE_LABELS[accountMeta.role] || accountMeta.role}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Account Status</h3>
                        <p className="mt-1"><StatusBadge status={accountMeta.status} /></p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">School</h3>
                        <p className="mt-1 text-sm text-gray-900">{accountMeta.school || 'Not assigned'}</p>
                      </div>
                      {accountMeta.gradeLabel && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Class / Form</h3>
                          <p className="mt-1 text-sm text-gray-900">{accountMeta.gradeLabel}</p>
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(accountMeta.memberSince)}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Last Sign-in</h3>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(accountMeta.lastSignIn)}</p>
                      </div>
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500">User ID</h3>
                        <p className="mt-1 text-xs font-mono text-gray-500 break-all">{accountMeta.uid}</p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            )}

            {activeTab === 'account' && (
              <Card>
                <Card.Header>
                  <h2 className="text-xl font-bold">Account Settings</h2>
                </Card.Header>
                <Card.Body>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Change Password</h3>

                      {passwordSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mt-4" role="alert">
                          <span className="block sm:inline">{passwordSuccess}</span>
                        </div>
                      )}
                      {passwordError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                          <span className="block sm:inline">{passwordError}</span>
                        </div>
                      )}

                      <form onSubmit={handleUpdatePassword} className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
                          <input
                            type="password" id="currentPassword" name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                          <input
                            type="password" id="newPassword" name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            required minLength={6}
                          />
                        </div>
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                          <input
                            type="password" id="confirmPassword" name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <Button type="submit" variant="primary" size="sm" disabled={isChangingPassword}>
                            {isChangingPassword ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                              </span>
                            ) : 'Update Password'}
                          </Button>
                        </div>
                      </form>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Linked Accounts</h3>

                      {providerError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                          <span className="block sm:inline">{providerError}</span>
                        </div>
                      )}

                      <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg className="w-8 h-8 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="ml-3 text-sm font-medium text-gray-700">Google</span>
                          </div>
                          <Button
                            variant={linkedProviders.includes('google') ? "danger" : "outline"}
                            size="sm"
                            onClick={async () => {
                              try {
                                setIsLinkingProvider(true);
                                setProviderError('');
                                const user = firebaseService.getCurrentUser();
                                if (linkedProviders.includes('google')) {
                                  await unlink(user, GoogleAuthProvider.PROVIDER_ID);
                                  setLinkedProviders(linkedProviders.filter(p => p !== 'google'));
                                } else {
                                  const provider = new GoogleAuthProvider();
                                  await linkWithPopup(user, provider);
                                  setLinkedProviders([...linkedProviders, 'google']);
                                }
                              } catch (err) {
                                console.error('Google auth error:', err);
                                setProviderError(err.message || 'Failed to connect Google account');
                              } finally {
                                setIsLinkingProvider(false);
                              }
                            }}
                            disabled={isLinkingProvider}
                          >
                            {isLinkingProvider ? 'Processing...' : linkedProviders.includes('google') ? 'Disconnect' : 'Connect'}
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg className="w-8 h-8 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span className="ml-3 text-sm font-medium text-gray-700">Facebook</span>
                          </div>
                          <Button
                            variant={linkedProviders.includes('facebook') ? "danger" : "outline"}
                            size="sm"
                            onClick={async () => {
                              try {
                                setIsLinkingProvider(true);
                                setProviderError('');
                                const user = firebaseService.getCurrentUser();
                                if (linkedProviders.includes('facebook')) {
                                  await unlink(user, FacebookAuthProvider.PROVIDER_ID);
                                  setLinkedProviders(linkedProviders.filter(p => p !== 'facebook'));
                                } else {
                                  const provider = new FacebookAuthProvider();
                                  await linkWithPopup(user, provider);
                                  setLinkedProviders([...linkedProviders, 'facebook']);
                                }
                              } catch (err) {
                                console.error('Facebook auth error:', err);
                                setProviderError(err.message || 'Failed to connect Facebook account');
                              } finally {
                                setIsLinkingProvider(false);
                              }
                            }}
                            disabled={isLinkingProvider}
                          >
                            {isLinkingProvider ? 'Processing...' : linkedProviders.includes('facebook') ? 'Disconnect' : 'Connect'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>

                      {deleteError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                          <span className="block sm:inline">{deleteError}</span>
                        </div>
                      )}

                      <div className="mt-4">
                        {!showDeleteConfirm ? (
                          <>
                            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                              Delete Account
                            </Button>
                            <p className="mt-2 text-xs text-gray-500">
                              Once you delete your account, there is no going back. Please be certain.
                            </p>
                          </>
                        ) : (
                          <div className="bg-red-50 border border-red-200 p-4 rounded">
                            <h4 className="font-medium text-red-800 mb-2">Confirm Account Deletion</h4>
                            <p className="text-sm text-red-700 mb-4">
                              This action cannot be undone. All your data will be permanently deleted.
                            </p>

                            {isPasswordAccount && (
                              <div className="mb-4">
                                <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-1">
                                  Enter your password to confirm
                                </label>
                                <input
                                  type="password" id="deletePassword"
                                  value={deletePassword}
                                  onChange={(e) => setDeletePassword(e.target.value)}
                                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                                  required
                                />
                              </div>
                            )}

                            <div className="flex space-x-3">
                              <Button
                                variant="danger" size="sm" disabled={isDeletingAccount}
                                onClick={async () => {
                                  try {
                                    setIsDeletingAccount(true);
                                    setDeleteError('');
                                    const user = firebaseService.getCurrentUser();
                                    if (user) {
                                      if (isPasswordAccount) {
                                        if (!deletePassword) {
                                          setDeleteError('Password is required to delete account');
                                          setIsDeletingAccount(false);
                                          return;
                                        }
                                        const credential = EmailAuthProvider.credential(user.email, deletePassword);
                                        await reauthenticateWithCredential(user, credential);
                                      }
                                      await deleteUser(user);
                                      navigate('/');
                                    }
                                  } catch (err) {
                                    console.error('Account deletion error:', err);
                                    if (err.code === 'auth/wrong-password') {
                                      setDeleteError('Incorrect password');
                                    } else if (err.code === 'auth/requires-recent-login') {
                                      setDeleteError('This operation requires recent authentication. Please log in again before retrying.');
                                    } else {
                                      setDeleteError('Failed to delete account: ' + err.message);
                                    }
                                    setIsDeletingAccount(false);
                                  }
                                }}
                              >
                                {isDeletingAccount ? 'Deleting...' : 'Confirm Delete'}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => {
                                  setShowDeleteConfirm(false);
                                  setDeletePassword('');
                                  setDeleteError('');
                                }}
                                disabled={isDeletingAccount}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
