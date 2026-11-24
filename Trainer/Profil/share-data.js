const STORAGE_TRAINER_NAME_KEY = 'trainer_share_name_v1';
const STORAGE_TRAINER_LOGO_KEY = 'trainer_share_logo_v1';
const STORAGE_TRAINER_LOGO_NAME_KEY = 'trainer_share_logo_name_v1';

const DIGITAL_WEIGHT_PALETTE = [
  { bg: [0.11, 0.28, 0.48], fg: [0.72, 0.92, 1.00], cssBg: 'rgba(56, 189, 248, 0.22)', cssFg: '#bae6fd', cssBorder: 'rgba(56, 189, 248, 0.48)' },
  { bg: [0.10, 0.36, 0.25], fg: [0.68, 0.97, 0.80], cssBg: 'rgba(52, 211, 153, 0.22)', cssFg: '#a7f3d0', cssBorder: 'rgba(52, 211, 153, 0.48)' },
  { bg: [0.40, 0.25, 0.08], fg: [1.00, 0.85, 0.52], cssBg: 'rgba(251, 191, 36, 0.22)', cssFg: '#fde68a', cssBorder: 'rgba(251, 191, 36, 0.48)' },
  { bg: [0.29, 0.17, 0.48], fg: [0.88, 0.79, 1.00], cssBg: 'rgba(167, 139, 250, 0.22)', cssFg: '#ddd6fe', cssBorder: 'rgba(167, 139, 250, 0.48)' },
  { bg: [0.44, 0.15, 0.25], fg: [1.00, 0.75, 0.84], cssBg: 'rgba(251, 113, 133, 0.22)', cssFg: '#fecdd3', cssBorder: 'rgba(251, 113, 133, 0.48)' },
  { bg: [0.09, 0.34, 0.40], fg: [0.68, 0.96, 1.00], cssBg: 'rgba(34, 211, 238, 0.22)', cssFg: '#a5f3fc', cssBorder: 'rgba(34, 211, 238, 0.48)' },
];

function getDigitalWeightStyle(kg) {
  const numericKg = Math.max(0, Number(kg) || 0);
  const key = Math.round(numericKg * 10);
  const idx = Math.abs(key) % DIGITAL_WEIGHT_PALETTE.length;
  return DIGITAL_WEIGHT_PALETTE[idx];
}

function formatKgNumber(kg) {
  const n = Number(kg) || 0;
  return Number.isInteger(n) ? String(n) : String(n);
}

function formatSetLabelText(setItem) {
  const reps = Math.max(0, Number(setItem.repetari) || 0);
  const kgText = formatKgNumber(setItem.greutate);
  return `${reps} repetitii cu ${kgText} kg`;
}

function createUploadIcon() {
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
  poly.setAttribute('points', '17 8 12 3 7 8');
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', '12');
  line.setAttribute('y1', '3');
  line.setAttribute('x2', '12');
  line.setAttribute('y2', '15');

  svg.append(path, poly, line);
  return svg;
}

async function resolveSupabaseClient(injectedSupabase) {
  if (injectedSupabase) return injectedSupabase;
  try {
    const mod = await import('../../supabaseClient.js');
    return mod.supabase || null;
  } catch {
    return null;
  }
}

function getClientIdFromContext(query) {
  if (query?.get('id')) return Number(query.get('id'));
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('id')) return Number(searchParams.get('id'));
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex !== -1) {
    const hashParams = new URLSearchParams(hash.slice(qIndex + 1));
    if (hashParams.get('id')) return Number(hashParams.get('id'));
  }
  return null;
}

function sanitizePdfText(str) {
  const map = {
    ă: 'a',
    â: 'a',
    î: 'i',
    ș: 's',
    ş: 's',
    ț: 't',
    ţ: 't',
    Ă: 'A',
    Â: 'A',
    Î: 'I',
    Ș: 'S',
    Ş: 'S',
    Ț: 'T',
    Ţ: 'T',
  };
  return String(str || '')
    .replace(/[ăâîșşțţĂÂÎȘŞȚŢ]/g, (ch) => map[ch] || ch)
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function estimatePdfTextWidth(text, fontSize) {
  return String(text || '').length * fontSize * 0.49;
}

function drawPdfText(ops, fontKey, fontSize, rgbStr, x, y, text) {
  ops.push('BT');
  ops.push(`/${fontKey} ${fontSize} Tf ${rgbStr} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${sanitizePdfText(text)}) Tj`);
  ops.push('ET');
}

function appendRoundedRectPath(ops, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  if (radius === 0) {
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    return;
  }
  const k = 0.5522847498;
  const c = radius * k;
  const x0 = x;
  const y0 = y;
  const x1 = x + w;
  const y1 = y + h;

  ops.push(`${(x0 + radius).toFixed(2)} ${y0.toFixed(2)} m`);
  ops.push(`${(x1 - radius).toFixed(2)} ${y0.toFixed(2)} l`);
  ops.push(
    `${(x1 - radius + c).toFixed(2)} ${y0.toFixed(2)} ${x1.toFixed(2)} ${(y0 + radius - c).toFixed(2)} ${x1.toFixed(2)} ${(y0 + radius).toFixed(2)} c`
  );
  ops.push(`${x1.toFixed(2)} ${(y1 - radius).toFixed(2)} l`);
  ops.push(
    `${x1.toFixed(2)} ${(y1 - radius + c).toFixed(2)} ${(x1 - radius + c).toFixed(2)} ${y1.toFixed(2)} ${(x1 - radius).toFixed(2)} ${y1.toFixed(2)} c`
  );
  ops.push(`${(x0 + radius).toFixed(2)} ${y1.toFixed(2)} l`);
  ops.push(
    `${(x0 + radius - c).toFixed(2)} ${y1.toFixed(2)} ${x0.toFixed(2)} ${(y1 - radius + c).toFixed(2)} ${x0.toFixed(2)} ${(y1 - radius).toFixed(2)} c`
  );
  ops.push(`${x0.toFixed(2)} ${(y0 + radius).toFixed(2)} l`);
  ops.push(
    `${x0.toFixed(2)} ${(y0 + radius - c).toFixed(2)} ${(x0 + radius - c).toFixed(2)} ${y0.toFixed(2)} ${(x0 + radius).toFixed(2)} ${y0.toFixed(2)} c`
  );
  ops.push('h');
}

function estimateSessionCardHeight(session, isDigital, contentW = 507.28) {
  let h = 42;
  if (!session.exercises.length) {
    return h + 28;
  }

  const startX = 16;
  const maxRight = contentW - 14;
  const pillH = 20;
  const pillGap = 8;

  for (const ex of session.exercises) {
    h += 22;
    if (isDigital) {
      let pillX = startX;
      let rowsCount = 1;
      for (const st of ex.sets || []) {
        const labelText = formatSetLabelText(st);
        const pillW = Math.max(98, estimatePdfTextWidth(labelText, 8.5) + 18);
        if (pillX + pillW > maxRight) {
          pillX = startX;
          rowsCount += 1;
        }
        pillX += pillW + pillGap;
      }
      h += rowsCount * (pillH + pillGap) + 8;
    } else {
      h += ((ex.sets?.length || 0) + 1) * 19 + 16;
    }
  }
  return h + 14;
}

async function imageToJpegBytes(dataUrl, bgHex = '#ffffff') {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const maxDim = 240;
      let w = img.width || 120;
      let h = img.height || 120;
      if (w > maxDim || h > maxDim) {
        const scale = Math.min(maxDim / w, maxDim / h);
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      const jpegUrl = canvas.toDataURL('image/jpeg', 0.9);
      const base64 = jpegUrl.split(',')[1] || '';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      resolve({ bytes, width: w, height: h });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function buildPdfBlob({ mode, clientName, trainerName, sessions, logoJpeg }) {
  const isDigital = mode === 'digital';
  const pageW = 595.28;
  const pageH = 841.89;
  const marginX = 44;
  const contentW = pageW - marginX * 2;
  const sessionGap = 24;

  const bgRgb = isDigital ? '0.03 0.06 0.15' : '1.00 1.00 1.00';
  const cardBgRgb = isDigital ? '0.08 0.14 0.30' : '0.96 0.97 0.99';
  const accentRgb = isDigital ? '0.22 0.74 0.97' : '0.01 0.41 0.63';
  const textRgb = isDigital ? '0.96 0.98 1.00' : '0.06 0.09 0.16';
  const mutedRgb = isDigital ? '0.78 0.84 0.92' : '0.22 0.28 0.36';
  const gridStrokeRgb = isDigital ? '0.35 0.42 0.52' : '0.42 0.48 0.56';

  const darkSessionFillRgb = '0.04 0.08 0.19';
  const blueShadowRgb = '0.02 0.04 0.10';
  const blueBorderRgb = '0.22 0.56 0.85';
  const blueTitleRgb = '0.49 0.83 0.99';

  const pages = [];
  let currentOps = [];
  let y = pageH - 44;

  function initPageBackground(isFirstPage) {
    currentOps = [];
    currentOps.push(`${bgRgb} rg`);
    currentOps.push(`0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)} re f`);

    if (isFirstPage) {
      currentOps.push(`${cardBgRgb} rg`);
      currentOps.push(`${marginX} ${(pageH - 108).toFixed(2)} ${contentW.toFixed(2)} 64 re f`);

      currentOps.push(`${accentRgb} rg`);
      currentOps.push(`${marginX} ${(pageH - 108).toFixed(2)} 4 64 re f`);

      if (logoJpeg) {
        const boxW = 50;
        const boxH = 50;
        const ratio = Math.min(boxW / logoJpeg.width, boxH / logoJpeg.height);
        const drawW = (logoJpeg.width * ratio).toFixed(2);
        const drawH = (logoJpeg.height * ratio).toFixed(2);
        const drawX = (pageW - marginX - Number(drawW) - 10).toFixed(2);
        const drawY = (pageH - 76 - Number(drawH) / 2).toFixed(2);
        currentOps.push(`q ${drawW} 0 0 ${drawH} ${drawX} ${drawY} cm /LogoDo Do Q`);
      }

      const trainerLine = `Antrenor: ${trainerName || '-'}`;
      const clientLine = `Client: ${clientName || 'Client'}`;

      drawPdfText(currentOps, 'F2', 11, textRgb, marginX + 16, pageH - 68, trainerLine);
      drawPdfText(currentOps, 'F1', 10.5, mutedRgb, marginX + 16, pageH - 86, clientLine);

      y = pageH - 134;
    } else {
      y = pageH - 44;
    }
  }

  function startNewPage() {
    if (currentOps.length) {
      pages.push(currentOps.join('\n'));
    }
    initPageBackground(false);
  }

  function ensureSpace(neededHeight) {
    if (y - neededHeight < 42) {
      startNewPage();
    }
  }

  function drawSessionCard(topY, cardHeight) {
    const bottomY = topY - cardHeight;
    const r = 10;

    currentOps.push(`q ${blueShadowRgb} rg`);
    appendRoundedRectPath(currentOps, marginX + 2.5, bottomY - 3.5, contentW, cardHeight, r);
    currentOps.push('f Q');

    currentOps.push(`q ${darkSessionFillRgb} rg`);
    appendRoundedRectPath(currentOps, marginX, bottomY, contentW, cardHeight, r);
    currentOps.push('f Q');

    currentOps.push(`q ${blueBorderRgb} RG 1 w`);
    appendRoundedRectPath(currentOps, marginX, bottomY, contentW, cardHeight, r);
    currentOps.push('S Q');
  }

  initPageBackground(true);

  for (const s of sessions) {
    const estCardH = estimateSessionCardHeight(s, isDigital, contentW);
    ensureSpace(Math.min(estCardH, 140));

    const cardTopY = y;
    if (isDigital) {
      drawSessionCard(cardTopY, estCardH);
    }

    const sessionHeading = `Sedinta ${s.numar_sedinta}`;
    const headingW = estimatePdfTextWidth(sessionHeading, 11);
    const centeredX = marginX + (contentW - headingW) / 2;

    drawPdfText(
      currentOps,
      'F2',
      11,
      isDigital ? blueTitleRgb : accentRgb,
      centeredX,
      y - 20,
      sessionHeading
    );

    y -= 38;

    if (!s.exercises.length) {
      ensureSpace(24);
      drawPdfText(currentOps, 'F1', 9.5, mutedRgb, marginX + 14, y, 'Niciun exercitiu inregistrat.');
      y -= 24;
    } else {
      for (const ex of s.exercises) {
        ensureSpace(22);
        drawPdfText(currentOps, 'F2', 10, textRgb, marginX + 14, y, ex.nume);
        y -= 20;

        if (isDigital) {
          let pillX = marginX + 16;
          const pillH = 20;
          const pillGap = 8;
          const maxRight = marginX + contentW - 14;

          for (const st of ex.sets) {
            const labelText = formatSetLabelText(st);
            const pillW = Math.max(98, estimatePdfTextWidth(labelText, 8.5) + 18);

            if (pillX + pillW > maxRight) {
              pillX = marginX + 16;
              y -= pillH + pillGap;
              ensureSpace(pillH + 10);
            } else {
              ensureSpace(pillH + 8);
            }

            const wStyle = getDigitalWeightStyle(st.greutate);
            const bgStr = wStyle.bg.map((v) => v.toFixed(2)).join(' ');
            const fgStr = wStyle.fg.map((v) => v.toFixed(2)).join(' ');

            currentOps.push(`q ${bgStr} rg`);
            appendRoundedRectPath(currentOps, pillX, y - 4, pillW, pillH, 8);
            currentOps.push('f Q');

            drawPdfText(currentOps, 'F2', 8.5, fgStr, pillX + 9, y + 3, labelText);

            pillX += pillW + pillGap;
          }

          y -= pillH + 14;
        } else {
          const col1W = 85;
          const col2W = 105;
          const col3W = 95;
          const col4W = contentW - 28 - col1W - col2W - col3W;
          const tableX = marginX + 14;
          const rowH = 19;

          ensureSpace(rowH * (ex.sets.length + 1) + 14);

          const headerTopY = y + 4;
          const headerBottomY = headerTopY - rowH;

          currentOps.push(`${gridStrokeRgb} RG 0.8 w`);
          currentOps.push(`${cardBgRgb} rg`);
          currentOps.push(`${tableX} ${headerBottomY.toFixed(2)} ${col1W} ${rowH} re B`);
          currentOps.push(`${tableX + col1W} ${headerBottomY.toFixed(2)} ${col2W} ${rowH} re B`);
          currentOps.push(`${tableX + col1W + col2W} ${headerBottomY.toFixed(2)} ${col3W} ${rowH} re B`);
          currentOps.push(`${tableX + col1W + col2W + col3W} ${headerBottomY.toFixed(2)} ${col4W} ${rowH} re B`);

          const headerTextY = headerBottomY + 6;
          drawPdfText(currentOps, 'F2', 8.5, textRgb, tableX + 8, headerTextY, 'Seria');
          drawPdfText(currentOps, 'F2', 8.5, textRgb, tableX + col1W + 8, headerTextY, 'Repetari');
          drawPdfText(currentOps, 'F2', 8.5, textRgb, tableX + col1W + col2W + 8, headerTextY, 'Kg');
          drawPdfText(currentOps, 'F2', 8.5, textRgb, tableX + col1W + col2W + col3W + 8, headerTextY, 'Note');

          y = headerBottomY;

          for (const st of ex.sets) {
            ensureSpace(rowH + 8);
            const rowTopY = y;
            const rowBottomY = rowTopY - rowH;

            currentOps.push(`1 1 1 rg`);
            currentOps.push(`${tableX} ${rowBottomY.toFixed(2)} ${col1W} ${rowH} re B`);
            currentOps.push(`${tableX + col1W} ${rowBottomY.toFixed(2)} ${col2W} ${rowH} re B`);
            currentOps.push(`${tableX + col1W + col2W} ${rowBottomY.toFixed(2)} ${col3W} ${rowH} re B`);
            currentOps.push(`${tableX + col1W + col2W + col3W} ${rowBottomY.toFixed(2)} ${col4W} ${rowH} re B`);

            drawPdfText(currentOps, 'F1', 8.5, textRgb, tableX + 8, rowBottomY + 6, `Seria ${st.set_nr}`);

            y = rowBottomY;
          }

          y -= 14;
        }
      }
    }

    const expectedBottomY = cardTopY - estCardH;
    y = Math.min(y, expectedBottomY) - sessionGap;
  }

  if (currentOps.length) {
    pages.push(currentOps.join('\n'));
  }

  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObj('');
  const pagesId = addObj('');
  const fontRegId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );

  let logoXObjId = null;
  if (logoJpeg) {
    const imgHeader = `<< /Type /XObject /Subtype /Image /Width ${logoJpeg.width} /Height ${logoJpeg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoJpeg.bytes.length} >>\nstream\n`;
    const imgFooter = '\nendstream';
    const preBytes = new TextEncoder().encode(imgHeader);
    const postBytes = new TextEncoder().encode(imgFooter);
    const combined = new Uint8Array(preBytes.length + logoJpeg.bytes.length + postBytes.length);
    combined.set(preBytes, 0);
    combined.set(logoJpeg.bytes, preBytes.length);
    combined.set(postBytes, preBytes.length + logoJpeg.bytes.length);
    logoXObjId = addObj(combined);
  }

  const pageIds = [];
  for (let i = 0; i < pages.length; i++) {
    const streamStr = pages[i];
    const streamBytes = new TextEncoder().encode(streamStr);
    const contentId = addObj(`<< /Length ${streamBytes.length} >>\nstream\n${streamStr}\nendstream`);

    const xObjPart = i === 0 && logoXObjId ? `/XObject << /LogoDo ${logoXObjId} 0 R >>` : '';
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /Font << /F1 ${fontRegId} 0 R /F2 ${fontBoldId} 0 R >> ${xObjPart} >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  const headerBytes = new TextEncoder().encode('%PDF-1.4\n');
  const chunks = [headerBytes];
  const offsets = [0];
  let currentOffset = headerBytes.length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentOffset);
    const prefix = new TextEncoder().encode(`${i + 1} 0 obj\n`);
    const suffix = new TextEncoder().encode('\nendobj\n');
    const bodyBytes =
      objects[i] instanceof Uint8Array
        ? objects[i]
        : new TextEncoder().encode(objects[i]);

    chunks.push(prefix, bodyBytes, suffix);
    currentOffset += prefix.length + bodyBytes.length + suffix.length;
  }

  const xrefOffset = currentOffset;
  let xrefStr = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xrefStr += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xrefStr += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  chunks.push(new TextEncoder().encode(xrefStr));
  return new Blob(chunks, { type: 'application/pdf' });
}

export function cleanup() {}

export async function mount({ container, query, supabase: injectedSupabase, navigateTo } = {}) {
  const root = container || document.getElementById('share-data-root') || document.body;
  const supabase = await resolveSupabaseClient(injectedSupabase);
  const clientId = getClientIdFromContext(query);

  const backLinkEl = root.querySelector('#share-back-link');
  const statusEl = root.querySelector('#share-status');
  const tabDigitalBtn = root.querySelector('#tab-digital');
  const tabPrintBtn = root.querySelector('#tab-print');
  const pkgSelectEl = root.querySelector('#share-package-select');
  const trainerNameInputEl = root.querySelector('#share-trainer-name');
  const uploadLogoBtn = root.querySelector('#upload-logo-btn');
  const logoInputEl = root.querySelector('#share-logo-input');
  const logoNameEl = root.querySelector('#share-logo-name');
  const logoPreviewEl = root.querySelector('#share-logo-preview');
  const clearLogoBtn = root.querySelector('#clear-logo-btn');
  const sessionsListEl = root.querySelector('#share-sessions-list');
  const selectAllBtn = root.querySelector('#select-all-sessions-btn');
  const clearAllBtn = root.querySelector('#clear-all-sessions-btn');
  const previewMetaPillEl = root.querySelector('#preview-meta-pill');
  const previewSheetEl = root.querySelector('#share-preview-sheet');
  const previewTrainerEl = root.querySelector('#preview-trainer-line');
  const previewClientEl = root.querySelector('#preview-client-line');
  const previewLogoEl = root.querySelector('#preview-logo-img');
  const previewBodyEl = root.querySelector('#preview-sessions-body');
  const generatePdfBtn = root.querySelector('#generate-pdf-btn');

  if (uploadLogoBtn && !uploadLogoBtn.childElementCount) {
    uploadLogoBtn.appendChild(createUploadIcon());
  }

  const querySuffix = clientId ? `?id=${encodeURIComponent(clientId)}` : '';
  const spaProfileRoute = `/clienti/profil${querySuffix}`;
  const mainShellUrl = new URL(`../main.html#${spaProfileRoute}`, import.meta.url).toString();

  if (backLinkEl) {
    backLinkEl.setAttribute('href', mainShellUrl);
    backLinkEl.addEventListener('click', (e) => {
      if (typeof navigateTo === 'function') {
        e.preventDefault();
        navigateTo(spaProfileRoute);
      }
    });
  }

  let activeMode = 'digital';
  let clientName = 'Client';
  let packagesMap = new Map();
  let exercisesMap = new Map();
  let clientPackages = [];
  let sessionExercisesByCp = new Map();
  let selectedSessionNums = new Set();

  let logoDataUrl = '';
  try {
    const savedName = localStorage.getItem(STORAGE_TRAINER_NAME_KEY);
    if (savedName && trainerNameInputEl) {
      trainerNameInputEl.value = savedName;
    }

    const savedLogo = localStorage.getItem(STORAGE_TRAINER_LOGO_KEY);
    const savedLogoName = localStorage.getItem(STORAGE_TRAINER_LOGO_NAME_KEY);
    if (savedLogo) {
      logoDataUrl = savedLogo;
      if (logoNameEl) logoNameEl.textContent = savedLogoName || 'Siglă salvată';
      if (logoPreviewEl) {
        logoPreviewEl.src = logoDataUrl;
        logoPreviewEl.classList.remove('hidden');
      }
      clearLogoBtn?.classList.remove('hidden');
    }
  } catch {
    // ignoră
  }

  function setStatus(text, type = '') {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = type ? `message ${type}` : 'message';
  }

  function setActiveMode(mode) {
    activeMode = mode === 'print' ? 'print' : 'digital';
    const isDigital = activeMode === 'digital';

    tabDigitalBtn?.classList.toggle('active', isDigital);
    tabDigitalBtn?.setAttribute('aria-selected', String(isDigital));

    tabPrintBtn?.classList.toggle('active', !isDigital);
    tabPrintBtn?.setAttribute('aria-selected', String(!isDigital));

    if (generatePdfBtn) {
      generatePdfBtn.textContent = isDigital ? 'Generează PDF Digital' : 'Generează PDF Print';
    }

    renderPreview();
  }

  function getSelectedClientPackage() {
    const cpId = pkgSelectEl?.value ? Number(pkgSelectEl.value) : null;
    return clientPackages.find((cp) => cp.id === cpId) || null;
  }

  function getSessionsForSelectedPackage() {
    const cp = getSelectedClientPackage();
    if (!cp) return [];

    const pkgInfo = packagesMap.get(cp.pachet_id);
    const totalSessions = Number(pkgInfo?.numar_sedinte) || 1;
    const rows = sessionExercisesByCp.get(cp.id) || [];

    const result = [];
    for (let sNum = 1; sNum <= totalSessions; sNum++) {
      const sRows = rows.filter((r) => r.numar_sedinta === sNum);
      const exOrder = [];
      const exGroups = new Map();
      for (const r of sRows) {
        if (!exGroups.has(r.exercitiu_id)) {
          exOrder.push(r.exercitiu_id);
          exGroups.set(r.exercitiu_id, {
            exercitiu_id: r.exercitiu_id,
            nume: exercisesMap.get(r.exercitiu_id)?.nume || 'Exercițiu',
            sets: [],
          });
        }
        exGroups.get(r.exercitiu_id).sets.push({
          set_nr: r.set_nr ?? 1,
          repetari: r.repetari ?? 0,
          greutate: r.greutate ?? 0,
          nota: r.nota || '',
        });
      }

      result.push({
        numar_sedinta: sNum,
        exercises: exOrder.map((id) => exGroups.get(id)),
      });
    }

    return result;
  }

  function renderSessionsSelector() {
    if (!sessionsListEl) return;
    sessionsListEl.innerHTML = '';

    const allSessions = getSessionsForSelectedPackage();
    if (!allSessions.length) {
      const span = document.createElement('span');
      span.className = 'logo-filename';
      span.textContent = 'Nicio ședință disponibilă pentru pachetul selectat.';
      sessionsListEl.appendChild(span);
      return;
    }

    for (const s of allSessions) {
      const label = document.createElement('label');
      label.className = 'session-pill';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = selectedSessionNums.has(s.numar_sedinta);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedSessionNums.add(s.numar_sedinta);
        } else {
          selectedSessionNums.delete(s.numar_sedinta);
        }
        renderPreview();
      });

      const text = document.createElement('span');
      text.textContent = `Ședința ${s.numar_sedinta} (${s.exercises.length} ex.)`;

      label.append(cb, text);
      sessionsListEl.appendChild(label);
    }
  }

  function renderPreview() {
    const isDigital = activeMode === 'digital';
    const trainerName = (trainerNameInputEl?.value || '').trim();
    const chosenSessions = getSessionsForSelectedPackage().filter((s) =>
      selectedSessionNums.has(s.numar_sedinta)
    );

    if (previewMetaPillEl) {
      previewMetaPillEl.textContent = `${isDigital ? 'Digital (Dark)' : 'Print (Tabel)'} • ${chosenSessions.length} ședințe`;
    }

    if (previewSheetEl) {
      previewSheetEl.className = `pdf-sheet ${isDigital ? 'theme-digital' : 'theme-print'}`;
    }

    if (previewTrainerEl) {
      previewTrainerEl.textContent = `Antrenor: ${trainerName || '—'}`;
    }

    if (previewClientEl) {
      previewClientEl.textContent = `Client: ${clientName}`;
    }

    if (previewLogoEl) {
      if (logoDataUrl) {
        previewLogoEl.src = logoDataUrl;
        previewLogoEl.classList.remove('hidden');
      } else {
        previewLogoEl.removeAttribute('src');
        previewLogoEl.classList.add('hidden');
      }
    }

    if (!previewBodyEl) return;
    previewBodyEl.innerHTML = '';

    if (!chosenSessions.length) {
      const p = document.createElement('p');
      p.className = 'preview-empty';
      p.textContent = 'Selectează cel puțin o ședință pentru a vedea conținutul PDF-ului.';
      previewBodyEl.appendChild(p);
      return;
    }

    for (const s of chosenSessions) {
      const block = document.createElement('div');
      block.className = 'preview-session-block';

      const sTitle = document.createElement('h3');
      sTitle.className = 'preview-session-title';
      sTitle.textContent = `Ședința ${s.numar_sedinta}`;
      block.appendChild(sTitle);

      if (!s.exercises.length) {
        const emptyEx = document.createElement('p');
        emptyEx.className = 'preview-empty';
        emptyEx.textContent = 'Niciun exercițiu înregistrat.';
        block.appendChild(emptyEx);
      } else {
        const exList = document.createElement('div');
        exList.className = 'preview-ex-list';

        for (const ex of s.exercises) {
          const exItem = document.createElement('div');
          exItem.className = 'preview-ex-item';

          const nameEl = document.createElement('div');
          nameEl.className = 'preview-ex-name';
          nameEl.textContent = ex.nume;
          exItem.appendChild(nameEl);

          if (isDigital) {
            const labelsRow = document.createElement('div');
            labelsRow.className = 'preview-sets-labels';

            for (const st of ex.sets) {
              const wStyle = getDigitalWeightStyle(st.greutate);
              const lbl = document.createElement('span');
              lbl.className = 'weight-label';
              lbl.textContent = formatSetLabelText(st);
              lbl.style.backgroundColor = wStyle.cssBg;
              lbl.style.color = wStyle.cssFg;
              lbl.style.borderColor = wStyle.cssBorder;
              labelsRow.appendChild(lbl);
            }

            exItem.appendChild(labelsRow);
          } else {
            const table = document.createElement('table');
            table.className = 'print-sets-table';

            const thead = document.createElement('thead');
            thead.innerHTML = `
              <tr>
                <th>Seria</th>
                <th>Repetări</th>
                <th>Kg</th>
                <th>Note</th>
              </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            for (const st of ex.sets) {
              const tr = document.createElement('tr');

              const tdSet = document.createElement('td');
              tdSet.textContent = `Seria ${st.set_nr}`;

              const tdReps = document.createElement('td');
              const blankReps = document.createElement('span');
              blankReps.className = 'print-blank-cell';
              tdReps.appendChild(blankReps);

              const tdKg = document.createElement('td');
              const blankKg = document.createElement('span');
              blankKg.className = 'print-blank-cell';
              tdKg.appendChild(blankKg);

              const tdNotes = document.createElement('td');
              const blankNotes = document.createElement('span');
              blankNotes.className = 'print-blank-cell';
              tdNotes.appendChild(blankNotes);

              tr.append(tdSet, tdReps, tdKg, tdNotes);
              tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            exItem.appendChild(table);
          }

          exList.appendChild(exItem);
        }

        block.appendChild(exList);
      }

      previewBodyEl.appendChild(block);
    }
  }

  async function loadClientExportData() {
    if (!clientId) {
      setStatus('Lipsește ID-ul clientului.', 'error');
      renderPreview();
      return;
    }
    if (!supabase) {
      setStatus('Conexiunea la baza de date nu este disponibilă.', 'error');
      renderPreview();
      return;
    }

    try {
      setStatus('Se încarcă datele clientului...', 'info');

      const [cliRes, pkgRes, exRes, cpRes] = await Promise.all([
        supabase.from('clienti').select('id, nume').eq('id', clientId).single(),
        supabase.from('pachete').select('id, nume, numar_sedinte').order('nume', { ascending: true }),
        supabase.from('exercitii').select('id, nume').order('nume', { ascending: true }),
        supabase
          .from('client_pachete')
          .select('id, client_id, pachet_id, sedinte_efectuate, status')
          .eq('client_id', clientId)
          .order('id', { ascending: false }),
      ]);

      if (cliRes.error) throw cliRes.error;
      if (pkgRes.error) throw pkgRes.error;
      if (exRes.error) throw exRes.error;
      if (cpRes.error) throw cpRes.error;

      clientName = cliRes.data?.nume || 'Client';
      packagesMap = new Map((pkgRes.data || []).map((p) => [p.id, p]));
      exercisesMap = new Map((exRes.data || []).map((e) => [e.id, e]));
      clientPackages = cpRes.data || [];

      const cpIds = clientPackages.map((c) => c.id);
      sessionExercisesByCp = new Map();
      if (cpIds.length) {
        const { data: cseRows, error: cseErr } = await supabase
          .from('client_sedinta_exercitii')
          .select('client_pachet_id, numar_sedinta, exercitiu_id, pozitie, set_nr, repetari, greutate, nota')
          .in('client_pachet_id', cpIds)
          .order('pozitie', { ascending: true });

        if (cseErr) throw cseErr;
        for (const r of cseRows || []) {
          if (!sessionExercisesByCp.has(r.client_pachet_id)) {
            sessionExercisesByCp.set(r.client_pachet_id, []);
          }
          sessionExercisesByCp.get(r.client_pachet_id).push(r);
        }
      }

      if (pkgSelectEl) {
        pkgSelectEl.innerHTML = '';
        for (const cp of clientPackages) {
          const info = packagesMap.get(cp.pachet_id);
          const opt = document.createElement('option');
          opt.value = String(cp.id);
          const statusTag = cp.status === 'activ' ? ' (Activ)' : ' (Terminat)';
          opt.textContent = `${info?.nume || 'Pachet'}${statusTag}`;
          pkgSelectEl.appendChild(opt);
        }

        const activeCp = clientPackages.find((c) => c.status === 'activ') || clientPackages[0];
        if (activeCp) {
          pkgSelectEl.value = String(activeCp.id);
        }
      }

      const initialSessions = getSessionsForSelectedPackage();
      selectedSessionNums = new Set(initialSessions.map((s) => s.numar_sedinta));

      setStatus('', '');
      renderSessionsSelector();
      renderPreview();
    } catch (err) {
      setStatus(err?.message || 'Nu s-au putut încărca datele clientului.', 'error');
      renderPreview();
    }
  }

  tabDigitalBtn?.addEventListener('click', () => setActiveMode('digital'));
  tabPrintBtn?.addEventListener('click', () => setActiveMode('print'));

  pkgSelectEl?.addEventListener('change', () => {
    const sessions = getSessionsForSelectedPackage();
    selectedSessionNums = new Set(sessions.map((s) => s.numar_sedinta));
    renderSessionsSelector();
    renderPreview();
  });

  trainerNameInputEl?.addEventListener('input', () => {
    try {
      localStorage.setItem(STORAGE_TRAINER_NAME_KEY, trainerNameInputEl.value || '');
    } catch {
      // ignoră
    }
    renderPreview();
  });

  uploadLogoBtn?.addEventListener('click', () => {
    logoInputEl?.click();
  });

  logoInputEl?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      logoDataUrl = typeof reader.result === 'string' ? reader.result : '';
      try {
        localStorage.setItem(STORAGE_TRAINER_LOGO_KEY, logoDataUrl);
        localStorage.setItem(STORAGE_TRAINER_LOGO_NAME_KEY, file.name);
      } catch {
        setStatus('Sigla este prea mare pentru a fi salvată în localStorage, dar va fi inclusă în PDF.', 'info');
      }
      if (logoNameEl) logoNameEl.textContent = file.name;
      if (logoPreviewEl && logoDataUrl) {
        logoPreviewEl.src = logoDataUrl;
        logoPreviewEl.classList.remove('hidden');
      }
      clearLogoBtn?.classList.remove('hidden');
      renderPreview();
    };
    reader.readAsDataURL(file);
  });

  clearLogoBtn?.addEventListener('click', () => {
    logoDataUrl = '';
    try {
      localStorage.removeItem(STORAGE_TRAINER_LOGO_KEY);
      localStorage.removeItem(STORAGE_TRAINER_LOGO_NAME_KEY);
    } catch {
      // ignoră
    }
    if (logoInputEl) logoInputEl.value = '';
    if (logoNameEl) logoNameEl.textContent = 'Nicio siglă încărcată';
    if (logoPreviewEl) {
      logoPreviewEl.removeAttribute('src');
      logoPreviewEl.classList.add('hidden');
    }
    clearLogoBtn.classList.add('hidden');
    renderPreview();
  });

  selectAllBtn?.addEventListener('click', () => {
    const sessions = getSessionsForSelectedPackage();
    selectedSessionNums = new Set(sessions.map((s) => s.numar_sedinta));
    renderSessionsSelector();
    renderPreview();
  });

  clearAllBtn?.addEventListener('click', () => {
    selectedSessionNums.clear();
    renderSessionsSelector();
    renderPreview();
  });

  generatePdfBtn?.addEventListener('click', async () => {
    const cp = getSelectedClientPackage();
    if (!cp) {
      setStatus('Selectează un pachet înainte de a genera PDF-ul.', 'error');
      return;
    }

    const chosenSessions = getSessionsForSelectedPackage().filter((s) =>
      selectedSessionNums.has(s.numar_sedinta)
    );
    if (!chosenSessions.length) {
      setStatus('Selectează cel puțin o ședință pentru PDF.', 'error');
      return;
    }

    if (generatePdfBtn) generatePdfBtn.disabled = true;
    setStatus('Se generează PDF-ul...', 'info');

    try {
      const trainerName = (trainerNameInputEl?.value || '').trim();
      const cardBgHex = activeMode === 'digital' ? '#14244d' : '#f5f7fb';
      const logoJpeg = await imageToJpegBytes(logoDataUrl, cardBgHex);

      const pdfBlob = buildPdfBlob({
        mode: activeMode,
        clientName,
        trainerName,
        sessions: chosenSessions,
        logoJpeg,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `program-${activeMode}-client-${clientId || 'export'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus(`PDF-ul (${activeMode.toUpperCase()}) a fost generat.`, 'success');
    } catch (err) {
      setStatus(err?.message || 'Nu s-a putut genera PDF-ul.', 'error');
    } finally {
      if (generatePdfBtn) generatePdfBtn.disabled = false;
    }
  });

  await loadClientExportData();
}

if (!document.querySelector('[data-spa-managed]')) {
  mount({}).catch(() => {});
}