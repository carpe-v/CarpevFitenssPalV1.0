import { supabase } from './supabaseClient.js';

const form = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const formTitle = document.getElementById('form-title');
const togglePrompt = document.getElementById('toggle-prompt');
const toggleModeBtn = document.getElementById('toggle-mode');
const messageEl = document.getElementById('message');

let isSignUp = false;

const DEFAULT_ROLE = 'RoleA';

const ROLE_ROUTES = {
  RoleA: './RoleA/index.html',
  RoleB: './Trainer/index.html',
  RoleC: './RoleC/index.html',
  RoleD: './RoleD/index.html',
};

function showMessage(text, type = 'info') {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function formatError(err, fallback = 'A apărut o eroare neașteptată.') {
  if (!err) return fallback;
  const parts = [];
  if (err.status) parts.push(`[${err.status}]`);
  if (err.code) parts.push(`(${err.code})`);
  parts.push(err.message || fallback);
  return parts.join(' ');
}

async function clearInvalidSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignorăm erorile secundare
  }
}

async function fetchUserRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  const role = data?.role || DEFAULT_ROLE;
  if (!ROLE_ROUTES[role]) {
    const err = new Error(`Rolul "${role}" nu este configurat în aplicație.`);
    err.code = 'INVALID_ROLE';
    throw err;
  }

  return role;
}

async function redirectBasedOnRole(userId) {
  showMessage('Se verifică rolul contului...', 'info');
  const role = await fetchUserRole(userId);
  window.location.href = ROLE_ROUTES[role];
}

async function checkExistingSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      await clearInvalidSession();
      showMessage(`Sesiune veche curățată: ${formatError(error)}`, 'error');
      return;
    }

    if (!session?.user) return;

    await redirectBasedOnRole(session.user.id);
  } catch (err) {
    await clearInvalidSession();
    showMessage(
      `Sesiunea anterioară a fost resetată: ${formatError(err, 'Nu s-a putut verifica profilul.')}`,
      'error'
    );
  }
}

toggleModeBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  isSignUp = !isSignUp;
  showMessage('', 'info');

  if (isSignUp) {
    formTitle.textContent = 'Creare Cont Nou';
    submitBtn.textContent = 'Înregistrează-te';
    togglePrompt.textContent = 'Ai deja un cont?';
    toggleModeBtn.textContent = 'Autentifică-te';
  } else {
    formTitle.textContent = 'Autentificare';
    submitBtn.textContent = 'Intră în cont';
    togglePrompt.textContent = 'Nu ai cont?';
    toggleModeBtn.textContent = 'Înregistrează-te';
  }
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage('Completează atât adresa de email, cât și parola.', 'error');
    return;
  }

  submitBtn.disabled = true;
  showMessage(isSignUp ? 'Se creează contul...' : 'Se efectuează autentificarea...', 'info');

  try {
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: DEFAULT_ROLE },
        },
      });

      if (error) throw error;

      if (data?.session?.user) {
        await redirectBasedOnRole(data.session.user.id);
      } else {
        showMessage(
          'Contul a fost creat cu rolul implicit RoleA. Verifică emailul pentru confirmare înainte de autentificare.',
          'success'
        );
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data?.user?.id) {
        throw new Error('Autentificarea a reușit, dar lipsește ID-ul utilizatorului.');
      }

      await redirectBasedOnRole(data.user.id);
    }
  } catch (err) {
    if (err?.code === 'INVALID_ROLE' || err?.status === 403 || err?.code === '42501') {
      await clearInvalidSession();
    }
    showMessage(formatError(err), 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

checkExistingSession();