let onKeyDown = null;
let onDataChanged = null;
let modalElRef = null;

function createTrashIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const path1 = document.createElementNS(svgNS, 'path');
  path1.setAttribute('d', 'M3 6h18');
  const path2 = document.createElementNS(svgNS, 'path');
  path2.setAttribute('d', 'M8 6V4h8v2');
  const path3 = document.createElementNS(svgNS, 'path');
  path3.setAttribute('d', 'M19 6l-1 14H6L5 6');
  const line1 = document.createElementNS(svgNS, 'line');
  line1.setAttribute('x1', '10');
  line1.setAttribute('y1', '11');
  line1.setAttribute('x2', '10');
  line1.setAttribute('y2', '17');
  const line2 = document.createElementNS(svgNS, 'line');
  line2.setAttribute('x1', '14');
  line2.setAttribute('y1', '11');
  line2.setAttribute('x2', '14');
  line2.setAttribute('y2', '17');

  svg.append(path1, path2, path3, line1, line2);
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
  if (modalElRef && modalElRef.parentNode) {
    modalElRef.parentNode.removeChild(modalElRef);
    modalElRef = null;
  }
}

export async function mount({ container, supabase }) {
  const tplStatusEl = container.querySelector('#tpl-status');
  const packagesCardsViewEl = container.querySelector('#packages-cards-view');
  const packageSessionsViewEl = container.querySelector('#package-sessions-view');
  const backToPackagesBtn = container.querySelector('#back-to-packages-btn');
  const sessionsGridEl = container.querySelector('#sessions-grid');

  document.querySelectorAll('#session-edit-modal').forEach((el) => {
    if (!container.contains(el)) el.remove();
  });

  const modalBackdropEl = container.querySelector('#session-edit-modal');
  if (modalBackdropEl) {
    modalElRef = modalBackdropEl;
    if (modalBackdropEl.parentElement !== document.body) {
      document.body.appendChild(modalBackdropEl);
    }
  }

  const rootModal = modalBackdropEl || document.getElementById('session-edit-modal');

  const modalTitleEl = rootModal?.querySelector('#session-modal-title');
  const modalCloseBtn = rootModal?.querySelector('#session-modal-close-btn');
  const modalSaveBtn = rootModal?.querySelector('#session-modal-save-btn');
  const modalSelectedCountEl = rootModal?.querySelector('#session-modal-selected-count');
  const modalSelectedListEl = rootModal?.querySelector('#session-modal-selected-list');

  const tabBtnExercises = rootModal?.querySelector('#tab-btn-exercises');
  const tabBtnWorkouts = rootModal?.querySelector('#tab-btn-workouts');
  const tabPanelExercises = rootModal?.querySelector('#tab-panel-exercises');
  const tabPanelWorkouts = rootModal?.querySelector('#tab-panel-workouts');

  const exSearchInput = rootModal?.querySelector('#session-ex-search');
  const filterCatSelect = rootModal?.querySelector('#session-filter-cat');
  const filterMusSelect = rootModal?.querySelector('#session-filter-mus');
  const filterEqSelect = rootModal?.querySelector('#session-filter-eq');
  const modalCatalogListEl = rootModal?.querySelector('#session-modal-catalog-list');

  const workoutSelectEl = rootModal?.querySelector('#session-workout-select');
  const applyWorkoutBtn = rootModal?.querySelector('#session-apply-workout-btn');
  const modalWorkoutExercisesListEl = rootModal?.querySelector('#session-modal-workout-exercises-list');

  let packagesList = [];
  let workoutsList = [];
  let exercisesList = [];
  let exercisesMap = new Map();
  let categoriesList = [];
  let musclesList = [];
  let equipmentList = [];

  let isCreatingPackage = false;
  let activePackageId = null;
  let activePackageName = '';
  // sessionsState: array de { numar_sedinta, titlu, items: [ { uid, exercitiu_id, nume, meta } ] }
  let sessionsState = [];

  let isSessionModalOpen = false;
  let editingSessionNum = null;
  let activeModalTab = 'exercises';
  let draftSessionItems = [];

  function setStatus(el, text, type = '') {
    if (!el) return;
    el.textContent = text;
    el.className = type ? `message ${type}` : 'message';
  }

  function populateFilterOptions(selectEl, items, defaultLabel) {
    if (!selectEl) return;
    const prevValue = selectEl.value;
    selectEl.innerHTML = '';

    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = defaultLabel;
    selectEl.appendChild(defOpt);

    for (const item of items) {
      const opt = document.createElement('option');
      opt.value = String(item.id);
      opt.textContent = item.nume;
      selectEl.appendChild(opt);
    }

    if (prevValue && items.some((x) => String(x.id) === String(prevValue))) {
      selectEl.value = prevValue;
    } else {
      selectEl.value = '';
    }
  }

  function populateWorkoutsSelect() {
    if (!workoutSelectEl) return;
    const prevValue = workoutSelectEl.value;
    workoutSelectEl.innerHTML = '';

    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = 'Alege un workout...';
    workoutSelectEl.appendChild(defOpt);

    for (const w of workoutsList) {
      const opt = document.createElement('option');
      opt.value = String(w.id);
      opt.textContent = `${w.nume} (${w.exerciseIds.length})`;
      workoutSelectEl.appendChild(opt);
    }

    if (prevValue && workoutsList.some((w) => String(w.id) === String(prevValue))) {
      workoutSelectEl.value = prevValue;
    } else {
      workoutSelectEl.value = '';
    }
  }

  function showPackagesView() {
    activePackageId = null;
    activePackageName = '';
    sessionsState = [];
    closeSessionModal(false);
    isCreatingPackage = false;
    setStatus(tplStatusEl, '');

    packageSessionsViewEl?.classList.add('hidden');
    if (packageSessionsViewEl) packageSessionsViewEl.style.display = 'none';

    packagesCardsViewEl?.classList.remove('hidden');
    if (packagesCardsViewEl) packagesCardsViewEl.style.display = 'grid';

    renderPackagesCards();
  }

  function renumberSessions() {
    sessionsState.forEach((s, idx) => {
      const nextNum = idx + 1;
      if (editingSessionNum === s.numar_sedinta) {
        editingSessionNum = nextNum;
      }
      s.numar_sedinta = nextNum;
      if (!s.titlu || /^Ședința \d+$/.test(s.titlu)) {
        s.titlu = `Ședința ${nextNum}`;
      }
    });
  }

  async function persistSessionsAutosave(successMessage = 'Salvat automat.') {
    if (!activePackageId) return;
    const pkgIdNum = Number(activePackageId);
    const totalSessions = sessionsState.length;

    setStatus(tplStatusEl, 'Se salvează automat...', 'info');

    const { error: pkgUpdateErr } = await supabase
      .from('pachete')
      .update({
        nume: activePackageName || 'Pachet',
        numar_sedinte: totalSessions,
      })
      .eq('id', pkgIdNum);
    if (pkgUpdateErr) throw pkgUpdateErr;

    const { error: delOldSedErr } = await supabase
      .from('pachet_sedinte')
      .delete()
      .eq('pachet_id', pkgIdNum);
    if (delOldSedErr) throw delOldSedErr;

    if (totalSessions > 0) {
      const sedRowsToInsert = sessionsState.map((s, idx) => ({
        pachet_id: pkgIdNum,
        numar_sedinta: idx + 1,
        titlu: `Ședința ${idx + 1}`,
      }));

      const { data: insertedSedinte, error: insSedErr } = await supabase
        .from('pachet_sedinte')
        .insert(sedRowsToInsert)
        .select('id, numar_sedinta');
      if (insSedErr) throw insSedErr;

      const sedIdByNum = new Map((insertedSedinte || []).map((r) => [r.numar_sedinta, r.id]));

      const exRowsToInsert = [];
      sessionsState.forEach((s, idx) => {
        const sedId = sedIdByNum.get(idx + 1);
        if (!sedId || !Array.isArray(s.items)) return;
        s.items.forEach((item, posIdx) => {
          exRowsToInsert.push({
            sedinta_id: sedId,
            exercitiu_id: item.exercitiu_id,
            pozitie: posIdx + 1,
          });
        });
      });

      if (exRowsToInsert.length) {
        const { error: insExErr } = await supabase
          .from('pachet_sedinta_exercitii')
          .insert(exRowsToInsert);
        if (insExErr) throw insExErr;
      }
    }

    const pkgIdx = packagesList.findIndex((p) => String(p.id) === String(pkgIdNum));
    if (pkgIdx !== -1) {
      packagesList[pkgIdx] = { ...packagesList[pkgIdx], numar_sedinte: totalSessions };
    }

    setStatus(tplStatusEl, successMessage, 'success');
    window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'pachete' } }));
  }

  async function loadReferenceData() {
    const [pkgRes, wRes, weRes, exRes, catRes, musRes, eqRes] = await Promise.all([
      supabase.from('pachete').select('id, nume, numar_sedinte').order('id', { ascending: false }),
      supabase.from('workouts').select('id, nume').order('nume', { ascending: true }),
      supabase.from('workout_exercitii').select('workout_id, exercitiu_id, pozitie').order('pozitie', { ascending: true }),
      supabase.from('exercitii').select('id, nume, categorie_id, grupa_musculara_id, echipament_id').order('nume', { ascending: true }),
      supabase.from('categorie').select('id, nume').order('nume', { ascending: true }),
      supabase.from('grupa_musculara').select('id, nume').order('nume', { ascending: true }),
      supabase.from('echipament').select('id, nume').order('nume', { ascending: true }),
    ]);

    if (pkgRes.error) throw pkgRes.error;
    if (wRes.error) throw wRes.error;
    if (weRes.error) throw weRes.error;
    if (exRes.error) throw exRes.error;
    if (catRes.error) throw catRes.error;
    if (musRes.error) throw musRes.error;
    if (eqRes.error) throw eqRes.error;

    categoriesList = catRes.data || [];
    musclesList = musRes.data || [];
    equipmentList = eqRes.data || [];

    populateFilterOptions(filterCatSelect, categoriesList, 'Toate categoriile');
    populateFilterOptions(filterMusSelect, musclesList, 'Toate grupele');
    populateFilterOptions(filterEqSelect, equipmentList, 'Tot echipamentul');

    const catMap = new Map(categoriesList.map((c) => [String(c.id), c.nume]));
    const musMap = new Map(musclesList.map((m) => [String(m.id), m.nume]));
    const eqMap = new Map(equipmentList.map((e) => [String(e.id), e.nume]));

    exercisesList = (exRes.data || []).map((ex) => {
      const meta = `${catMap.get(String(ex.categorie_id)) || '-'} • ${musMap.get(String(ex.grupa_musculara_id)) || '-'} • ${eqMap.get(String(ex.echipament_id)) || '-'}`;
      return {
        id: ex.id,
        nume: ex.nume,
        categorie_id: ex.categorie_id,
        grupa_musculara_id: ex.grupa_musculara_id,
        echipament_id: ex.echipament_id,
        meta,
      };
    });

    exercisesMap = new Map(exercisesList.map((e) => [String(e.id), e]));

    const exIdsByWorkout = new Map();
    for (const row of weRes.data || []) {
      const arr = exIdsByWorkout.get(String(row.workout_id)) || [];
      arr.push(row.exercitiu_id);
      exIdsByWorkout.set(String(row.workout_id), arr);
    }

    workoutsList = (wRes.data || []).map((w) => ({
      id: w.id,
      nume: w.nume,
      exerciseIds: exIdsByWorkout.get(String(w.id)) || [],
    }));

    populateWorkoutsSelect();

    packagesList = pkgRes.data || [];

    if (activePackageId && packagesList.some((p) => String(p.id) === String(activePackageId))) {
      await openPackageSessions(activePackageId, false);
      if (isSessionModalOpen && editingSessionNum != null) {
        const targetSession = sessionsState.find((s) => s.numar_sedinta === editingSessionNum);
        if (targetSession) {
          draftSessionItems = draftSessionItems
            .filter((item) => exercisesMap.has(String(item.exercitiu_id)))
            .map((item) => {
              const latestEx = exercisesMap.get(String(item.exercitiu_id));
              return { ...item, nume: latestEx.nume, meta: latestEx.meta };
            });
          renderSessionModalContent();
        } else {
          closeSessionModal(false);
        }
      }
    } else {
      activePackageId = null;
      activePackageName = '';
      sessionsState = [];
      closeSessionModal(false);
      packageSessionsViewEl?.classList.add('hidden');
      if (packageSessionsViewEl) packageSessionsViewEl.style.display = 'none';
      packagesCardsViewEl?.classList.remove('hidden');
      if (packagesCardsViewEl) packagesCardsViewEl.style.display = 'grid';
      renderPackagesCards();
    }
  }

  async function createPackageInline(nume, numarSedinte) {
    setStatus(tplStatusEl, 'Se creează pachetul...', 'info');
    try {
      const { data: pkg, error: pkgErr } = await supabase
        .from('pachete')
        .insert({ nume, numar_sedinte: numarSedinte })
        .select('id, nume, numar_sedinte')
        .single();

      if (pkgErr || !pkg) throw pkgErr || new Error('Nu s-a putut crea pachetul.');

      const sedRows = Array.from({ length: pkg.numar_sedinte }, (_, i) => ({
        pachet_id: pkg.id,
        numar_sedinta: i + 1,
        titlu: `Ședința ${i + 1}`,
      }));

      const { error: sedErr } = await supabase.from('pachet_sedinte').insert(sedRows);
      if (sedErr) throw sedErr;

      isCreatingPackage = false;
      setStatus(tplStatusEl, `Pachetul "${pkg.nume}" a fost creat.`, 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'pachete' } }));
      await loadReferenceData();
    } catch (err) {
      setStatus(tplStatusEl, err?.message || 'Eroare la crearea pachetului.', 'error');
    }
  }

  async function deletePackageCard(pkg) {
    setStatus(tplStatusEl, `Se șterge pachetul "${pkg.nume}"...`, 'info');
    try {
      const { data: sedRows, error: getSedErr } = await supabase
        .from('pachet_sedinte')
        .select('id')
        .eq('pachet_id', pkg.id);

      if (getSedErr) throw getSedErr;

      const sedIds = (sedRows || []).map((s) => s.id);
      if (sedIds.length) {
        const { error: delExErr } = await supabase
          .from('pachet_sedinta_exercitii')
          .delete()
          .in('sedinta_id', sedIds);
        if (delExErr) throw delExErr;
      }

      const { error: delSedErr } = await supabase
        .from('pachet_sedinte')
        .delete()
        .eq('pachet_id', pkg.id);
      if (delSedErr) throw delSedErr;

      const { error: delPkgErr } = await supabase
        .from('pachete')
        .delete()
        .eq('id', pkg.id);
      if (delPkgErr) throw delPkgErr;

      if (String(activePackageId) === String(pkg.id)) {
        activePackageId = null;
        activePackageName = '';
        closeSessionModal(false);
        packageSessionsViewEl?.classList.add('hidden');
        if (packageSessionsViewEl) packageSessionsViewEl.style.display = 'none';
        packagesCardsViewEl?.classList.remove('hidden');
        if (packagesCardsViewEl) packagesCardsViewEl.style.display = 'grid';
      }

      setStatus(tplStatusEl, `Pachetul "${pkg.nume}" a fost șters.`, 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'pachete' } }));
      await loadReferenceData();
    } catch (err) {
      setStatus(tplStatusEl, err?.message || 'Nu s-a putut șterge pachetul.', 'error');
    }
  }

  function renderPackagesCards() {
    if (!packagesCardsViewEl) return;
    packagesCardsViewEl.innerHTML = '';

    if (isCreatingPackage) {
      const formCard = document.createElement('article');
      formCard.className = 'package-card package-form-card';

      const formTitle = document.createElement('h2');
      formTitle.className = 'package-card-title';
      formTitle.textContent = 'Pachet nou';

      const nameGroup = document.createElement('div');
      nameGroup.className = 'inline-field-group';
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Nume pachet';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'ex. Pachet 8 ședințe';
      nameGroup.append(nameLabel, nameInput);

      const countGroup = document.createElement('div');
      countGroup.className = 'inline-field-group';
      const countLabel = document.createElement('label');
      countLabel.textContent = 'Număr ședințe';
      const countInput = document.createElement('input');
      countInput.type = 'number';
      countInput.min = '1';
      countInput.step = '1';
      countInput.value = '4';
      countGroup.append(countLabel, countInput);

      const btnRow = document.createElement('div');
      btnRow.className = 'card-action-row';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn-card-edit';
      saveBtn.textContent = 'Creează';
      saveBtn.addEventListener('click', async () => {
        const nume = (nameInput.value || '').trim();
        const nr = Number(countInput.value);
        if (!nume) {
          setStatus(tplStatusEl, 'Introdu numele pachetului.', 'error');
          nameInput.focus();
          return;
        }
        if (!Number.isInteger(nr) || nr < 1) {
          setStatus(tplStatusEl, 'Numărul de ședințe trebuie să fie cel puțin 1.', 'error');
          countInput.focus();
          return;
        }
        saveBtn.disabled = true;
        await createPackageInline(nume, nr);
        saveBtn.disabled = false;
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn-card-delete';
      cancelBtn.textContent = 'Anulează';
      cancelBtn.addEventListener('click', () => {
        isCreatingPackage = false;
        setStatus(tplStatusEl, '');
        renderPackagesCards();
      });

      btnRow.append(saveBtn, cancelBtn);
      formCard.append(formTitle, nameGroup, countGroup, btnRow);
      packagesCardsViewEl.appendChild(formCard);
      nameInput.focus();
    } else {
      const addPkgCard = document.createElement('button');
      addPkgCard.type = 'button';
      addPkgCard.className = 'package-card session-add-card';
      addPkgCard.innerHTML = `
        <span class="session-add-plus">+</span>
        <span class="session-add-title">Adaugă pachet</span>
        <span class="session-add-sub">Creează un pachet nou</span>
      `;
      addPkgCard.addEventListener('click', () => {
        isCreatingPackage = true;
        setStatus(tplStatusEl, '');
        renderPackagesCards();
      });
      packagesCardsViewEl.appendChild(addPkgCard);
    }

    for (const pkg of packagesList) {
      const card = document.createElement('article');
      card.className = 'package-card';
      card.addEventListener('click', async () => {
        try {
          await openPackageSessions(pkg.id, true);
        } catch (err) {
          setStatus(tplStatusEl, err?.message || 'Eroare la încărcarea ședințelor.', 'error');
        }
      });

      const delIconBtn = document.createElement('button');
      delIconBtn.type = 'button';
      delIconBtn.className = 'btn-card-delete-icon';
      delIconBtn.title = 'Șterge pachet';
      delIconBtn.setAttribute('aria-label', `Șterge pachetul ${pkg.nume}`);
      delIconBtn.appendChild(createTrashIcon());
      delIconBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        delIconBtn.disabled = true;
        await deletePackageCard(pkg);
      });

      const header = document.createElement('div');
      header.className = 'package-card-header';

      const title = document.createElement('h2');
      title.className = 'package-card-title';
      title.textContent = pkg.nume;

      const count = Number(pkg.numar_sedinte) || 0;
      const badge = document.createElement('span');
      badge.className = 'package-sessions-pill';
      badge.textContent = `${count} ${count === 1 ? 'ședință' : 'ședințe'}`;

      header.append(title, badge);
      card.append(delIconBtn, header);
      packagesCardsViewEl.appendChild(card);
    }
  }

  async function openPackageSessions(pkgId, clearStatus = true) {
    const pkg = packagesList.find((p) => String(p.id) === String(pkgId));
    if (!pkg) return;

    activePackageId = pkg.id;
    activePackageName = pkg.nume || '';
    isCreatingPackage = false;
    if (clearStatus) setStatus(tplStatusEl, '');

    const { data: sedRows, error: sedErr } = await supabase
      .from('pachet_sedinte')
      .select('id, numar_sedinta, titlu')
      .eq('pachet_id', pkg.id)
      .order('numar_sedinta', { ascending: true });

    if (sedErr) throw sedErr;

    const sedList = sedRows || [];
    const sedIds = sedList.map((s) => s.id);

    let exRows = [];
    if (sedIds.length) {
      const { data: rows, error: exErr } = await supabase
        .from('pachet_sedinta_exercitii')
        .select('id, sedinta_id, exercitiu_id, pozitie')
        .in('sedinta_id', sedIds)
        .order('pozitie', { ascending: true });

      if (exErr) throw exErr;
      exRows = rows || [];
    }

    const itemsBySedId = new Map();
    for (const r of exRows) {
      const exObj = exercisesMap.get(String(r.exercitiu_id));
      if (!exObj) continue;
      const list = itemsBySedId.get(String(r.sedinta_id)) || [];
      list.push({
        uid: `${exObj.id}-${r.id}-${Math.random().toString(36).slice(2, 6)}`,
        exercitiu_id: exObj.id,
        nume: exObj.nume,
        meta: exObj.meta,
      });
      itemsBySedId.set(String(r.sedinta_id), list);
    }

    const sedByNum = new Map(sedList.map((s) => [s.numar_sedinta, s]));
    const totalSlots = Math.max(Number(pkg.numar_sedinte) || 0, sedList.length);

    sessionsState = Array.from({ length: totalSlots }, (_, idx) => {
      const num = idx + 1;
      const existing = sedByNum.get(num);
      return {
        numar_sedinta: num,
        titlu: existing?.titlu || `Ședința ${num}`,
        items: existing ? itemsBySedId.get(String(existing.id)) || [] : [],
      };
    });

    packagesCardsViewEl?.classList.add('hidden');
    if (packagesCardsViewEl) packagesCardsViewEl.style.display = 'none';

    packageSessionsViewEl?.classList.remove('hidden');
    if (packageSessionsViewEl) packageSessionsViewEl.style.display = 'block';

    renderSessionsGrid();
  }

  async function addNewSessionCard() {
    if (!activePackageId) return;
    const nextNum = sessionsState.length + 1;
    sessionsState.push({
      numar_sedinta: nextNum,
      titlu: `Ședința ${nextNum}`,
      items: [],
    });
    renderSessionsGrid();
    try {
      await persistSessionsAutosave(`Ședința ${nextNum} adăugată (autosave).`);
    } catch (err) {
      setStatus(tplStatusEl, err?.message || 'Eroare la autosave.', 'error');
    }
    openSessionModal(nextNum);
  }

  async function deleteSessionCard(sessionNum) {
    if (isSessionModalOpen && editingSessionNum === sessionNum) {
      closeSessionModal(false);
    }
    sessionsState = sessionsState.filter((s) => s.numar_sedinta !== sessionNum);
    renumberSessions();
    renderSessionsGrid();
    try {
      await persistSessionsAutosave('Ședința ștearsă (autosave).');
    } catch (err) {
      setStatus(tplStatusEl, err?.message || 'Eroare la autosave.', 'error');
    }
  }

  function setModalTab(tabName) {
    activeModalTab = tabName === 'workouts' ? 'workouts' : 'exercises';
    const isEx = activeModalTab === 'exercises';

    tabBtnExercises?.classList.toggle('active', isEx);
    tabBtnExercises?.setAttribute('aria-selected', String(isEx));
    tabBtnWorkouts?.classList.toggle('active', !isEx);
    tabBtnWorkouts?.setAttribute('aria-selected', String(!isEx));

    tabPanelExercises?.classList.toggle('hidden', !isEx);
    tabPanelWorkouts?.classList.toggle('hidden', isEx);

    renderSessionModalContent();
  }

  function openSessionModal(sessionNum) {
    const session = sessionsState.find((s) => s.numar_sedinta === sessionNum);
    if (!session) return;

    isSessionModalOpen = true;
    editingSessionNum = sessionNum;
    draftSessionItems = (session.items || []).map((item) => ({ ...item }));

    if (modalTitleEl) {
      modalTitleEl.textContent = `Editează — Ședința ${session.numar_sedinta}`;
    }
    if (exSearchInput) exSearchInput.value = '';
    if (filterCatSelect) filterCatSelect.value = '';
    if (filterMusSelect) filterMusSelect.value = '';
    if (filterEqSelect) filterEqSelect.value = '';
    if (workoutSelectEl) workoutSelectEl.value = '';

    populateWorkoutsSelect();
    setModalTab('exercises');
    rootModal?.classList.remove('hidden');
  }

  function closeSessionModal(clearMsg = false) {
    isSessionModalOpen = false;
    editingSessionNum = null;
    draftSessionItems = [];
    rootModal?.classList.add('hidden');
    if (clearMsg) setStatus(tplStatusEl, '');
  }

  function addExerciseToDraft(exObj) {
    if (!exObj) return;
    draftSessionItems.push({
      uid: `${exObj.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      exercitiu_id: exObj.id,
      nume: exObj.nume,
      meta: exObj.meta,
    });
    renderSessionModalContent();
  }

  function appendWorkoutToDraft(workoutId) {
    if (!workoutId) return;
    const w = workoutsList.find((item) => String(item.id) === String(workoutId));
    if (!w) return;

    for (const exId of w.exerciseIds) {
      const exObj = exercisesMap.get(String(exId));
      if (!exObj) continue;
      draftSessionItems.push({
        uid: `${exObj.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        exercitiu_id: exObj.id,
        nume: exObj.nume,
        meta: exObj.meta,
      });
    }
    renderSessionModalContent();
  }

  function getFilteredExercises() {
    const query = (exSearchInput?.value || '').trim().toLowerCase();
    const catId = filterCatSelect?.value || '';
    const musId = filterMusSelect?.value || '';
    const eqId = filterEqSelect?.value || '';

    return exercisesList.filter((ex) => {
      if (query && !String(ex.nume || '').toLowerCase().includes(query)) return false;
      if (catId && String(ex.categorie_id) !== String(catId)) return false;
      if (musId && String(ex.grupa_musculara_id) !== String(musId)) return false;
      if (eqId && String(ex.echipament_id) !== String(eqId)) return false;
      return true;
    });
  }

  function renderSessionModalContent() {
    if (modalSelectedCountEl) {
      modalSelectedCountEl.textContent = String(draftSessionItems.length);
    }

    if (modalSelectedListEl) {
      modalSelectedListEl.innerHTML = '';
      if (!draftSessionItems.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Niciun exercițiu în pool-ul ședinței.';
        modalSelectedListEl.appendChild(li);
      } else {
        for (const item of draftSessionItems) {
          const li = document.createElement('li');
          li.className = 'tpl-modal-item';

          const info = document.createElement('div');
          info.className = 'tpl-modal-item-info';
          const nameEl = document.createElement('div');
          nameEl.className = 'tpl-modal-item-name';
          nameEl.textContent = item.nume;
          const metaEl = document.createElement('div');
          metaEl.className = 'session-ex-meta';
          metaEl.textContent = item.meta;
          info.append(nameEl, metaEl);

          const actions = document.createElement('div');
          actions.className = 'tpl-modal-item-actions';

          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'btn-remove-item';
          removeBtn.textContent = 'Scoate';
          removeBtn.addEventListener('click', () => {
            draftSessionItems = draftSessionItems.filter((x) => x.uid !== item.uid);
            renderSessionModalContent();
          });

          actions.appendChild(removeBtn);
          li.append(info, actions);
          modalSelectedListEl.appendChild(li);
        }
      }
    }

    if (modalCatalogListEl) {
      modalCatalogListEl.innerHTML = '';
      const filtered = getFilteredExercises();

      if (!filtered.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Niciun exercițiu nu corespunde căutării sau filtrelor.';
        modalCatalogListEl.appendChild(li);
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
          addBtn.addEventListener('click', () => addExerciseToDraft(ex));

          actions.appendChild(addBtn);
          li.append(info, actions);
          modalCatalogListEl.appendChild(li);
        }
      }
    }

    if (modalWorkoutExercisesListEl) {
      modalWorkoutExercisesListEl.innerHTML = '';
      const selectedWId = workoutSelectEl?.value || '';
      const selectedW = workoutsList.find((w) => String(w.id) === String(selectedWId));

      if (!selectedW) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Selectează un workout pentru a vedea sau adăuga exercițiile lui.';
        modalWorkoutExercisesListEl.appendChild(li);
      } else if (!selectedW.exerciseIds.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Acest workout nu are exerciții.';
        modalWorkoutExercisesListEl.appendChild(li);
      } else {
        for (const exId of selectedW.exerciseIds) {
          const exObj = exercisesMap.get(String(exId));
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
          addBtn.addEventListener('click', () => addExerciseToDraft(exObj));

          actions.appendChild(addBtn);
          li.append(info, actions);
          modalWorkoutExercisesListEl.appendChild(li);
        }
      }
    }
  }

  async function saveSessionModalChanges() {
    if (editingSessionNum == null) return;
    const sessionNum = editingSessionNum;
    const session = sessionsState.find((s) => s.numar_sedinta === sessionNum);
    if (!session) return;

    if (modalSaveBtn) modalSaveBtn.disabled = true;
    session.items = draftSessionItems.map((item) => ({ ...item }));
    closeSessionModal(false);
    renderSessionsGrid();

    try {
      await persistSessionsAutosave(`Ședința ${sessionNum} salvată automat.`);
    } catch (err) {
      setStatus(tplStatusEl, err?.message || 'Eroare la salvarea automată.', 'error');
    } finally {
      if (modalSaveBtn) modalSaveBtn.disabled = false;
    }
  }

  function renderSessionsGrid() {
    if (!sessionsGridEl) return;
    sessionsGridEl.innerHTML = '';

    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'session-card session-add-card';
    addCard.innerHTML = `
      <span class="session-add-plus">+</span>
      <span class="session-add-title">Adaugă ședință</span>
      <span class="session-add-sub">Creează Ședința ${sessionsState.length + 1}</span>
    `;
    addCard.addEventListener('click', addNewSessionCard);
    sessionsGridEl.appendChild(addCard);

    for (const session of sessionsState) {
      const isCompleted = session.items.length > 0;

      const card = document.createElement('article');
      card.className = 'session-card';
      card.addEventListener('click', () => {
        openSessionModal(session.numar_sedinta);
      });

      const delIconBtn = document.createElement('button');
      delIconBtn.type = 'button';
      delIconBtn.className = 'btn-card-delete-icon';
      delIconBtn.title = 'Șterge ședința';
      delIconBtn.setAttribute('aria-label', `Șterge Ședința ${session.numar_sedinta}`);
      delIconBtn.appendChild(createTrashIcon());
      delIconBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        delIconBtn.disabled = true;
        await deleteSessionCard(session.numar_sedinta);
      });

      const header = document.createElement('div');
      header.className = 'session-card-header';

      const title = document.createElement('h3');
      title.className = 'session-title';
      title.textContent = `Ședința ${session.numar_sedinta}`;

      const statusTag = document.createElement('span');
      statusTag.className = `session-status-pill ${isCompleted ? 'done' : 'pending'}`;
      statusTag.textContent = isCompleted ? `${session.items.length} ex.` : 'Goală';

      header.append(title, statusTag);
      card.append(delIconBtn, header);

      const ul = document.createElement('ul');
      ul.className = 'session-ex-list';

      if (!session.items.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Niciun exercițiu adăugat.';
        ul.appendChild(li);
      } else {
        for (const item of session.items) {
          const li = document.createElement('li');
          li.className = 'session-ex-item';

          const left = document.createElement('div');
          const nameSpan = document.createElement('div');
          nameSpan.textContent = item.nume;
          const metaSpan = document.createElement('div');
          metaSpan.className = 'session-ex-meta';
          metaSpan.textContent = item.meta;
          left.append(nameSpan, metaSpan);
          li.appendChild(left);
          ul.appendChild(li);
        }
      }

      card.appendChild(ul);
      sessionsGridEl.appendChild(card);
    }
  }

  backToPackagesBtn?.addEventListener('click', showPackagesView);

  modalCloseBtn?.addEventListener('click', () => closeSessionModal(false));
  modalSaveBtn?.addEventListener('click', saveSessionModalChanges);

  rootModal?.addEventListener('click', (e) => {
    if (e.target === rootModal) {
      closeSessionModal(false);
    }
  });

  tabBtnExercises?.addEventListener('click', () => setModalTab('exercises'));
  tabBtnWorkouts?.addEventListener('click', () => setModalTab('workouts'));

  exSearchInput?.addEventListener('input', renderSessionModalContent);
  filterCatSelect?.addEventListener('change', renderSessionModalContent);
  filterMusSelect?.addEventListener('change', renderSessionModalContent);
  filterEqSelect?.addEventListener('change', renderSessionModalContent);

  workoutSelectEl?.addEventListener('change', renderSessionModalContent);
  applyWorkoutBtn?.addEventListener('click', () => {
    appendWorkoutToDraft(workoutSelectEl?.value || '');
  });

  onKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isSessionModalOpen) {
        closeSessionModal(false);
      } else if (isCreatingPackage) {
        isCreatingPackage = false;
        renderPackagesCards();
      }
    }
  };
  document.addEventListener('keydown', onKeyDown);

  onDataChanged = () => {
    loadReferenceData().catch((err) => {
      setStatus(tplStatusEl, err?.message || 'Nu s-au putut reîncărca datele.', 'error');
    });
  };
  window.addEventListener('trainer:data-changed', onDataChanged);

  try {
    await loadReferenceData();
  } catch (err) {
    setStatus(tplStatusEl, err?.message || 'Nu s-au putut încărca datele.', 'error');
  }
}