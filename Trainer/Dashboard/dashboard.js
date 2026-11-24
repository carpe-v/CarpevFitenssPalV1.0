let onDataChanged = null;

export function cleanup() {
  if (onDataChanged) {
    window.removeEventListener('trainer:data-changed', onDataChanged);
    onDataChanged = null;
  }
}

export async function mount({ container, profile, supabase, navigateTo }) {
  const userInfoEl = container.querySelector('#dash-user-info');
  const statusEl = container.querySelector('#dash-status');
  const kpiClientsEl = container.querySelector('#kpi-clients');
  const kpiActiveEl = container.querySelector('#kpi-active-pkgs');
  const kpiFinishedEl = container.querySelector('#kpi-finished-pkgs');
  const kpiSessionsEl = container.querySelector('#kpi-sessions-done');
  const activeClientsListEl = container.querySelector('#active-clients-list');
  const tbodyEl = container.querySelector('#exercises-tbody');



  async function refreshAll() {
    try {
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'message';
      }

      const [cliRes, pkgRes, cpRes, exRes, catRes, musRes, eqRes] = await Promise.all([
        supabase.from('clienti').select('id, nume').order('nume'),
        supabase.from('pachete').select('id, nume, numar_sedinte'),
        supabase.from('client_pachete').select('id, client_id, pachet_id, sedinte_efectuate, status'),
        supabase.from('exercitii').select('id, nume, categorie_id, grupa_musculara_id, echipament_id').order('id', { ascending: false }),
        supabase.from('categorie').select('id, nume'),
        supabase.from('grupa_musculara').select('id, nume'),
        supabase.from('echipament').select('id, nume'),
      ]);

      const clients = cliRes.data || [];
      const packages = pkgRes.data || [];
      const cpList = cpRes.data || [];

      const clientsMap = new Map(clients.map((c) => [c.id, c]));
      const packagesMap = new Map(packages.map((p) => [p.id, p]));

      const activePkgs = cpList.filter((x) => x.status === 'activ');
      const finishedPkgs = cpList.filter((x) => x.status === 'terminat');
      const sessionsDone = cpList.reduce((acc, x) => acc + (Number(x.sedinte_efectuate) || 0), 0);

      if (kpiClientsEl) kpiClientsEl.textContent = String(clients.length);
      if (kpiActiveEl) kpiActiveEl.textContent = String(activePkgs.length);
      if (kpiFinishedEl) kpiFinishedEl.textContent = String(finishedPkgs.length);
      if (kpiSessionsEl) kpiSessionsEl.textContent = String(sessionsDone);

      if (activeClientsListEl) {
        activeClientsListEl.innerHTML = '';
        if (!activePkgs.length) {
          activeClientsListEl.innerHTML = '<p class="empty-hint">Nu există clienți cu pachet activ.</p>';
        } else {
          for (const cp of activePkgs) {
            const c = clientsMap.get(cp.client_id);
            if (!c) continue;
            const p = packagesMap.get(cp.pachet_id);
            const card = document.createElement('article');
            card.className = 'dash-client-card';
            card.addEventListener('click', () => navigateTo(`/clienti/profil?id=${c.id}`));
            card.innerHTML = `
              <div class="dash-client-name">${c.nume}</div>
              <div class="dash-client-pkg">${p?.nume || 'Pachet activ'}</div>
              <div class="dash-client-progress">Ședințe efectuate: ${cp.sedinte_efectuate || 0} / ${p?.numar_sedinte || 0}</div>
            `;
            activeClientsListEl.appendChild(card);
          }
        }
      }

      const catMap = new Map((catRes.data || []).map((x) => [x.id, x.nume]));
      const musMap = new Map((musRes.data || []).map((x) => [x.id, x.nume]));
      const eqMap = new Map((eqRes.data || []).map((x) => [x.id, x.nume]));

      if (tbodyEl) {
        tbodyEl.innerHTML = '';
        const exList = exRes.data || [];
        if (!exList.length) {
          tbodyEl.innerHTML = '<tr><td colspan="4" class="table-empty">Nu există exerciții.</td></tr>';
        } else {
          for (const ex of exList) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${ex.nume}</td>
              <td>${catMap.get(ex.categorie_id) || '-'}</td>
              <td>${musMap.get(ex.grupa_musculara_id) || '-'}</td>
              <td>${eqMap.get(ex.echipament_id) || '-'}</td>
            `;
            tbodyEl.appendChild(tr);
          }
        }
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err?.message || 'Eroare la încărcarea dashboard-ului.';
        statusEl.className = 'message error';
      }
    }
  }

  onDataChanged = () => refreshAll();
  window.addEventListener('trainer:data-changed', onDataChanged);

  await refreshAll();
}