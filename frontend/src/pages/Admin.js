import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { schoolService } from '../services/schoolService';
import { GRADE_LEVELS, SUBJECTS } from '../config/curriculum';
import Spinner, { PageLoader } from '../components/Spinner';
import { FiHome, FiBookOpen, FiGrid, FiUsers } from 'react-icons/fi';

const Admin = () => {
  const { currentUser, userProfile } = useAuth();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      const s = await schoolService.getMySchool(currentUser.uid);
      setSchool(s);
      if (s) setName(s.name);
    } catch (err) {
      console.error('Could not load school:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMsg('');
    try {
      if (school) {
        await schoolService.updateSchool(school.id, name);
        setMsg('Saved ✓');
      } else {
        const s = await schoolService.createSchool(currentUser.uid, name);
        setSchool(s);
        setMsg('School created ✓');
      }
      load();
    } catch (err) {
      setMsg(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  // Admin area is for Super Admins only.
  if (userProfile && userProfile.userType !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-8 max-w-4xl"><PageLoader /></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">School administration</h1>
        <p className="text-gray-600 text-sm mb-6">Manage your school, classes, subjects and people.</p>

        {/* School */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <FiHome className="text-primary-600" />
            <h2 className="font-bold text-gray-900">School</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">{school ? 'Your school details.' : 'Create your school to get started.'}</p>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="School name (e.g. Blantyre Secondary School)"
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
            <button onClick={save} disabled={saving || !name.trim()}
              className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 rounded-lg transition-colors">
              {saving ? <Spinner className="w-4 h-4" /> : school ? 'Save' : 'Create school'}
            </button>
          </div>
          {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
        </div>

        {school && (
          <>
            {/* Classes (grades) */}
            <div className="card p-5 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <FiGrid className="text-primary-600" />
                <h2 className="font-bold text-gray-900">Classes</h2>
              </div>
              <p className="text-sm text-gray-500 mb-3">The grades students can be enrolled in (Malawi curriculum).</p>
              <div className="flex flex-wrap gap-2">
                {GRADE_LEVELS.map((g) => (
                  <span key={g.value} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{g.label}</span>
                ))}
              </div>
            </div>

            {/* Subjects */}
            <div className="card p-5 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <FiBookOpen className="text-primary-600" />
                <h2 className="font-bold text-gray-900">Subjects</h2>
              </div>
              <p className="text-sm text-gray-500 mb-3">Subjects offered (from the curriculum).</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <span key={s.value} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">{s.label}</span>
                ))}
              </div>
            </div>

            {/* People (next sub-phase) */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1">
                <FiUsers className="text-primary-600" />
                <h2 className="font-bold text-gray-900">People</h2>
              </div>
              <p className="text-sm text-gray-500">
                Add students and teachers and assign their classes &amp; subjects. Coming in the next step.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
