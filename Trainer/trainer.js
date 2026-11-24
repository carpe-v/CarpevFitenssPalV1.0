import { logout } from '../authGuard.js';
import { supabase } from '../supabaseClient.js';

export function initTrainerShell(profile) {
  const avatarBtn = document.getElementById('avatar-btn');
  const dropdown = document.getElementById('avatar-dropdown');
  const logoutBtn = document.getElementById('logout-btn');
  const menuEmailEl = document.getElementById('menu-user-email');

  if (profile) {
    const email = profile.email || '';
    if (menuEmailEl) menuEmailEl.textContent = email;
    if (avatarBtn) {
      const initials =
        email
          .split('@')[0]
          .split(/[._+-]/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0].toUpperCase())
          .join('') || 'TR';
      avatarBtn.textContent = initials;
    }
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

  avatarBtn?.addEventListener('click', toggleDropdown);
  logoutBtn?.addEventListener('click', logout);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.avatar-menu-wrapper')) {
      closeDropdown();
    }
  });

  const passwordModal = document.getElementById('password-modal');
  const muscleModal = document.getElementById('muscle-modal');
  const categoryModal = document.getElementById('category-modal');
  const equipmentModal = document.getElementById('equipment-modal');
  const exerciseModal = document.getElementById('exercise-modal');
  const packageModal = document.getElementById('package-modal');

  const allModals = [
    passwordModal,
    muscleModal,
    categoryModal,
    equipmentModal,
    exerciseModal,
    packageModal,
  ].filter(Boolean);

  function closeAllModals() {
    for (const m of allModals) m.classList.add('hidden');
  }

  function setStatus(el, text, type = '') {
    if (!el) return;
    el.textContent = text;
    el.className = type ? `message ${type}` : 'message';
  }

  function openModal(modalEl, formEl, msgEl, focusEl) {
    closeDropdown();
    closeAllModals();
    if (!modalEl) return;
    formEl?.reset();
    setStatus(msgEl, '');
    modalEl.classList.remove('hidden');
    focusEl?.focus();
  }

  for (const m of allModals) {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeAllModals();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
      closeAllModals();
    }
  });

  // Parolă
  const passwordForm = document.getElementById('password-form');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const passwordMessage = document.getElementById('password-message');
  const savePasswordBtn = document.getElementById('save-password-btn');

  document.getElementById('open-password-modal')?.addEventListener('click', () => {
    openModal(passwordModal, passwordForm, passwordMessage, newPasswordInput);
  });
  document.getElementById('cancel-password-btn')?.addEventListener('click', closeAllModals);

  passwordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const p1 = newPasswordInput?.value || '';
    const p2 = confirmPasswordInput?.value || '';
    if (p1.length < 6) return setStatus(passwordMessage, 'Minim 6 caractere.', 'error');
    if (p1 !== p2) return setStatus(passwordMessage, 'Parolele nu coincid.', 'error');
    if (savePasswordBtn) savePasswordBtn.disabled = true;
    setStatus(passwordMessage, 'Se actualizează parola...', 'info');
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) throw error;
      setStatus(passwordMessage, 'Parola a fost actualizată.', 'success');
      setTimeout(closeAllModals, 800);
    } catch (err) {
      setStatus(passwordMessage, err?.message || 'Eroare la actualizare.', 'error');
    } finally {
      if (savePasswordBtn) savePasswordBtn.disabled = false;
    }
  });

  // Cataloage simple
  function bindSimpleCatalog({ openId, cancelId, formId, inputId, msgId, saveId, modalEl, tableName, label }) {
    const formEl = document.getElementById(formId);
    const inputEl = document.getElementById(inputId);
    const msgEl = document.getElementById(msgId);
    const saveEl = document.getElementById(saveId);

    document.getElementById(openId)?.addEventListener('click', () => {
      openModal(modalEl, formEl, msgEl, inputEl);
    });
    document.getElementById(cancelId)?.addEventListener('click', closeAllModals);

    formEl?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nume = (inputEl?.value || '').trim();
      if (!nume) return setStatus(msgEl, 'Introdu un nume valid.', 'error');
      if (saveEl) saveEl.disabled = true;
      setStatus(msgEl, 'Se salvează...', 'info');
      try {
        const { error } = await supabase.from(tableName).insert({ nume });
        if (error) throw error;
        setStatus(msgEl, `${label} a fost adăugat(ă).`, 'success');
        window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: tableName } }));
        setTimeout(closeAllModals, 750);
      } catch (err) {
        setStatus(msgEl, err?.message || 'Eroare la salvare.', 'error');
      } finally {
        if (saveEl) saveEl.disabled = false;
      }
    });
  }

  bindSimpleCatalog({
    openId: 'open-muscle-modal',
    cancelId: 'cancel-muscle-btn',
    formId: 'muscle-form',
    inputId: 'muscle-name',
    msgId: 'muscle-message',
    saveId: 'save-muscle-btn',
    modalEl: muscleModal,
    tableName: 'grupa_musculara',
    label: 'Grupa musculară',
  });

  bindSimpleCatalog({
    openId: 'open-category-modal',
    cancelId: 'cancel-category-btn',
    formId: 'category-form',
    inputId: 'category-name',
    msgId: 'category-message',
    saveId: 'save-category-btn',
    modalEl: categoryModal,
    tableName: 'categorie',
    label: 'Categoria',
  });

  bindSimpleCatalog({
    openId: 'open-equipment-modal',
    cancelId: 'cancel-equipment-btn',
    formId: 'equipment-form',
    inputId: 'equipment-name',
    msgId: 'equipment-message',
    saveId: 'save-equipment-btn',
    modalEl: equipmentModal,
    tableName: 'echipament',
    label: 'Echipamentul',
  });

  // Exercițiu
  const exerciseForm = document.getElementById('exercise-form');
  const exerciseNameInput = document.getElementById('exercise-name');
  const exerciseCategorySelect = document.getElementById('exercise-category');
  const exerciseMuscleSelect = document.getElementById('exercise-muscle');
  const exerciseEquipmentSelect = document.getElementById('exercise-equipment');
  const exerciseMessage = document.getElementById('exercise-message');
  const saveExerciseBtn = document.getElementById('save-exercise-btn');

  function fillSelect(selectEl, rows, placeholder) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = placeholder;
    selectEl.appendChild(def);
    for (const r of rows || []) {
      const opt = document.createElement('option');
      opt.value = String(r.id);
      opt.textContent = r.nume;
      selectEl.appendChild(opt);
    }
  }

  async function refreshExerciseModalOptions() {
    const [c, m, e] = await Promise.all([
      supabase.from('categorie').select('id, nume').order('nume'),
      supabase.from('grupa_musculara').select('id, nume').order('nume'),
      supabase.from('echipament').select('id, nume').order('nume'),
    ]);
    fillSelect(exerciseCategorySelect, c.data, 'Selectează categoria');
    fillSelect(exerciseMuscleSelect, m.data, 'Selectează grupa musculară');
    fillSelect(exerciseEquipmentSelect, e.data, 'Selectează echipamentul');
  }

  document.getElementById('open-exercise-modal')?.addEventListener('click', async () => {
    openModal(exerciseModal, exerciseForm, exerciseMessage, exerciseNameInput);
    await refreshExerciseModalOptions();
  });
  document.getElementById('cancel-exercise-btn')?.addEventListener('click', closeAllModals);

  exerciseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nume = (exerciseNameInput?.value || '').trim();
    const categorie_id = Number(exerciseCategorySelect?.value || 0);
    const grupa_musculara_id = Number(exerciseMuscleSelect?.value || 0);
    const echipament_id = Number(exerciseEquipmentSelect?.value || 0);

    if (!nume || !categorie_id || !grupa_musculara_id || !echipament_id) {
      return setStatus(exerciseMessage, 'Completează toate câmpurile.', 'error');
    }
    if (saveExerciseBtn) saveExerciseBtn.disabled = true;
    setStatus(exerciseMessage, 'Se salvează exercițiul...', 'info');
    try {
      const { error } = await supabase.from('exercitii').insert({
        nume,
        categorie_id,
        grupa_musculara_id,
        echipament_id,
      });
      if (error) throw error;
      setStatus(exerciseMessage, 'Exercițiul a fost adăugat.', 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'exercitii' } }));
      setTimeout(closeAllModals, 750);
    } catch (err) {
      setStatus(exerciseMessage, err?.message || 'Eroare la salvare.', 'error');
    } finally {
      if (saveExerciseBtn) saveExerciseBtn.disabled = false;
    }
  });

  // Pachet
  const packageForm = document.getElementById('package-form');
  const packageNameInput = document.getElementById('package-name');
  const packageSessionsInput = document.getElementById('package-sessions-count');
  const packageMessage = document.getElementById('package-message');
  const savePackageBtn = document.getElementById('save-package-btn');

  document.getElementById('open-package-modal')?.addEventListener('click', () => {
    openModal(packageModal, packageForm, packageMessage, packageNameInput);
  });
  document.getElementById('cancel-package-btn')?.addEventListener('click', closeAllModals);

  packageForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nume = (packageNameInput?.value || '').trim();
    const numarSedinte = Number(packageSessionsInput?.value);
    if (!nume || !Number.isInteger(numarSedinte) || numarSedinte < 1) {
      return setStatus(packageMessage, 'Introdu un nume și un număr de ședințe >= 1.', 'error');
    }
    if (savePackageBtn) savePackageBtn.disabled = true;
    setStatus(packageMessage, 'Se salvează pachetul...', 'info');
    try {
      const { data: pkg, error: pkgErr } = await supabase
        .from('pachete')
        .insert({ nume, numar_sedinte: numarSedinte })
        .select('id, numar_sedinte')
        .single();
      if (pkgErr || !pkg) throw pkgErr || new Error('Eroare la creare pachet.');

      const sedRows = Array.from({ length: pkg.numar_sedinte }, (_, i) => ({
        pachet_id: pkg.id,
        numar_sedinta: i + 1,
        titlu: `Ședința ${i + 1}`,
      }));
      const { error: sedErr } = await supabase.from('pachet_sedinte').insert(sedRows);
      if (sedErr) throw sedErr;

      setStatus(packageMessage, 'Pachetul a fost salvat.', 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'pachete' } }));
      setTimeout(closeAllModals, 750);
    } catch (err) {
      setStatus(packageMessage, err?.message || 'Eroare la salvare.', 'error');
    } finally {
      if (savePackageBtn) savePackageBtn.disabled = false;
    }
  });

  return { closeDropdown };
}