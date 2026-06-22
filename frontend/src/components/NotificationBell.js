import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { classService } from '../services/classService';
import { assignmentService } from '../services/assignmentService';

// Shows a count of the student's assignments that aren't done yet.
const NotificationBell = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentUser) return;
      try {
        const classes = await classService.listClassesForStudent(currentUser.uid);
        const ids = classes.map((c) => c.classId);
        const [assignments, done] = await Promise.all([
          assignmentService.listForStudent(ids),
          assignmentService.completedByStudent(currentUser.uid),
        ]);
        if (active) setPending(assignments.filter((a) => !done.has(a.id)).length);
      } catch (err) {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  return (
    <button
      onClick={() => navigate('/')}
      className="relative text-gray-500 hover:text-primary-600 transition-colors p-1.5"
      title={pending > 0 ? `${pending} assignment${pending > 1 ? 's' : ''} to do` : 'No new assignments'}
      aria-label="Assignments"
    >
      <FiBell className="w-5 h-5" />
      {pending > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
          {pending}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
