import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { classService } from '../services/classService';
import { assignmentService } from '../services/assignmentService';

const TEACHER_SEEN_KEY = 'mwanaai_teacher_seen';

// Students: count of assignments still to do.
// Teachers: count of new assignment submissions since they last checked.
const NotificationBell = () => {
  const { currentUser, userProfile } = useAuth();
  const role = userProfile?.userType || 'student';
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentUser) return;
      try {
        if (role === 'teacher') {
          const since = Number(localStorage.getItem(TEACHER_SEEN_KEY) || 0);
          const classes = await classService.listClassesForTeacher(currentUser.uid);
          const subs = await assignmentService.teacherSubmissions(classes.map((c) => c.id), since);
          if (active) setCount(subs.length);
        } else {
          const classes = await classService.listClassesForStudent(currentUser.uid);
          const ids = classes.map((c) => c.classId);
          const [assignments, done] = await Promise.all([
            assignmentService.listForStudent(ids),
            assignmentService.completedByStudent(currentUser.uid),
          ]);
          if (active) setCount(assignments.filter((a) => !done.has(a.id)).length);
        }
      } catch (err) {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser, role]);

  const handleClick = () => {
    if (role === 'teacher') {
      localStorage.setItem(TEACHER_SEEN_KEY, String(Date.now()));
      setCount(0);
      navigate('/teacher');
    } else {
      navigate('/');
    }
  };

  const title =
    count > 0
      ? role === 'teacher'
        ? `${count} new submission${count > 1 ? 's' : ''}`
        : `${count} assignment${count > 1 ? 's' : ''} to do`
      : 'No new notifications';

  return (
    <button
      onClick={handleClick}
      className="relative text-gray-500 hover:text-primary-600 transition-colors p-1.5"
      title={title}
      aria-label="Notifications"
    >
      <FiBell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
