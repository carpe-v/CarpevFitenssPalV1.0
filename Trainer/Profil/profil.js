let onKeyDown = null;
let onDataChanged = null;
let modalRefs = [];

function createAssignPackageIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z');
  const poly = document.createElementNS(svgNS, 'polyline');
  poly.setAttribute('points', '3.27 6.96 12 12.01 20.73 6.96');
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', '12');
  line.setAttribute('y1', '22.08');
  line.setAttribute('x2', '12');
  line.setAttribute('y2', '12');

  svg.append(path, poly, line);
  return svg;
}

function createShareExportIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
  const poly = document.createElementNS(svgNS, 'polyline');
  poly.setAttribute('points', '7 10 12 15 17 10');
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', '12');
  line.setAttribute('y1', '15');
  line.setAttribute('x2', '12');
  line.setAttribute('y2', '3');

  svg.append(path, poly, line);
  return svg;
}

function createCheckIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.4');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const poly = document.createElementNS(svgNS, 'polyline');
  poly.setAttribute('points', '20 6 9 17 4 12');

  svg.appendChild(poly);
  return svg;
}

export function cleanup() {
  if (onKeyDown) {
    document.removeEventListener('keydown', onKeyDown);
    onKeyDown = null;
  }
  if (onDataChanged) {
    window.removeEventListener('trainer:data-changed', onDataChanged);
    onDataChanged = null;
  }
  for (const el of modalRefs) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }
  modalRefs = [];
}

export async function mount({ container, query, supabase }) {
  const clientId = query?.get('id') ? Number(query.get('id')) : null;

  const openShareDataBtn = container.querySelector('#open-share-data-btn');
  if (openShareDataBtn && !openShareDataBtn.childElementCount) {
    openShareDataBtn.appendChild(createShareExportIcon());
  }

  const openAssignBtn = container.querySelector('#open-assign-btn');
  if (openAssignBtn && !openAssignBtn.childElementCount) {
    openAssignBtn.appendChild(createAssignPackageIcon());
  }

  const profileStatusEl = container.querySelector('#profile-status');
  const activePkgContainerEl = container.querySelector('#active-package-container');
  const sessionsGridEl = container.querySelector('#sessions-grid');
  const finishedPackagesListEl = container.querySelector('#finished-packages-list');

  for (const id of ['session-modal', 'assign-modal', 'client-ex-picker-modal']) {
    document.querySelectorAll(`#${id}`).forEach((el) => {
      if (!container.contains(el)) el.remove();
    });
    const el = container.querySelector(`#${id}`);
    if (el) {
      modalRefs.push(el);
      if (el.parentElement !== document.body) {
        document.body.appendChild(el);
      }
    }
  }

  const sessionModal = document.getElementById('session-modal');
  const sessionModalTitleEl = sessionModal?.querySelector('#session-modal-title');
  const addSessionExBtn = sessionModal?.querySelector('#add-session-exercise-btn');
  const sessionEditorEl = sessionModal?.querySelector('#session-exercises-editor');
  const closeSessionBtn = sessionModal?.querySelector('#session-modal-close-btn');
  const saveSessionBtn = sessionModal?.querySelector('#save-session-btn');
  const sessionModalMsgEl = sessionModal?.querySelector('#session-modal-message');

  const assignModal = document.getElementById('assign-modal');
  const assignForm = assignModal?.querySelector('#assign-form');
  const assignPkgSelect = assignModal?.querySelector('#assign-pkg-select');
  const closeAssignBtn = assignModal?.querySelector('#assign-modal-close-btn');
  const saveAssignBtn = assignModal?.querySelector('#save-assign-btn');
  const assignModalMsgEl = assignModal?.querySelector('#assign-modal-message');

  const pickerModalEl = document.getElementById('client-ex-picker-modal');
  const pickerCloseBtn = pickerModalEl?.querySelector('#client-ex-picker-close-btn');
  const pickerDoneBtn = pickerModalEl?.querySelector('#client-ex-picker-done-btn');
  const pickerTabExBtn = pickerModalEl?.querySelector('#client-picker-tab-exercises');
  const pickerTabWrkBtn = pickerModalEl?.querySelector('#client-picker-tab-workouts');
  const pickerPanelExEl = pickerModalEl?.querySelector('#client-picker-panel-exercises');
  const pickerPanelWrkEl = pickerModalEl?.querySelector('#client-picker-panel-workouts');
  const pickerSearchInput = pickerModalEl?.querySelector('#client-picker-ex-search');
  const pickerCatSelect = pickerModalEl?.querySelector('#client-picker-filter-cat');
  const pickerMusSelect = pickerModalEl?.querySelector('#client-picker-filter-mus');
  const pickerEqSelect = pickerModalEl?.querySelector('#client-picker-filter-eq');
  const pickerCatalogListEl = pickerModalEl?.querySelector('#client-picker-catalog-list');
  const pickerWorkoutSelect = pickerModalEl?.querySelector('#client-picker-workout-select');
  const pickerApplyWorkoutBtn = pickerModalEl?.querySelector('#client-picker-apply-workout-btn');
  const pickerWorkoutExListEl = pickerModalEl?.querySelector('#client-picker-workout-exercises-list');

  let packagesMap = new Map();
  let exercisesList = [];
  let exercisesMap = new Map();
  let workoutsList = [];
  let activeClientPkg = null;
  let finishedClientPkgs = [];
  let activeSessionExRows = [];
  let editingSessionNum = null;
  let draftSessionItems = [];

  let isPickerOpen = false;
  let activePickerTab = 'exercises';

  function setStatus(el, text, type = '') {
    if (!el) return;
    el.textContent = text;
    el.className = type ? `message ${type}` : 'message';
  }

  function sameKey(a, b) {
    if (a == null || b == null) return false;
    return String(a) === String(b);
  }

  function findExerciseById(exId) {
    if (exId == null) return null;
    return exercisesMap.get(exId) || exercisesMap.get(String(exId)) || null;
  }

  function populateFilterSelect(selectEl, items, defaultLabel) {
    if (!selectEl) return;
    const prev = selectEl.value;
    selectEl.innerHTML = '';

    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = defaultLabel;
    selectEl.appendChild(defOpt);

    for (const item of items) {
      const opt = document.createElement('option');
      opt.value = String(item.id);
      opt.textContent = item.label || item.nume;
      selectEl.appendChild(opt);
    }

    if (prev && items.some((x) => String(x.id) === String(prev))) {
      selectEl.value = prev;
    } else {
      selectEl.value = '';
    }
  }

  function closeExercisePickerModal() {
    isPickerOpen = false;
    pickerModalEl?.classList.add('hidden');
  }

  function closeSessionEditorModal() {
    closeExercisePickerModal();
    sessionModal?.classList.add('hidden');
    editingSessionNum = null;
  }

  function closeAssignModal() {
    assignModal?.classList.add('hidden');
  }

  function renumberExerciseSets(exercitiuId) {
    let counter = 1;
    for (const item of draftSessionItems) {
      if (sameKey(item.exercitiu_id, exercitiuId)) {
        item.set_nr = counter++;
      }
    }
  }

  function addExerciseItemToDraft(exObj) {
    if (!exObj || editingSessionNum == null) return;
    const existingCount = draftSessionItems.filter((x) => sameKey(x.exercitiu_id, exObj.id)).length;
    setStatus(sessionModalMsgEl, '');
    draftSessionItems.push({
      uid: `new-${exObj.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exercitiu_id: exObj.id,
      nume: exObj.nume,
      set_nr: existingCount + 1,
      repetari: 10,
      greutate: 0,
      nota: '',
    });
    renumberExerciseSets(exObj.id);
    renderSessionEditorList();
  }

  function addWorkoutExercisesToDraft(workoutId) {
    if (!workoutId || editingSessionNum == null) return;
    const w = workoutsList.find((item) => sameKey(item.id, workoutId));
    if (!w) return;

    const touchedIds = [];
    for (const exId of w.exerciseIds) {
      const exObj = findExerciseById(exId);
      if (!exObj) continue;
      const existingCount = draftSessionItems.filter((x) => sameKey(x.exercitiu_id, exObj.id)).length;
      draftSessionItems.push({
        uid: `wrk-${exObj.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        exercitiu_id: exObj.id,
        nume: exObj.nume,
        set_nr: existingCount + 1,
        repetari: 10,
        greutate: 0,
        nota: '',
      });
      if (!touchedIds.some((id) => sameKey(id, exObj.id))) {
        touchedIds.push(exObj.id);
      }
    }

    for (const exId of touchedIds) {
      renumberExerciseSets(exId);
    }
    setStatus(sessionModalMsgEl, '');
    renderSessionEditorList();
  }

  function addSetToExercise(exercitiuId) {
    const matching = draftSessionItems.filter((x) => sameKey(x.exercitiu_id, exercitiuId));
    const lastItem = matching[matching.length - 1];
    if (!lastItem) return;

    setStatus(sessionModalMsgEl, '');
    draftSessionItems.push({
      uid: `set-${exercitiuId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exercitiu_id: lastItem.exercitiu_id,
      nume: lastItem.nume,
      set_nr: matching.length + 1,
      repetari: lastItem.repetari ?? 10,
      greutate: lastItem.greutate ?? 0,
      nota: lastItem.nota || '',
    });

    renumberExerciseSets(exercitiu_id);
    renderSessionEditorList();
  }

  function removeSetFromExercise(uid, exercitiuId) {
    const matching = draftSessionItems.filter((x) => sameKey(x.exercitiu_id, exercitiuId));
    if (matching.length <= 1) {
      setStatus(sessionModalMsgEl, 'Exercițiul trebuie să aibă cel puțin o serie.', 'error');
      return;
    }

    setStatus(sessionModalMsgEl, '');
    draftSessionItems = draftSessionItems.filter((x) => x.uid !== uid);
    renumberExerciseSets(exercitiu_id);
    renderSessionEditorList();
  }

  async function finishActivePackage() {
    if (!activeClientPkg) return;
    setStatus(profileStatusEl, 'Se marchează pachetul ca terminat...', 'info');

    try {
      const { error } = await supabase
        .from('client_pachete')
        .update({ status: 'terminat' })
        .eq('id', activeClientPkg.id);
      if (error) throw error;

      setStatus(profileStatusEl, 'Pachetul a fost mutat la Pachete terminate.', 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'clienti' } }));
      await loadProfileData();
    } catch (err) {
      setStatus(profileStatusEl, err?.message || 'Eroare la actualizarea pachetului.', 'error');
    }
  }

  function getFilteredPickerExercises() {
    const queryText = (pickerSearchInput?.value || '').trim().toLowerCase();
    const catId = pickerCatSelect?.value || '';
    const musId = pickerMusSelect?.value || '';
    const eqId = pickerEqSelect?.value || '';

    return exercisesList.filter((ex) => {
      if (queryText && !String(ex.nume || '').toLowerCase().includes(queryText)) return false;
      if (catId && !sameKey(ex.categorie_id, catId)) return false;
      if (musId && !sameKey(ex.grupa_musculara_id, musId)) return false;
      if (eqId && !sameKey(ex.echipament_id, eqId)) return false;
      return true;
    });
  }

  function renderExercisePickerModal() {
    if (pickerCatalogListEl) {
      pickerCatalogListEl.innerHTML = '';
      const filtered = getFilteredPickerExercises();

      if (!filtered.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = exercisesList.length
          ? 'Niciun exercițiu nu corespunde căutării sau filtrelor.'
          : 'Nu există exerciții disponibile în catalog.';
        pickerCatalogListEl.appendChild(li);
      } else {
        for (const ex of filtered) {
          const li = document.createElement('li');
          li.className = 'tpl-modal-item';

          const info = document.createElement('div');
          info.className = 'tpl-modal-item-info';
          const nameEl = document.createElement('div');
          nameEl.className = 'tpl-modal-item-name';
          nameEl.textContent = ex.nume;
          const metaEl = document.createElement('div');
          metaEl.className = 'session-ex-meta';
          metaEl.textContent = ex.meta;
          info.append(nameEl, metaEl);

          const actions = document.createElement('div');
          actions.className = 'tpl-modal-item-actions';

          const addBtn = document.createElement('button');
          addBtn.type = 'button';
          addBtn.className = 'btn-card-edit';
          addBtn.textContent = '+ Adaugă';
          addBtn.addEventListener('click', () => addExerciseItemToDraft(ex));

          actions.appendChild(addBtn);
          li.append(info, actions);
          pickerCatalogListEl.appendChild(li);
        }
      }
    }

    if (pickerWorkoutExListEl) {
      pickerWorkoutExListEl.innerHTML = '';
      const selectedWId = pickerWorkoutSelect?.value || '';
      const selectedW = workoutsList.find((w) => sameKey(w.id, selectedWId));

      if (!selectedW) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Selectează un workout pentru a vedea sau adăuga exercițiile lui.';
        pickerWorkoutExListEl.appendChild(li);
      } else if (!selectedW.exerciseIds.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Acest workout nu are exerciții.';
        pickerWorkoutExListEl.appendChild(li);
      } else {
        for (const exId of selectedW.exerciseIds) {
          const exObj = findExerciseById(exId);
          if (!exObj) continue;

          const li = document.createElement('li');
          li.className = 'tpl-modal-item';

          const info = document.createElement('div');
          info.className = 'tpl-modal-item-info';
          const nameEl = document.createElement('div');
          nameEl.className = 'tpl-modal-item-name';
          nameEl.textContent = exObj.nume;
          const metaEl = document.createElement('div');
          metaEl.className = 'session-ex-meta';
          metaEl.textContent = exObj.meta;
          info.append(nameEl, metaEl);

          const actions = document.createElement('div');
          actions.className = 'tpl-modal-item-actions';

          const addBtn = document.createElement('button');
          addBtn.type = 'button';
          addBtn.className = 'btn-card-edit';
          addBtn.textContent = '+ Adaugă';
          addBtn.addEventListener('click', () => addExerciseItemToDraft(exObj));

          actions.appendChild(addBtn);
          li.append(info, actions);
          pickerWorkoutExListEl.appendChild(li);
        }
      }
    }
  }

  function setPickerTab(tabName) {
    activePickerTab = tabName === 'workouts' ? 'workouts' : 'exercises';
    const isEx = activePickerTab === 'exercises';

    pickerTabExBtn?.classList.toggle('active', isEx);
    pickerTabExBtn?.setAttribute('aria-selected', String(isEx));
    pickerTabWrkBtn?.classList.toggle('active', !isEx);
    pickerTabWrkBtn?.setAttribute('aria-selected', String(!isEx));

    pickerPanelExEl?.classList.toggle('hidden', !isEx);
    pickerPanelWrkEl?.classList.toggle('hidden', isEx);

    renderExercisePickerModal();
  }

  function openExercisePickerModal() {
    if (editingSessionNum == null) return;
    isPickerOpen = true;
    if (pickerSearchInput) pickerSearchInput.value = '';
    if (pickerCatSelect) pickerCatSelect.value = '';
    if (pickerMusSelect) pickerMusSelect.value = '';
    if (pickerEqSelect) pickerEqSelect.value = '';
    if (pickerWorkoutSelect) pickerWorkoutSelect.value = '';
    setPickerTab('exercises');
    pickerModalEl?.classList.remove('hidden');
  }

  async function loadProfileData() {
    if (!clientId) {
      setStatus(profileStatusEl, 'Lipsește ID-ul clientului din adresă.', 'error');
      return;
    }

    try {
      setStatus(profileStatusEl, '');

      const [cliRes, pkgRes, exRes, catRes, musRes, eqRes, wRes, weRes, cpRes] = await Promise.all([
        supabase.from('clienti').select('id').eq('id', clientId).single(),
        supabase.from('pachete').select('id, nume, numar_sedinte').order('nume', { ascending: true }),
        supabase.from('exercitii').select('id, nume, categorie_id, grupa_musculara_id, echipament_id').order('nume', { ascending: true }),
        supabase.from('categorie').select('id, nume').order('nume', { ascending: true }),
        supabase.from('grupa_musculara').select('id, nume').order('nume', { ascending: true }),
        supabase.from('echipament').select('id, nume').order('nume', { ascending: true }),
        supabase.from('workouts').select('id, nume').order('nume', { ascending: true }),
        supabase.from('workout_exercitii').select('workout_id, exercitiu_id, pozitie').order('pozitie', { ascending: true }),
        supabase
          .from('client_pachete')
          .select('id, client_id, pachet_id, sedinte_efectuate, status, created_at')
          .eq('client_id', clientId)
          .order('id', { ascending: false }),
      ]);

      if (cliRes.error) throw cliRes.error;
      if (pkgRes.error) throw pkgRes.error;
      if (exRes.error) throw exRes.error;
      if (catRes.error) throw catRes.error;
      if (musRes.error) throw musRes.error;
      if (eqRes.error) throw eqRes.error;
      if (wRes.error) throw wRes.error;
      if (weRes.error) throw weRes.error;
      if (cpRes.error) throw cpRes.error;

      const allPackages = pkgRes.data || [];
      packagesMap = new Map(allPackages.map((p) => [String(p.id), p]));

      if (assignPkgSelect) {
        const prevPkg = assignPkgSelect.value;
        assignPkgSelect.innerHTML = '<option value="">Selectează un pachet</option>';
        for (const p of allPackages) {
          const opt = document.createElement('option');
          opt.value = String(p.id);
          opt.textContent = `${p.nume} (${p.numar_sedinte} ședințe)`;
          assignPkgSelect.appendChild(opt);
        }
        if (prevPkg) assignPkgSelect.value = prevPkg;
      }

      const categoriesList = catRes.data || [];
      const musclesList = musRes.data || [];
      const equipmentList = eqRes.data || [];

      populateFilterSelect(pickerCatSelect, categoriesList, 'Toate categoriile');
      populateFilterSelect(pickerMusSelect, musclesList, 'Toate grupele');
      populateFilterSelect(pickerEqSelect, equipmentList, 'Tot echipamentul');

      const catMap = new Map(categoriesList.map((c) => [String(c.id), c.nume]));
      const musMap = new Map(musclesList.map((m) => [String(m.id), m.nume]));
      const eqMap = new Map(equipmentList.map((e) => [String(e.id), e.nume]));

      exercisesList = (exRes.data || []).map((ex) => ({
        id: ex.id,
        nume: ex.nume,
        categorie_id: ex.categorie_id,
        grupa_musculara_id: ex.grupa_musculara_id,
        echipament_id: ex.echipament_id,
        meta: `${catMap.get(String(ex.categorie_id)) || '-'} • ${musMap.get(String(ex.grupa_musculara_id)) || '-'} • ${eqMap.get(String(ex.echipament_id)) || '-'}`,
      }));

      exercisesMap = new Map();
      for (const ex of exercisesList) {
        exercisesMap.set(ex.id, ex);
        exercisesMap.set(String(ex.id), ex);
      }

      const exIdsByWorkout = new Map();
      for (const row of weRes.data || []) {
        const key = String(row.workout_id);
        const arr = exIdsByWorkout.get(key) || [];
        arr.push(row.exercitiu_id);
        exIdsByWorkout.set(key, arr);
      }

      workoutsList = (wRes.data || []).map((w) => {
        const ids = exIdsByWorkout.get(String(w.id)) || [];
        return {
          id: w.id,
          nume: w.nume,
          label: `${w.nume} (${ids.length})`,
          exerciseIds: ids,
        };
      });

      populateFilterSelect(pickerWorkoutSelect, workoutsList, 'Alege un workout...');

      const cpList = cpRes.data || [];
      activeClientPkg = cpList.find((cp) => cp.status === 'activ') || null;
      finishedClientPkgs = cpList.filter((cp) => cp.status === 'terminat');

      activeSessionExRows = [];
      if (activeClientPkg) {
        const { data: cseRows, error: cseErr } = await supabase
          .from('client_sedinta_exercitii')
          .select('id, client_pachet_id, numar_sedinta, exercitiu_id, pozitie, set_nr, repetari, greutate, nota')
          .eq('client_pachet_id', activeClientPkg.id)
          .order('pozitie', { ascending: true });

        if (cseErr) throw cseErr;
        activeSessionExRows = cseRows || [];
      }

      renderActivePackageAndSessions();
      renderFinishedPackages();
      if (isPickerOpen) {
        renderExercisePickerModal();
      }
    } catch (err) {
      setStatus(profileStatusEl, err?.message || 'Nu s-a putut încărca profilul clientului.', 'error');
    }
  }

  function renderActivePackageAndSessions() {
    if (!activePkgContainerEl || !sessionsGridEl) return;

    activePkgContainerEl.innerHTML = '';
    sessionsGridEl.innerHTML = '';

    if (!activeClientPkg) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'Clientul nu are niciun pachet activ în acest moment.';
      activePkgContainerEl.appendChild(p);
      return;
    }

    const pkgInfo = packagesMap.get(String(activeClientPkg.pachet_id));
    const totalSessions = Number(pkgInfo?.numar_sedinte) || 1;

    const banner = document.createElement('div');
    banner.className = 'active-pkg-banner';

    const infoBox = document.createElement('div');
    infoBox.className = 'active-pkg-info';

    const title = document.createElement('div');
    title.className = 'active-pkg-title';
    title.textContent = pkgInfo?.nume || 'Pachet activ';

    const sub = document.createElement('div');
    sub.className = 'active-pkg-sub';
    sub.textContent = `Total ședințe: ${totalSessions} • Ședințe efectuate: ${activeClientPkg.sedinte_efectuate || 0}`;

    infoBox.append(title, sub);

    const finishIconBtn = document.createElement('button');
    finishIconBtn.type = 'button';
    finishIconBtn.className = 'btn-finish-pkg-icon';
    finishIconBtn.title = 'Marchează pachetul ca terminat';
    finishIconBtn.setAttribute('aria-label', 'Marchează pachetul ca terminat');
    finishIconBtn.appendChild(createCheckIcon());
    finishIconBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      finishIconBtn.disabled = true;
      await finishActivePackage();
    });

    banner.append(infoBox, finishIconBtn);
    activePkgContainerEl.appendChild(banner);

    for (let sNum = 1; sNum <= totalSessions; sNum++) {
      const itemsInSession = activeSessionExRows.filter((r) => Number(r.numar_sedinta) === sNum);

      const groupedOrder = [];
      const groupedMap = new Map();
      for (const r of itemsInSession) {
        const key = String(r.exercitiu_id);
        if (!groupedMap.has(key)) {
          groupedOrder.push(r.exercitiu_id);
          groupedMap.set(key, []);
        }
        groupedMap.get(key).push(r);
      }

      const card = document.createElement('article');
      card.className = 'session-card';
      card.addEventListener('click', () => openSessionEditorModal(sNum));

      const top = document.createElement('div');
      top.className = 'session-card-top';

      const sTitle = document.createElement('h3');
      sTitle.className = 'session-card-title';
      sTitle.textContent = `Ședința ${sNum}`;

      const countBadge = document.createElement('span');
      countBadge.className = 'session-card-count';
      countBadge.textContent = `${groupedOrder.length} ${groupedOrder.length === 1 ? 'exercițiu' : 'exerciții'}`;

      top.append(sTitle, countBadge);

      const ul = document.createElement('ul');
      ul.className = 'session-preview-list';

      if (!groupedOrder.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Apasă pentru a adăuga exerciții și serii.';
        ul.appendChild(li);
      } else {
        for (const exId of groupedOrder) {
          const setRows = groupedMap.get(String(exId)) || [];
          const exName = findExerciseById(exId)?.nume || 'Exercițiu';
          const lastSet = setRows[setRows.length - 1];
          const li = document.createElement('li');
          li.className = 'session-preview-item';
          const setWord = setRows.length === 1 ? 'serie' : 'serii';
          const wtText = lastSet?.greutate ? ` • ${lastSet.greutate} kg` : '';
          li.textContent = `${exName} — ${setRows.length} ${setWord} (ult.: ${lastSet?.repetari ?? 0} rep${wtText})`;
          ul.appendChild(li);
        }
      }

      const cta = document.createElement('div');
      cta.className = 'session-card-cta';
      cta.textContent = 'Modifică exercițiile și seriile →';

      card.append(top, ul, cta);
      sessionsGridEl.appendChild(card);
    }
  }

  function renderFinishedPackages() {
    if (!finishedPackagesListEl) return;
    finishedPackagesListEl.innerHTML = '';

    if (!finishedClientPkgs.length) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'Nu există pachete terminate.';
      finishedPackagesListEl.appendChild(p);
      return;
    }

    for (const cp of finishedClientPkgs) {
      const pkgInfo = packagesMap.get(String(cp.pachet_id));
      const card = document.createElement('article');
      card.className = 'finished-card';

      const title = document.createElement('h3');
      title.className = 'finished-title';
      title.textContent = pkgInfo?.nume || 'Pachet terminat';

      const meta = document.createElement('p');
      meta.className = 'finished-meta';
      meta.textContent = `Ședințe: ${cp.sedinte_efectuate || 0} / ${pkgInfo?.numar_sedinte || 0} • Status: Terminat`;

      card.append(title, meta);
      finishedPackagesListEl.appendChild(card);
    }
  }

  async function openSessionEditorModal(sessionNum) {
    if (!activeClientPkg) return;

    editingSessionNum = sessionNum;
    if (sessionModalTitleEl) {
      sessionModalTitleEl.textContent = `Ședința ${sessionNum} — Exerciții și serii`;
    }
    setStatus(sessionModalMsgEl, '');

    const existingForSession = activeSessionExRows.filter((r) => Number(r.numar_sedinta) === sessionNum);

    if (existingForSession.length) {
      draftSessionItems = existingForSession.map((r, idx) => ({
        uid: `${r.id}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        exercitiu_id: r.exercitiu_id,
        nume: findExerciseById(r.exercitiu_id)?.nume || 'Exercițiu',
        set_nr: r.set_nr ?? 1,
        repetari: r.repetari ?? 10,
        greutate: r.greutate ?? 0,
        nota: r.nota || '',
      }));
    } else {
      const { data: tplSed } = await supabase
        .from('pachet_sedinte')
        .select('id')
        .eq('pachet_id', activeClientPkg.pachet_id)
        .eq('numar_sedinta', sessionNum)
        .maybeSingle();

      if (tplSed?.id) {
        const { data: tplEx } = await supabase
          .from('pachet_sedinta_exercitii')
          .select('exercitiu_id, pozitie')
          .eq('sedinta_id', tplSed.id)
          .order('pozitie', { ascending: true });

        draftSessionItems = (tplEx || []).map((t, idx) => ({
          uid: `tpl-${t.exercitiu_id}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          exercitiu_id: t.exercitiu_id,
          nume: findExerciseById(t.exercitiu_id)?.nume || 'Exercițiu',
          set_nr: 1,
          repetari: 10,
          greutate: 0,
          nota: '',
        }));
      } else {
        draftSessionItems = [];
      }
    }

    renderSessionEditorList();
    sessionModal?.classList.remove('hidden');
  }

  function renderSessionEditorList() {
    if (!sessionEditorEl) return;
    sessionEditorEl.innerHTML = '';

    if (!draftSessionItems.length) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'Niciun exercițiu în această ședință. Apasă "+ Adaugă exercițiu".';
      sessionEditorEl.appendChild(p);
      return;
    }

    const groupedOrder = [];
    const groupedMap = new Map();
    for (const item of draftSessionItems) {
      const key = String(item.exercitiu_id);
      if (!groupedMap.has(key)) {
        groupedOrder.push(item.exercitiu_id);
        groupedMap.set(key, []);
      }
      groupedMap.get(key).push(item);
    }

    for (const exId of groupedOrder) {
      const setsForEx = groupedMap.get(String(exId)) || [];
      const exTitle = setsForEx[0]?.nume || findExerciseById(exId)?.nume || 'Exercițiu';

      const card = document.createElement('div');
      card.className = 'ex-editor-card';

      const top = document.createElement('div');
      top.className = 'ex-editor-top';

      const nameEl = document.createElement('span');
      nameEl.className = 'ex-editor-name';
      nameEl.textContent = `${exTitle} (${setsForEx.length} ${setsForEx.length === 1 ? 'serie' : 'serii'})`;

      const topActions = document.createElement('div');
      topActions.className = 'ex-editor-actions';

      const addSetBtn = document.createElement('button');
      addSetBtn.type = 'button';
      addSetBtn.className = 'btn-secondary-small';
      addSetBtn.textContent = '+ Serie';
      addSetBtn.addEventListener('click', () => addSetToExercise(exId));

      const delExBtn = document.createElement('button');
      delExBtn.type = 'button';
      delExBtn.className = 'btn-danger-small';
      delExBtn.textContent = 'Șterge exercițiu';
      delExBtn.addEventListener('click', () => {
        setStatus(sessionModalMsgEl, '');
        draftSessionItems = draftSessionItems.filter((x) => !sameKey(x.exercitiu_id, exId));
        renderSessionEditorList();
      });

      topActions.append(addSetBtn, delExBtn);
      top.append(nameEl, topActions);
      card.appendChild(top);

      setsForEx.forEach((item, idx) => {
        item.set_nr = idx + 1;

        const setRow = document.createElement('div');
        setRow.className = 'set-row-box';

        const setHeader = document.createElement('div');
        setHeader.className = 'set-row-header';

        const setBadge = document.createElement('span');
        setBadge.className = 'set-badge';
        setBadge.textContent = `Seria ${item.set_nr}`;

        const removeSetBtn = document.createElement('button');
        removeSetBtn.type = 'button';
        removeSetBtn.className = 'btn-danger-small';
        removeSetBtn.textContent = 'Scoate seria';
        removeSetBtn.disabled = setsForEx.length <= 1;
        removeSetBtn.addEventListener('click', () => removeSetFromExercise(item.uid, exId));

        setHeader.append(setBadge, removeSetBtn);

        const fieldsGrid = document.createElement('div');
        fieldsGrid.className = 'ex-editor-fields';

        const repGroup = document.createElement('div');
        repGroup.className = 'input-group';
        const repLabel = document.createElement('label');
        repLabel.textContent = 'Repetări';
        const repInput = document.createElement('input');
        repInput.type = 'number';
        repInput.min = '0';
        repInput.value = String(item.repetari);
        repInput.addEventListener('input', (e) => {
          item.repetari = Math.max(0, Number(e.target.value) || 0);
        });
        repGroup.append(repLabel, repInput);

        const wtGroup = document.createElement('div');
        wtGroup.className = 'input-group';
        const wtLabel = document.createElement('label');
        wtLabel.textContent = 'Greutate (kg)';
        const wtInput = document.createElement('input');
        wtInput.type = 'number';
        wtInput.step = '0.5';
        wtInput.min = '0';
        wtInput.value = String(item.greutate);
        wtInput.addEventListener('input', (e) => {
          item.greutate = Math.max(0, Number(e.target.value) || 0);
        });
        wtGroup.append(wtLabel, wtInput);

        const noteGroup = document.createElement('div');
        noteGroup.className = 'input-group';
        const noteLabel = document.createElement('label');
        noteLabel.textContent = 'Notă';
        const noteInput = document.createElement('input');
        noteInput.type = 'text';
        noteInput.placeholder = 'ex. pauză 90s / controlat';
        noteInput.value = item.nota || '';
        noteInput.addEventListener('input', (e) => {
          item.nota = e.target.value;
        });
        noteGroup.append(noteLabel, noteInput);

        fieldsGrid.append(repGroup, wtGroup, noteGroup);
        setRow.append(setHeader, fieldsGrid);
        card.appendChild(setRow);
      });

      sessionEditorEl.appendChild(card);
    }
  }

  addSessionExBtn?.addEventListener('click', openExercisePickerModal);

  pickerCloseBtn?.addEventListener('click', closeExercisePickerModal);
  pickerDoneBtn?.addEventListener('click', closeExercisePickerModal);
  pickerModalEl?.addEventListener('click', (e) => {
    if (e.target === pickerModalEl) closeExercisePickerModal();
  });

  pickerTabExBtn?.addEventListener('click', () => setPickerTab('exercises'));
  pickerTabWrkBtn?.addEventListener('click', () => setPickerTab('workouts'));

  pickerSearchInput?.addEventListener('input', renderExercisePickerModal);
  pickerCatSelect?.addEventListener('change', renderExercisePickerModal);
  pickerMusSelect?.addEventListener('change', renderExercisePickerModal);
  pickerEqSelect?.addEventListener('change', renderExercisePickerModal);

  pickerWorkoutSelect?.addEventListener('change', renderExercisePickerModal);
  pickerApplyWorkoutBtn?.addEventListener('click', () => {
    addWorkoutExercisesToDraft(pickerWorkoutSelect?.value || '');
  });

  saveSessionBtn?.addEventListener('click', async () => {
    if (!activeClientPkg || editingSessionNum == null) return;

    if (saveSessionBtn) saveSessionBtn.disabled = true;
    setStatus(sessionModalMsgEl, 'Se salvează exercițiile și seriile ședinței...', 'info');

    try {
      const { error: delErr } = await supabase
        .from('client_sedinta_exercitii')
        .delete()
        .eq('client_pachet_id', activeClientPkg.id)
        .eq('numar_sedinta', editingSessionNum);

      if (delErr) throw delErr;

      if (draftSessionItems.length) {
        const rowsToInsert = draftSessionItems.map((it, idx) => ({
          client_pachet_id: activeClientPkg.id,
          numar_sedinta: editingSessionNum,
          exercitiu_id: it.exercitiu_id,
          pozitie: idx + 1,
          set_nr: Math.max(1, Number(it.set_nr) || 1),
          repetari: Math.max(0, Number(it.repetari) || 0),
          greutate: Math.max(0, Number(it.greutate) || 0),
          nota: (it.nota || '').trim(),
        }));

        const { error: insErr } = await supabase
          .from('client_sedinta_exercitii')
          .insert(rowsToInsert);

        if (insErr) throw insErr;
      }

      setStatus(sessionModalMsgEl, 'Ședința a fost salvată.', 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'clienti' } }));
      await loadProfileData();

      setTimeout(() => {
        closeSessionEditorModal();
      }, 500);
    } catch (err) {
      setStatus(sessionModalMsgEl, err?.message || 'Nu s-a putut salva ședința.', 'error');
    } finally {
      if (saveSessionBtn) saveSessionBtn.disabled = false;
    }
  });

  openShareDataBtn?.addEventListener('click', () => {
    const idParam = clientId ? `?id=${encodeURIComponent(clientId)}` : '';
    const shareUrl = new URL(`./share-data.html${idParam}`, import.meta.url).toString();
    window.location.assign(shareUrl);
  });

  openAssignBtn?.addEventListener('click', () => {
    assignForm?.reset();
    setStatus(assignModalMsgEl, '');
    assignModal?.classList.remove('hidden');
    assignPkgSelect?.focus();
  });

  assignForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pachetId = assignPkgSelect?.value ? Number(assignPkgSelect.value) : null;
    if (!clientId || !pachetId) return;

    if (saveAssignBtn) saveAssignBtn.disabled = true;
    setStatus(assignModalMsgEl, 'Se asignează pachetul...', 'info');

    try {
      if (activeClientPkg) {
        const { error: finErr } = await supabase
          .from('client_pachete')
          .update({ status: 'terminat' })
          .eq('id', activeClientPkg.id);
        if (finErr) throw finErr;
      }

      const { error: insErr } = await supabase.from('client_pachete').insert({
        client_id: clientId,
        pachet_id: pachetId,
        sedinte_efectuate: 0,
        status: 'activ',
      });
      if (insErr) throw insErr;

      setStatus(assignModalMsgEl, 'Pachetul activ a fost setat.', 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'clienti' } }));
      await loadProfileData();

      setTimeout(() => {
        closeAssignModal();
      }, 500);
    } catch (err) {
      setStatus(assignModalMsgEl, err?.message || 'Nu s-a putut asigna pachetul.', 'error');
    } finally {
      if (saveAssignBtn) saveAssignBtn.disabled = false;
    }
  });

  closeSessionBtn?.addEventListener('click', closeSessionEditorModal);
  closeAssignBtn?.addEventListener('click', closeAssignModal);

  sessionModal?.addEventListener('click', (e) => {
    if (e.target === sessionModal) closeSessionEditorModal();
  });

  assignModal?.addEventListener('click', (e) => {
    if (e.target === assignModal) closeAssignModal();
  });

  onKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isPickerOpen) {
        closeExercisePickerModal();
      } else {
        closeSessionEditorModal();
        closeAssignModal();
      }
    }
  };
  document.addEventListener('keydown', onKeyDown);

  onDataChanged = () => {
    loadProfileData().catch(() => {});
  };
  window.addEventListener('trainer:data-changed', onDataChanged);

  await loadProfileData();
}