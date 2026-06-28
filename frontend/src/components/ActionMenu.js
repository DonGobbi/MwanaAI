import React, { useState, useRef, useEffect } from 'react';
import { FiMoreVertical } from 'react-icons/fi';

// A "⋮" overflow menu. Sensitive actions (deactivate, suspend, reset) live in
// here rather than as bare buttons, so they can't be triggered by an accidental
// tap — you open the menu first, then choose, then confirm.
//
// items: array of { label, icon?, tone?: 'danger' | 'success', onClick } (falsy
// entries are ignored so callers can inline conditionals).
const ActionMenu = ({ items = [], label = 'More actions' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  const toneClass = (tone) =>
    tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-green-600' : 'text-gray-700';

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
      >
        <FiMoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30 animate-fade-in">
          {visible.map((it, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => { setOpen(false); it.onClick?.(); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left hover:bg-gray-50 ${toneClass(it.tone)}`}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
