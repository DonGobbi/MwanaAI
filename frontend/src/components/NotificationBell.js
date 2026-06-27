import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiAlertTriangle, FiTrendingUp, FiClipboard, FiCheckCircle, FiInbox } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { generateNotifications } from '../services/notificationEngine';

const ICONS = {
  struggle: { Icon: FiAlertTriangle, color: 'text-amber-500 bg-amber-50' },
  win: { Icon: FiTrendingUp, color: 'text-green-600 bg-green-50' },
  assignment: { Icon: FiClipboard, color: 'text-primary-600 bg-primary-50' },
  submission: { Icon: FiCheckCircle, color: 'text-sky-600 bg-sky-50' },
  info: { Icon: FiBell, color: 'text-gray-500 bg-gray-100' },
};

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

const NotificationBell = () => {
  const { currentUser, userProfile } = useAuth();
  const role = userProfile?.userType || 'student';
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      setItems(await notificationService.listForUser(currentUser.uid));
    } catch (e) {
      /* ignore */
    }
  }, [currentUser]);

  // On mount: generate any new alerts from the latest data, then load the feed.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentUser) return;
      await generateNotifications(currentUser, role);
      if (active) await load();
    })();
    return () => { active = false; };
  }, [currentUser, role, load]);

  const unread = items.filter((n) => !n.read).length;

  const openPanel = async () => {
    const next = !open;
    setOpen(next);
    if (next) await load(); // refresh when opening
  };

  const clickItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      try { await notificationService.markRead(n.id); } catch (e) { /* ignore */ }
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try { await notificationService.markAllRead(items); } catch (e) { /* ignore */ }
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={openPanel}
        className="relative text-gray-500 hover:text-primary-600 transition-colors p-1.5"
        title={unread > 0 ? `${unread} new notification${unread > 1 ? 's' : ''}` : 'Notifications'}
        aria-label="Notifications"
      >
        <FiBell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 card p-0 z-20 shadow-lg max-h-[28rem] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Notifications</p>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-primary-600 hover:underline">Mark all read</button>
              )}
            </div>

            <div className="overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-400">
                  <FiInbox className="w-7 h-7 mx-auto mb-2" />
                  <p className="text-sm">You're all caught up.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {items.map((n) => {
                    const { Icon, color } = ICONS[n.type] || ICONS.info;
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => clickItem(n)}
                          className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${n.read ? '' : 'bg-primary-50/40'}`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800 truncate">{n.title}</span>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />}
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5">{n.body}</span>
                            <span className="block text-[11px] text-gray-300 mt-0.5">{timeAgo(n.createdAt)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
