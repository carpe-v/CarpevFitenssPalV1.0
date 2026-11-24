import { supabase } from './supabaseClient.js';

const VALID_ROLES = ['RoleA', 'RoleB', 'RoleC', 'RoleD'];

// Determină calea către root indiferent dacă suntem în /RoleA/index.html sau în /login.html
function getRootPrefix() {
  const path = window.location.pathname;
  if (/\/(RoleA|Trainer|RoleC|RoleD)\/[^/]+\/[^/]+\//.test(path)) {
    return '../../../';
  }
  if (/\/(RoleA|Trainer|RoleC|RoleD)\/[^/]+\//.test(path)) {
    return '../../';
  }
  if (/\/(RoleA|Trainer|RoleC|RoleD)\//.test(path)) {
    return '../';
  }
  return './';
}

function getRoleUrl(role) {
  return `${getRootPrefix()}${role}/index.html`;
}

function getLoginUrl() {
  return `${getRootPrefix()}login.html`;
}

function safeRedirect(targetUrl) {
  const currentHref = window.location.href;
  const resolvedTarget = new URL(targetUrl, currentHref).href;
  if (currentHref !== resolvedTarget) {
    window.location.replace(resolvedTarget);
  }
}

function revealBody() {
  if (document.body) {
    document.body.style.display = 'block';
  }
}

function renderGuardNotice(message) {
  revealBody();
  const dashboard = document.querySelector('.dashboard') || document.body;
  if (!dashboard) return;

  let notice = document.getElementById('auth-guard-notice');
  if (!notice) {
    notice = document.createElement('p');
    notice.id = 'auth-guard-notice';
    notice.className = 'message error';
    dashboard.prepend(notice);
  }
  notice.textContent = message;
}

async function resetLocalSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignorăm erorile secundare
  }
}

export async function protectRoute(requiredRole) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      if (sessionError) await resetLocalSession();
      revealBody();
      safeRedirect(getLoginUrl());
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      await resetLocalSession();
      renderGuardNotice(`Nu s-a putut citi profilul: ${profileError?.message || 'rând lipsă'}.`);
      safeRedirect(getLoginUrl());
      return null;
    }

    if (!VALID_ROLES.includes(profile.role)) {
      await resetLocalSession();
      renderGuardNotice(`Rol invalid în baza de date: "${profile.role}".`);
      safeRedirect(getLoginUrl());
      return null;
    }

    // Dacă rolul din Supabase s-a schimbat (ex. din RoleA în RoleB), mergem o singură dată spre noul folder
    if (profile.role !== requiredRole) {
      revealBody();
      safeRedirect(getRoleUrl(profile.role));
      return null;
    }

    revealBody();
    return profile;
  } catch (err) {
    await resetLocalSession();
    renderGuardNotice(`Eroare la verificarea accesului: ${err?.message || 'Eroare neașteptată.'}`);
    return null;
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      await resetLocalSession();
    }
  } finally {
    safeRedirect(getLoginUrl());
  }
}