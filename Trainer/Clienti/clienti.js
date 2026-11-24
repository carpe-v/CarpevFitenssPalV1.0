let onKeyDown = null;
let onDataChanged = null;
let modalElRef = null;

function createEditIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M12 20h9');
  const path2 = document.createElementNS(svgNS, 'path');
  path2.setAttribute('d', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z');

  svg.append(path, path2);
  return svg;
}

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

export async function mount({ container, supabase, navigateTo }) {
  const searchClientInput = container.querySelector('#search-client');
  const clientsStatusEl = container.querySelector('#clients-status');
  const clientsGridEl = container.querySelector('#clients-grid');

  document.querySelectorAll('#client-modal').forEach((el) => {
    if (!container.contains(el)) el.remove();
  });

  const modalBackdropEl = container.querySelector('#client-modal');
  if (modalBackdropEl) {
    modalElRef = modalBackdropEl;
    if (modalBackdropEl.parentElement !== document.body) {
      document.body.appendChild(modalBackdropEl);
    }
  }

  const clientModal = modalBackdropEl || document.getElementById('client-modal');
  const clientModalTitleEl = clientModal?.querySelector('#client-modal-title');
  const clientForm = clientModal?.querySelector('#client-form');
  const clientNameInput = clientModal?.querySelector('#client-name');
  const clientEmailInput = clientModal?.querySelector('#client-email');
  const clientPhoneInput = clientModal?.querySelector('#client-phone');
  const closeClientBtn = clientModal?.querySelector('#client-modal-close-btn');
  const saveClientBtn = clientModal?.querySelector('#save-client-btn');
  const clientMessageEl = clientModal?.querySelector('#client-message');

  let clientsData = [];
  let editingClientId = null;

  function setStatus(el, text, type = '') {
    if (!el) return;
    el.textContent = text;
    el.className = type ? `message ${type}` : 'message';
  }

  function openClientModal(client = null) {
    editingClientId = client ? client.id : null;
    clientForm?.reset();

    if (clientModalTitleEl) {
      clientModalTitleEl.textContent = client ? 'Editează client' : 'Adaugă client';
    }
    if (saveClientBtn) {
      saveClientBtn.textContent = client ? 'Salvează modificările' : 'Salvează client';
    }

    if (client) {
      if (clientNameInput) clientNameInput.value = client.nume || '';
      if (clientEmailInput) clientEmailInput.value = client.email || '';
      if (clientPhoneInput) clientPhoneInput.value = client.telefon || '';
    }

    setStatus(clientMessageEl, '');
    clientModal?.classList.remove('hidden');
    clientNameInput?.focus();
  }

  function closeClientModal() {
    clientModal?.classList.add('hidden');
    editingClientId = null;
  }

  async function loadClientsAndPackages() {
    try {
      setStatus(clientsStatusEl, '');

      const [cliRes, pkgRes, cpRes] = await Promise.all([
        supabase.from('clienti').select('id, nume, email, telefon, created_at').order('id', { ascending: false }),
        supabase.from('pachete').select('id, nume, numar_sedinte').order('nume', { ascending: true }),
        supabase.from('client_pachete').select('id, client_id, pachet_id, sedinte_efectuate').order('id', { ascending: false }),
      ]);

      if (cliRes.error) throw cliRes.error;
      if (pkgRes.error) throw pkgRes.error;
      if (cpRes.error) throw cpRes.error;

      const packagesMap = new Map((pkgRes.data || []).map((p) => [p.id, p]));

      const latestAssignByClient = new Map();
      for (const cp of cpRes.data || []) {
        if (!latestAssignByClient.has(cp.client_id)) {
          latestAssignByClient.set(cp.client_id, cp);
        }
      }

      clientsData = (cliRes.data || []).map((c) => {
        const assignment = latestAssignByClient.get(c.id) || null;
        const pkg = assignment ? packagesMap.get(assignment.pachet_id) : null;
        return {
          ...c,
          assignment,
          packageInfo: pkg,
        };
      });

      renderClientsGrid();
    } catch (err) {
      setStatus(clientsStatusEl, err?.message || 'Nu s-au putut încărca clienții.', 'error');
    }
  }

  async function deleteClient(clientId, clientName) {
    try {
      const { error } = await supabase.from('clienti').delete().eq('id', clientId);
      if (error) throw error;
      setStatus(clientsStatusEl, `Clientul "${clientName}" a fost șters.`, 'success');
      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'clienti' } }));
      await loadClientsAndPackages();
    } catch (err) {
      setStatus(clientsStatusEl, err?.message || 'Nu s-a putut șterge clientul.', 'error');
    }
  }

  function renderClientsGrid() {
    if (!clientsGridEl) return;
    clientsGridEl.innerHTML = '';

    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'client-card client-add-card';
    addCard.innerHTML = `
      <span class="client-add-plus">+</span>
      <span class="client-add-title">Adaugă client</span>
      <span class="client-add-sub">Adaugă un client nou</span>
    `;
    addCard.addEventListener('click', () => openClientModal(null));
    clientsGridEl.appendChild(addCard);

    const q = (searchClientInput?.value || '').trim().toLowerCase();
    const filtered = clientsData.filter((c) => {
      if (!q) return true;
      const matchName = (c.nume || '').toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      return matchName || matchEmail;
    });

    if (!filtered.length) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'Nu există clienți care să corespundă filtrului.';
      clientsGridEl.appendChild(p);
      return;
    }

    for (const client of filtered) {
      const card = document.createElement('article');
      card.className = 'client-card';
      card.addEventListener('click', () => {
        const targetRoute = `/clienti/profil?id=${encodeURIComponent(client.id)}`;
        if (typeof navigateTo === 'function') {
          navigateTo(targetRoute);
        } else {
          window.location.hash = `#${targetRoute}`;
        }
      });

      const editIconBtn = document.createElement('button');
      editIconBtn.type = 'button';
      editIconBtn.className = 'btn-card-edit-icon';
      editIconBtn.title = 'Editează client';
      editIconBtn.setAttribute('aria-label', `Editează clientul ${client.nume}`);
      editIconBtn.appendChild(createEditIcon());
      editIconBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openClientModal(client);
      });

      const delIconBtn = document.createElement('button');
      delIconBtn.type = 'button';
      delIconBtn.className = 'btn-card-delete-icon';
      delIconBtn.title = 'Șterge client';
      delIconBtn.setAttribute('aria-label', `Șterge clientul ${client.nume}`);
      delIconBtn.appendChild(createTrashIcon());
      delIconBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        delIconBtn.disabled = true;
        await deleteClient(client.id, client.nume);
      });

      const topInfo = document.createElement('div');
      topInfo.className = 'client-card-top';

      const nameEl = document.createElement('h2');
      nameEl.className = 'client-name';
      nameEl.textContent = client.nume;

      const contactEl = document.createElement('p');
      contactEl.className = 'client-contact';
      const parts = [client.email, client.telefon].filter(Boolean);
      contactEl.textContent = parts.length ? parts.join(' • ') : 'Fără date de contact';

      topInfo.append(nameEl, contactEl);

      const pkgBox = document.createElement('div');
      pkgBox.className = 'client-package-box';

      if (client.assignment && client.packageInfo) {
        const pkgTitle = document.createElement('div');
        pkgTitle.className = 'client-package-title';
        pkgTitle.textContent = client.packageInfo.nume;

        const pkgMeta = document.createElement('div');
        pkgMeta.className = 'client-package-meta';
        pkgMeta.textContent = `Ședințe efectuate: ${client.assignment.sedinte_efectuate || 0} / ${client.packageInfo.numar_sedinte}`;

        pkgBox.append(pkgTitle, pkgMeta);
      } else {
        const noPkg = document.createElement('div');
        noPkg.className = 'client-package-meta';
        noPkg.textContent = 'Niciun pachet asignat.';
        pkgBox.appendChild(noPkg);
      }

      card.append(editIconBtn, delIconBtn, topInfo, pkgBox);
      clientsGridEl.appendChild(card);
    }
  }

  searchClientInput?.addEventListener('input', renderClientsGrid);
  closeClientBtn?.addEventListener('click', closeClientModal);

  clientModal?.addEventListener('click', (e) => {
    if (e.target === clientModal) closeClientModal();
  });

  onKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeClientModal();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  onDataChanged = () => {
    loadClientsAndPackages().catch(() => {});
  };
  window.addEventListener('trainer:data-changed', onDataChanged);

  clientForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nume = (clientNameInput?.value || '').trim();
    const email = (clientEmailInput?.value || '').trim() || null;
    const telefon = (clientPhoneInput?.value || '').trim() || null;

    if (!nume) {
      setStatus(clientMessageEl, 'Introdu numele clientului.', 'error');
      return;
    }

    if (saveClientBtn) saveClientBtn.disabled = true;
    setStatus(clientMessageEl, editingClientId ? 'Se actualizează clientul...' : 'Se salvează clientul...', 'info');

    try {
      if (editingClientId) {
        const { error } = await supabase
          .from('clienti')
          .update({ nume, email, telefon })
          .eq('id', editingClientId);
        if (error) throw error;
        setStatus(clientMessageEl, 'Datele clientului au fost actualizate.', 'success');
      } else {
        const { error } = await supabase.from('clienti').insert({ nume, email, telefon });
        if (error) throw error;
        setStatus(clientMessageEl, 'Clientul a fost adăugat.', 'success');
      }

      window.dispatchEvent(new CustomEvent('trainer:data-changed', { detail: { source: 'clienti' } }));
      await loadClientsAndPackages();

      setTimeout(() => {
        closeClientModal();
      }, 500);
    } catch (err) {
      setStatus(clientMessageEl, err?.message || 'Nu s-a putut salva clientul.', 'error');
    } finally {
      if (saveClientBtn) saveClientBtn.disabled = false;
    }
  });

  await loadClientsAndPackages();
}