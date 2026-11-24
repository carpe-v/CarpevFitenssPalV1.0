import { protectRoute } from '../authGuard.js';
import { supabase } from '../supabaseClient.js';
import { initTrainerShell } from './trainer.js';

const profile = await protectRoute('RoleB');
const shell = initTrainerShell(profile);

const appContentEl = document.getElementById('app-content');
const routeStylesheetEl = document.getElementById('route-stylesheet');
const navLinks = Array.from(document.querySelectorAll('.topbar-nav-link[data-route]'));

const ROUTES = {
  '/dashboard': {
    title: 'Dashboard — Trainer',
    navKey: '/dashboard',
    htmlUrl: './Dashboard/dashboard.html',
    cssUrl: './Dashboard/dashboard.css',
    moduleUrl: './Dashboard/dashboard.js',
  },
  '/clienti': {
    title: 'Clienți — Trainer',
    navKey: '/clienti',
    htmlUrl: './Clienti/index.html',
    cssUrl: './Clienti/clienti.css',
    moduleUrl: './Clienti/clienti.js',
  },
'/clienti/profil': {
    title: 'Profil Client — Trainer',
    navKey: '/clienti',
    htmlUrl: './Profil/profil.html',
    cssUrl: './Profil/profil.css',
    moduleUrl: './Profil/profil.js',
  },
  '/workouts': {
    title: 'Workouts — Trainer',
    navKey: '/workouts',
    htmlUrl: './Workouts/index.html',
    cssUrl: './Workouts/workouts.css',
    moduleUrl: './Workouts/workouts.js',
  },
  '/template-pachete': {
    title: 'Template Pachete — Trainer',
    navKey: '/template-pachete',
    htmlUrl: './TemplatePachete/index.html',
    cssUrl: './TemplatePachete/templatePachete.css',
    moduleUrl: './TemplatePachete/templatePachete.js',
  },
};

let activeCleanup = null;
let routeSeq = 0;

function parseHashRoute() {
  const raw = window.location.hash.replace(/^#/, '') || '/dashboard';
  const [pathPart, queryPart] = raw.split('?');
  const normalizedPath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const query = new URLSearchParams(queryPart || '');
  return { path: normalizedPath, query };
}

export function navigateTo(hashRoute) {
  const target = hashRoute.startsWith('#') ? hashRoute : `#${hashRoute}`;
  if (window.location.hash === target) {
    renderCurrentRoute();
  } else {
    window.location.hash = target;
  }
}

function updateActiveNav(navKey) {
  for (const link of navLinks) {
    link.classList.toggle('active', link.dataset.route === navKey);
  }
}

async function renderCurrentRoute() {
  if (!profile || !appContentEl) return;

  const seq = ++routeSeq;
  const { path, query } = parseHashRoute();
  const routeCfg = ROUTES[path] || ROUTES['/dashboard'];

  document.title = routeCfg.title;
  updateActiveNav(routeCfg.navKey);
  shell?.closeDropdown?.();

  if (typeof activeCleanup === 'function') {
    try {
      activeCleanup();
    } catch (_) {}
    activeCleanup = null;
  }

  if (routeStylesheetEl) {
    routeStylesheetEl.href = routeCfg.cssUrl ? `${routeCfg.cssUrl}?v=${seq}` : '';
  }

  const res = await fetch(routeCfg.htmlUrl, { cache: 'no-store' });
  if (!res.ok) {
    appContentEl.innerHTML = `<section class="view-panel"><p class="message error">Nu s-a putut încărca ruta (${routeCfg.htmlUrl} — ${res.status}).</p></section>`;
    return;
  }

  const htmlText = await res.text();
  if (seq !== routeSeq) return;

  appContentEl.innerHTML = htmlText;

  const mod = await import(`${routeCfg.moduleUrl}?v=${seq}`);
  if (seq !== routeSeq) return;

  if (typeof mod.cleanup === 'function') {
    activeCleanup = mod.cleanup;
  }
  if (typeof mod.mount === 'function') {
    await mod.mount({
      container: appContentEl,
      query,
      profile,
      supabase,
      navigateTo,
    });
  }
}

window.addEventListener('hashchange', renderCurrentRoute);

if (profile) {
  await renderCurrentRoute();
}