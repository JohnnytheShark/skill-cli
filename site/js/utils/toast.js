/**
 * toast.js — Lightweight Toast Notification Utility
 */

let toastTimeout = null;

export function showToast(message, duration = 2400) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Make globally accessible for inline handlers
window.showToast = showToast;
