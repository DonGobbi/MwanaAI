import React, { useEffect } from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

// A small, reusable confirmation modal — replaces window.confirm() with
// something that matches the app's look. `tone` styles the confirm button
// and the icon (danger = red, primary = terracotta).
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmStyles = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-primary-600 hover:bg-primary-700';
  const iconStyles = tone === 'danger' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in" role="dialog" aria-modal="true">
        <button
          onClick={onCancel}
          disabled={busy}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 disabled:opacity-40"
          aria-label="Close"
        >
          <FiX className="w-5 h-5" />
        </button>
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${iconStyles}`}>
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {message && <p className="text-sm text-gray-600 mt-1.5">{message}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${confirmStyles}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
