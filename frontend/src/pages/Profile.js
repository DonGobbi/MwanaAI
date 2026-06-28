import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUser, FiShield, FiFileText, FiLock, FiLogOut, FiArrowLeft, FiCamera } from 'react-icons/fi';
import Button from '../components/Button';
import Card from '../components/Card';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import { TermsContent, PrivacyContent } from '../components/LegalContent';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { generateThumbnail } from '../services/fileUploadService';
import { calculateAge, formatDate, todayISO } from '../utils/age';
import { getGradeLevel } from '../config/curriculum';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  linkWithPopup,
  unlink,
  deleteUser
} from 'firebase/auth';

// OAuth providers a user can link. Only providers with `enabled: true` are
// shown, so users never see a "Connect" that errors. Once a provider is set up
// in the Firebase console (Authentication → Sign-in method), flip its `enabled`
// to true here. LinkedIn uses Firebase's generic OpenID Connect provider id
// 'oidc.linkedin' (created as an OIDC provider named "linkedin").
const LINK_PROVIDERS = [
  {
    id: 'google', label: 'Google', providerId: 'google.com', enabled: true,
    make: () => new GoogleAuthProvider(),
    icon: (
      <svg className="w-8 h-8 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: 'facebook', label: 'Facebook', providerId: 'facebook.com', enabled: false,
    make: () => new FacebookAuthProvider(),
    icon: (
      <svg className="w-8 h-8 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'linkedin', label: 'LinkedIn', providerId: 'oidc.linkedin', enabled: false,
    make: () => new OAuthProvider('oidc.linkedin'),
    icon: (
      <svg className="w-8 h-8 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
  },
];

const friendlyProviderError = (err, label) => {
  switch (err?.code) {
    case 'auth/operation-not-allowed':
      return `${label} sign-in isn't enabled yet. Enable it in the Firebase console (Authentication → Sign-in method).`;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''; // user simply closed the popup — not an error worth showing
    case 'auth/credential-already-in-use':
    case 'auth/account-exists-with-different-credential':
      return `That ${label} account is already linked to another user.`;
    case 'auth/popup-blocked':
      return 'Your browser blocked the popup. Allow popups and try again.';
    default:
      return err?.message || `Could not connect ${label}.`;
  }
};

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
  const { tab } = useParams();
  // The URL drives which panel shows on the right — the left nav stays put:
  // /profile, /profile/security, /profile/terms, /profile/privacy.
  const activeTab = ['security', 'terms', 'privacy'].includes(tab) ? tab : 'profile';
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
  const [linkingProvider, setLinkingProvider] = useState(''); // which provider id is busy
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

  const { currentUser, logout } = useAuth();

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
        else if (provider.providerId === 'oidc.linkedin') providers.push('linkedin');
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
      // Shrink to a small square in the browser and store it on the profile —
      // no Firebase Storage round-trip (which was hanging when Storage isn't
      // configured). The thumbnail is a compact JPEG data URL.
      const dataUrl = await generateThumbnail(file);
      if (!dataUrl) throw new Error('Could not read that image.');
      await firebaseService.saveUserProfile({ photoURL: dataUrl });
      setUserData((p) => ({ ...p, profileImage: dataUrl }));
      setFormData((p) => ({ ...p, profileImage: dataUrl }));
      setSuccessMessage('Profile photo updated!');
    } catch (err) {
      console.error('Photo update error:', err);
      setPhotoError('Could not update the photo. Please try a different image.');
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

  // Link/unlink one OAuth provider. Only the clicked provider shows a busy
  // state (tracked by id), so clicking Google doesn't spin Facebook/LinkedIn.
  const toggleProvider = async (p) => {
    setProviderError('');
    setLinkingProvider(p.id);
    try {
      const user = firebaseService.getCurrentUser();
      if (linkedProviders.includes(p.id)) {
        await unlink(user, p.providerId);
        setLinkedProviders((prev) => prev.filter((x) => x !== p.id));
      } else {
        await linkWithPopup(user, p.make());
        setLinkedProviders((prev) => [...prev, p.id]);
      }
    } catch (err) {
      console.error(`${p.label} link error:`, err);
      const msg = friendlyProviderError(err, p.label);
      if (msg) setProviderError(msg);
    } finally {
      setLinkingProvider('');
    }
  };

  const age = calculateAge(isEditing ? formData.dateOfBirth : userData.dateOfBirth);
  const initials = (userData.name || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const navItem = (active) =>
    `w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition-colors ${
      active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
    }`;
  const doLogout = async () => {
    try { await logout(); navigate('/'); } catch (e) { /* ignore */ }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* App bar — logo (left), theme toggle + account (right). */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="container h-16 flex items-center gap-2">
          <button onClick={() => navigate('/')} className="flex items-center" aria-label="MwanaAI home">
            <Logo size={36} />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 rounded-full border border-gray-200 pl-1 pr-3 py-1 hover:bg-gray-50 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">{initials}</span>
            <span className="hidden sm:inline text-sm font-medium text-gray-700">{userData.name || 'Account'}</span>
          </button>
        </div>
      </header>

      <div className="container py-8">
        {/* Back link + page title (full width, above the two columns). */}
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1.5">
          <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">Settings</h1>
        <p className="text-sm text-gray-400 mb-6">
          {[userData.email, ROLE_LABELS[accountMeta.role] || accountMeta.role].filter(Boolean).join(' · ')}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Settings nav — static; only the right panel changes. */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Account settings</p>

                {/* Avatar + photo */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="relative flex-shrink-0">
                    {userData.profileImage ? (
                      <img src={userData.profileImage} alt={userData.name || 'Profile'} className="w-14 h-14 rounded-full object-cover bg-gray-100" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold select-none">{initials}</div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <button type="button" onClick={handlePickPhoto} disabled={uploadingPhoto} title="Change photo"
                      className="absolute -bottom-1 -right-1 bg-primary-600 text-white p-1.5 rounded-full shadow hover:bg-primary-700 disabled:opacity-60">
                      {uploadingPhoto ? (
                        <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                      ) : (
                        <FiCamera className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{userData.name || 'User'}</p>
                    <StatusBadge status={accountMeta.status} />
                  </div>
                </div>
                {photoError && <p className="mt-2 text-xs text-red-600">{photoError}</p>}
              </div>

              <div className="border-t border-gray-100 p-3 space-y-4">
                <div>
                  <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Account</p>
                  <div className="space-y-1">
                    <button onClick={() => navigate('/profile')} className={navItem(activeTab === 'profile')}>
                      <FiUser className="w-4 h-4 flex-shrink-0" /> Profile
                    </button>
                    <button onClick={() => navigate('/profile/security')} className={navItem(activeTab === 'security')}>
                      <FiShield className="w-4 h-4 flex-shrink-0" /> Security
                    </button>
                  </div>
                </div>
                <div>
                  <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Resources</p>
                  <div className="space-y-1">
                    <button onClick={() => navigate('/profile/terms')} className={navItem(activeTab === 'terms')}>
                      <FiFileText className="w-4 h-4 flex-shrink-0" /> Terms of Use
                    </button>
                    <button onClick={() => navigate('/profile/privacy')} className={navItem(activeTab === 'privacy')}>
                      <FiLock className="w-4 h-4 flex-shrink-0" /> Privacy Policy
                    </button>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <button onClick={doLogout} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <FiLogOut className="w-4 h-4 flex-shrink-0" /> Logout
                  </button>
                </div>
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

            {activeTab === 'security' && (
              <Card>
                <Card.Header>
                  <h2 className="text-xl font-bold">Security</h2>
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
                        {LINK_PROVIDERS.filter((p) => p.enabled).map((p) => {
                          const connected = linkedProviders.includes(p.id);
                          const busy = linkingProvider === p.id;
                          return (
                            <div key={p.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                {p.icon}
                                <span className="ml-3 text-sm font-medium text-gray-700">{p.label}</span>
                              </div>
                              <Button
                                variant={connected ? 'danger' : 'outline'}
                                size="sm"
                                onClick={() => toggleProvider(p)}
                                disabled={busy}
                              >
                                {busy ? 'Processing...' : connected ? 'Disconnect' : 'Connect'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* A Super Admin can't delete their own account from here —
                        they're the sole owner of the platform. */}
                    {accountMeta.role !== 'superadmin' && (
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
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}

            {activeTab === 'terms' && (
              <Card>
                <Card.Body className="prose prose-sm max-w-none">
                  <TermsContent />
                </Card.Body>
              </Card>
            )}

            {activeTab === 'privacy' && (
              <Card>
                <Card.Body className="prose prose-sm max-w-none">
                  <PrivacyContent />
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
