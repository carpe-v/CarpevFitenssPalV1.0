import { protectRoute, logout } from '../authGuard.js';
import { supabase } from '../supabaseClient.js';

const profile = await protectRoute('RoleA');

if (profile) {
  const email = profile.email || '';
  const userInfoEl = document.getElementById('user-info');
  const menuEmailEl = document.getElementById('menu-user-email');
  const avatarBtnEl = document.getElementById('avatar-btn');

  if (userInfoEl) {
    userInfoEl.textContent = `Logat ca: ${email} (${profile.role})`;
  }

  if (menuEmailEl) {
    menuEmailEl.textContent = email;
  }

  if (avatarBtnEl) {
    const initials =
      email
        .split('@')[0]
        .split(/[._+-]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('') || 'RA';
    avatarBtnEl.textContent = initials;
  }
}

const avatarBtn = document.getElementById('avatar-btn');
const dropdown = document.getElementById('avatar-dropdown');
const openPasswordBtn = document.getElementById('open-password-modal');
const logoutBtn = document.getElementById('logout-btn');

const modal = document.getElementById('password-modal');
const passwordForm = document.getElementById('password-form');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const cancelPasswordBtn = document.getElementById('cancel-password-btn');
const savePasswordBtn = document.getElementById('save-password-btn');
const passwordMessage = document.getElementById('password-message');

function setPasswordMessage(text, type = '') {
  if (!passwordMessage) return;
  passwordMessage.textContent = text;
  passwordMessage.className = type ? `message ${type}` : 'message';
}

function closeDropdown() {
  if (!dropdown || !avatarBtn) return;
  dropdown.classList.add('hidden');
  avatarBtn.setAttribute('aria-expanded', 'false');
}

function toggleDropdown(e) {
  e.stopPropagation();
  if (!dropdown || !avatarBtn) return;
  const isHidden = dropdown.classList.contains('hidden');
  dropdown.classList.toggle('hidden', !isHidden);
  avatarBtn.setAttribute('aria-expanded', String(isHidden));
}

function openPasswordModal() {
  closeDropdown();
  if (!modal) return;
  passwordForm?.reset();
  setPasswordMessage('');
  modal.classList.remove('hidden');
  newPasswordInput?.focus();
}

function closePasswordModal() {
  modal?.classList.add('hidden');
}

avatarBtn?.addEventListener('click', toggleDropdown);
openPasswordBtn?.addEventListener('click', openPasswordModal);
logoutBtn?.addEventListener('click', logout);
cancelPasswordBtn?.addEventListener('click', closePasswordModal);

document.addEventListener('click', (e) => {
  if (!e.target.closest('.avatar-menu-wrapper')) {
    closeDropdown();
  }
});

modal?.addEventListener('click', (e) => {
  if (e.target === modal) {
    closePasswordModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDropdown();
    closePasswordModal();
  }
});

passwordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = newPasswordInput?.value || '';
  const confirmPassword = confirmPasswordInput?.value || '';

  if (newPassword.length < 6) {
    setPasswordMessage('Parola trebuie să aibă cel puțin 6 caractere.', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordMessage('Parolele nu coincid.', 'error');
    return;
  }

  if (savePasswordBtn) savePasswordBtn.disabled = true;
  setPasswordMessage('Se actualizează parola...', 'info');

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    setPasswordMessage('Parola a fost schimbată cu succes.', 'success');
    passwordForm.reset();

    setTimeout(() => {
      closePasswordModal();
    }, 1000);
  } catch (err) {
    setPasswordMessage(err?.message || 'Nu s-a putut schimba parola.', 'error');
  } finally {
    if (savePasswordBtn) savePasswordBtn.disabled = false;
  }
});