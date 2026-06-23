import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import {
  FiGrid,
  FiBookOpen,
  FiMessageCircle,
  FiEdit3,
  FiBarChart2,
  FiUsers,
  FiUserCheck,
} from 'react-icons/fi';

const NAV = {
  student: [
    {
      label: 'Main',
      items: [
        { to: '/', icon: FiGrid, text: 'Dashboard', end: true },
        { to: '/learn', icon: FiBookOpen, text: 'Learn' },
        { to: '/tutor', icon: FiMessageCircle, text: 'Tutor' },
      ],
    },
    {
      label: 'Practice',
      items: [
        { to: '/quiz', icon: FiEdit3, text: 'Practice' },
        { to: '/progress', icon: FiBarChart2, text: 'Progress' },
      ],
    },
  ],
  teacher: [
    {
      label: 'Main',
      items: [
        { to: '/', icon: FiGrid, text: 'Dashboard', end: true },
        { to: '/teacher', icon: FiUsers, text: 'My Classes' },
        { to: '/tutor', icon: FiMessageCircle, text: 'Tutor' },
      ],
    },
  ],
  parent: [
    {
      label: 'Main',
      items: [
        { to: '/', icon: FiGrid, text: 'Dashboard', end: true },
        { to: '/child', icon: FiUserCheck, text: 'My Child' },
      ],
    },
  ],
};

const itemClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

const Sidebar = ({ open, onClose }) => {
  const { userProfile } = useAuth();
  const role = userProfile?.userType || 'student';
  const groups = NAV[role] || NAV.student;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link to="/" onClick={onClose} className="flex items-center gap-2 h-16 px-5 border-b border-gray-100 flex-shrink-0">
          <Logo size={32} />
          <span className="text-xl font-bold font-display text-gray-900">MwanaAI</span>
        </Link>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{g.label}</p>
              <div className="space-y-1">
                {g.items.map((it) => (
                  <NavLink key={it.to} to={it.to} end={it.end} onClick={onClose} className={itemClass}>
                    <it.icon className="w-5 h-5 flex-shrink-0" />
                    {it.text}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <p className="text-[11px] text-gray-400 leading-relaxed">A Rexplore Research Labs product</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
