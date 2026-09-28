import React from 'react';

export default function NotificationToast({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast toast--${toast.type || 'info'}`}
          onClick={() => onClose(toast.id)}
        >
          <span>
            {toast.type === 'success' && '✓ '}
            {toast.type === 'error' && '✕ '}
            {toast.type === 'info' && 'ℹ '}
            {toast.message}
          </span>
        </div>
      ))}
    </div>
  );
}
