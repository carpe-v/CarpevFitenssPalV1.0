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
  const statusEl = container.querySelector('#workouts-status');
  const workoutsGridEl = container.querySelector('#workouts-grid');

  document.querySelectorAll('#workout-edit-modal').forEach((el) => {
    if (!container.contains(el)) el.remove();
  });

  const modalBackdropEl = container.querySelector('#workout-edit-modal');
  if (modalBackdropEl) {
    modalElRef = modalBackdropEl;
    if (modalBackdropEl.parentElement !== document.body) {
      document.body.appendChild(modalBackdropEl);
    }
  }

  const rootModal = modalBackdropEl || document.getElementById('workout-edit-modal');

  const modalTitleEl = rootModal?.querySelector('#workout-modal-title');
  const modalCloseBtn = rootModal?.querySelector('#workout-modal-close-btn');
  const modalSaveBtn = rootModal?.querySelector('#workout-modal-save-btn');
  const modalNameInput = rootModal?.querySelector('#workout-modal-name-input');
  const modalSelectedCountEl = rootModal?.querySelector('#workout-modal-selected-count');
  const modalSelectedListEl = rootModal?.querySelector('#workout-modal-selected-list');
  const modalCatalogListEl = rootModal?.querySelector('#workout-modal-catalog-list');
  const exSearchInput = rootModal?.querySelector('#workout-ex-search');
  const filterCatSelect = rootModal?.querySelector('#workout-filter-cat');
  const filterMusSelect = rootModal?.querySelector('#workout-filter-mus');
  const filterEqSelect = rootModal?.querySelector('#workout-filter-eq');

  let workoutsList = [];
  let exercisesList = [];
  let exercisesMap = new Map();
  let categoriesList = [];
  let musclesList = [];
  let equipmentList = [];

  let isModalOpen = false;
  let editingWorkoutId = null;
  let draftWorkoutItems = [];

  function setStatus(text, type = '') {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = type ? `message ${type}` : 'message';
  }

  function formatError(err, fallback) {
    if (!err) return fallback;
    const parts = [err.message, err.details, err.hint].filter(Boolean);
    return parts.length ? parts.join(' — ') : fallback;
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

  async function loadData() {
    const [wRes, weRes, exRes, catRes, musRes, eqRes] = await Promise.all([
      supabase.from('workouts').select('id, nume').order('id', { ascending: false }),
      supabase.from('workout_exercitii').select('id, workout_id, exercitiu_id, pozitie').order('pozitie', { ascending: true }),
      supabase.from('exercitii').select('id, nume, categorie_id, grupa_musculara_id, echipament_id').order('nume', { ascending: true }),
      supabase.from('categorie').select('id, nume').order('nume', { ascending: true }),
      supabase.from('grupa_musculara').select('id, nume').order('nume', { ascending: true }),
      supabase.from('echipament').select('id, nume').order('nume', { ascending: true }),
    ]);

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
      const catName = catMap.get(String(ex.categorie_id)) || '-';
      const musName = musMap.get(String(ex.grupa_musculara_id)) || '-';
      const eqName = eqMap.get(String(ex.echipament_id)) || '-';
      return {
        id: ex.id,
        nume: ex.nume,
        categorie_id: ex.categorie_id,
        grupa_musculara_id: ex.grupa_musculara_id,
        echipament_id: ex.echipament_id,
        meta: `${catName} • ${musName} • ${eqName}`,
      };
    });

    exercisesMap = new Map(exercisesList.map((e) => [String(e.id), e]));

    const itemsByWorkoutId = new Map();
    for (const row of weRes.data || []) {
      const exObj = exercisesMap.get(String(row.exercitiu_id));
      if (!exObj) continue;
      const key = String(row.workout_id);
      const arr = itemsByWorkoutId.get(key) || [];
      arr.push({
        uid: `${exObj.id}-${row.id}-${Math.random().toString(36).slice(2, 6)}`,
        exercitiu_id: exObj.id,
        nume: exObj.nume,
        meta: exObj.meta,
      });
      itemsByWorkoutId.set(key, arr);
    }

    workoutsList = (wRes.data || []).map((w) => ({
      id: w.id,
      nume: w.nume,
      items: itemsByWorkoutId.get(String(w.id)) || [],
    }));

    renderWorkoutsGrid();

    if (isModalOpen) {
      if (editingWorkoutId != null) {
        const currentW = workoutsList.find((w) => String(w.id) === String(editingWorkoutId));
        if (currentW) {
          draftWorkoutItems = draftWorkoutItems
            .filter((item) => exercisesMap.has(String(item.exercitiu_id)))
            .map((item) => {
              const latestEx = exercisesMap.get(String(item.exercitiu_id));
              return {
                ...item,
                nume: latestEx.nume,
                meta: latestEx.meta,
              };
            });
        } else {
          closeWorkoutModal(false);
          return;
        }
      }
      renderModalLists();
    }
  }

  function openWorkoutModal(workoutObj = null) {
    isModalOpen = true;
    editingWorkoutId = workoutObj ? workoutObj.id : null;
    draftWorkoutItems = workoutObj ? (workoutObj.items || []).map((item) => ({ ...item })) : [];

    if (modalTitleEl) {
      modalTitleEl.textContent = workoutObj ? 'Editează workout' : 'Adaugă workout nou';
    }
    if (modalNameInput) {
      modalNameInput.value = workoutObj ? workoutObj.nume || '' : '';
    }
    if (exSearchInput) exSearchInput.value = '';
    if (filterCatSelect) filterCatSelect.value = '';
    if (filterMusSelect) filterMusSelect.value = '';
    if (filterEqSelect) filterEqSelect.value = '';

    rootModal?.classList.remove('hidden');
    renderModalLists();
    modalNameInput?.focus();
  }

  function closeWorkoutModal(clearMsg = true) {
    isModalOpen = false;
    editingWorkoutId = null;
    draftWorkoutItems = [];
    rootModal?.classList.add('hidden');
    if (clearMsg) setStatus('');
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

  function renderModalLists() {
    if (modalSelectedCountEl) {
      modalSelectedCountEl.textContent = String(draftWorkoutItems.length);
    }

    if (modalSelectedListEl) {
      modalSelectedListEl.innerHTML = '';
      if (!draftWorkoutItems.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Niciun exercițiu adăugat încă în acest workout.';
        modalSelectedListEl.appendChild(li);
      } else {
        for (const item of draftWorkoutItems) {
          const li = document.createElement('li');
          li.className = 'workout-modal-item';

          const info = document.createElement('div');
          info.className = 'workout-modal-item-info';
          const nameEl = document.createElement('div');
          nameEl.className = 'workout-modal-item-name';
          nameEl.textContent = item.nume;
          const metaEl = document.createElement('div');
          metaEl.className = 'workout-ex-meta';
          metaEl.textContent = item.meta;
          info.append(nameEl, metaEl);

          const actions = document.createElement('div');
          actions.className = 'workout-modal-item-actions';

          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'btn-remove-item';
          removeBtn.textContent = 'Scoate';
          removeBtn.addEventListener('click', () => {
            draftWorkoutItems = draftWorkoutItems.filter((x) => x.uid !== item.uid);
            renderModalLists();
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
        return;
      }

      for (const ex of filtered) {
        const li = document.createElement('li');
        li.className = 'workout-modal-item';

        const info = document.createElement('div');
        info.className = 'workout-modal-item-info';
        const nameEl = document.createElement('div');
        nameEl.className = 'workout-modal-item-name';
        nameEl.textContent = ex.nume;
        const metaEl = document.createElement('div');
        metaEl.className = 'workout-ex-meta';
        metaEl.textContent = ex.meta;
        info.append(nameEl, metaEl);

        const actions = document.createElement('div');
        actions.className = 'workout-modal-item-actions';

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-card-edit';
        addBtn.textContent = '+ Adaugă';
        addBtn.addEventListener('click', () => {
          draftWorkoutItems.push({
            uid: `${ex.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exercitiu_id: ex.id,
            nume: ex.nume,
            meta: ex.meta,
          });
          renderModalLists();
        });

        actions.append(addBtn);
        li.append(info, actions);
        modalCatalogListEl.appendChild(li);
      }
    }
  }

  async function saveModalWorkout() {
    const cleanName = (modalNameInput?.value || '').trim();
    if (!cleanName) {
      setStatus('Introdu un nume valid pentru workout.', 'error');
      modalNameInput?.focus();
      return;
    }

    if (modalSaveBtn) modalSaveBtn.disabled = true;
    setStatus(`Se salvează "${cleanName}"...`, 'info');

    try {
      let targetWorkoutId = editingWorkoutId;

      if (targetWorkoutId == null) {
        const { data: created, error: insWErr } = await supabase
          .from('workouts')
          .insert({ nume: cleanName })
          .select('id, nume')
          .single();

        if (insWErr || !created) throw insWErr || new Error('Nu s-a putut crea workout-ul.');
        targetWorkoutId = created.id;
      } else {
        const { error: updErr } = await supabase
          .from('workouts')
          .update({ nume: cleanName })
          .eq('id', targetWorkoutId);
        if (updErr) throw updErr;

        const { error: delErr } = await supabase
          .from('workout_exercitii')
          .delete()
          .eq('workout_id', targetWorkoutId);
        if (delErr) throw delErr;
      }

      if (draftWorkoutItems.length) {
        const rows = draftWorkoutItems.map((item, idx) => ({
          workout_id: targetWorkoutId,
          exercitiu_id: item.exercitiu_id,
          pozitie: idx + 1,
        }));
        const { error: insExErr } = await supabase
          .from('workout_exercitii')
          .insert(rows);
        if (insExErr) throw insExErr;
      }

      const savedCount = draftWorkoutItems.length;
      closeWorkoutModal(false);
      setStatus(`Workout-ul "${cleanName}" a fost salvat (${savedCount} ${savedCount === 1 ? 'exercițiu' : 'exerciții'}).`, 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'workouts' } }));
      await loadData();
    } catch (err) {
      setStatus(formatError(err, 'Nu s-a putut salva workout-ul.'), 'error');
    } finally {
      if (modalSaveBtn) modalSaveBtn.disabled = false;
    }
  }

  async function deleteWorkoutCard(workoutObj) {
    setStatus(`Se șterge workout-ul "${workoutObj.nume}"...`, 'info');
    try {
      const { error: delExErr } = await supabase
        .from('workout_exercitii')
        .delete()
        .eq('workout_id', workoutObj.id);
      if (delExErr) throw delExErr;

      const { error: delWErr } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutObj.id);
      if (delWErr) throw delWErr;

      if (isModalOpen && String(editingWorkoutId) === String(workoutObj.id)) {
        closeWorkoutModal(false);
      }

      setStatus(`Workout-ul "${workoutObj.nume}" a fost șters.`, 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'workouts' } }));
      await loadData();
    } catch (err) {
      setStatus(formatError(err, 'Nu s-a putut șterge workout-ul.'), 'error');
    }
  }

  function renderWorkoutsGrid() {
    if (!workoutsGridEl) return;
    workoutsGridEl.innerHTML = '';

    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'workout-card workout-add-card';
    addCard.innerHTML = `
      <span class="workout-add-plus">+</span>
      <span class="workout-add-title">Adaugă workout</span>
      <span class="workout-add-sub">Creează un workout nou</span>
    `;
    addCard.addEventListener('click', () => {
      setStatus('');
      openWorkoutModal(null);
    });
    workoutsGridEl.appendChild(addCard);

    for (const w of workoutsList) {
      const card = document.createElement('article');
      card.className = 'workout-card';
      card.addEventListener('click', () => {
        setStatus('');
        openWorkoutModal(w);
      });

      const delIconBtn = document.createElement('button');
      delIconBtn.type = 'button';
      delIconBtn.className = 'btn-card-delete-icon';
      delIconBtn.title = 'Șterge workout';
      delIconBtn.setAttribute('aria-label', `Șterge workout-ul ${w.nume}`);
      delIconBtn.appendChild(createTrashIcon());
      delIconBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        delIconBtn.disabled = true;
        await deleteWorkoutCard(w);
      });

      const header = document.createElement('div');
      header.className = 'workout-card-header';

      const title = document.createElement('h2');
      title.className = 'workout-card-title';
      title.textContent = w.nume;

      const exCount = w.items.length;
      const pill = document.createElement('span');
      pill.className = 'workout-count-pill';
      pill.textContent = `${exCount} ${exCount === 1 ? 'exercițiu' : 'exerciții'}`;

      header.append(title, pill);

      const ul = document.createElement('ul');
      ul.className = 'workout-ex-list';

      if (!w.items.length) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Niciun exercițiu în acest workout.';
        ul.appendChild(li);
      } else {
        for (const item of w.items) {
          const li = document.createElement('li');
          li.className = 'workout-ex-item';

          const info = document.createElement('div');
          info.className = 'workout-ex-info';
          const nameSpan = document.createElement('div');
          nameSpan.className = 'workout-ex-name';
          nameSpan.textContent = item.nume;
          const metaSpan = document.createElement('div');
          metaSpan.className = 'workout-ex-meta';
          metaSpan.textContent = item.meta;
          info.append(nameSpan, metaSpan);
          li.appendChild(info);
          ul.appendChild(li);
        }
      }

      card.append(delIconBtn, header, ul);
      workoutsGridEl.appendChild(card);
    }
  }

  modalCloseBtn?.addEventListener('click', () => closeWorkoutModal(true));
  modalSaveBtn?.addEventListener('click', saveModalWorkout);

  rootModal?.addEventListener('click', (e) => {
    if (e.target === rootModal) {
      closeWorkoutModal(true);
    }
  });

  exSearchInput?.addEventListener('input', renderModalLists);
  filterCatSelect?.addEventListener('change', renderModalLists);
  filterMusSelect?.addEventListener('change', renderModalLists);
  filterEqSelect?.addEventListener('change', renderModalLists);

  onKeyDown = (e) => {
    if (e.key === 'Escape' && isModalOpen) {
      closeWorkoutModal(true);
    }
  };
  document.addEventListener('keydown', onKeyDown);

  onDataChanged = () => {
    loadData().catch((err) => {
      setStatus(formatError(err, 'Nu s-au putut reîncărca workout-urile.'), 'error');
    });
  };
  window.addEventListener('trainer:data-changed', onDataChanged);

  try {
    await loadData();
  } catch (err) {
    setStatus(formatError(err, 'Nu s-au putut încărca workout-urile.'), 'error');
  }
}