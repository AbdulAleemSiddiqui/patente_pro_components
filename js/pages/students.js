const STUDENTS = [
  { name: 'Giulia Ferretti', age: 23, lessons: 18, lastLesson: 'ieri', instructor: 'M. Rossi', progress: 82, progressClass: 'good', badgeClass: 'badge-green', badgeLabel: 'Pronto',
    manoeuvres: [['Partenza in salita', 4], ['Parcheggio parallelo', 3], ['Inversione a U', 5], ['Sorpasso', 4], ['Guida in autostrada', 3]],
    notes: [
      { dot: 'good', head: 'Ottima guida in città', meta: 'M. Rossi · 21 mag', tags: [['Specchietti ✓', 'badge-green'], ['Precedenze ✓', 'badge-green']] },
      { dot: 'warn', head: 'Migliorare parcheggio in parallelo', meta: 'F. Marino · 18 mag', tags: [['Sterzata ⚠', 'badge-warn']] },
    ] },
  { name: 'Luca Bianchi', age: 20, lessons: 9, lastLesson: '2gg fa', instructor: 'M. Rossi', progress: 44, progressClass: 'warn', badgeClass: 'badge-warn', badgeLabel: 'In corso',
    manoeuvres: [['Partenza in salita', 3], ['Parcheggio parallelo', 2], ['Inversione a U', 3], ['Sorpasso', 2], ['Guida in autostrada', 1]],
    notes: [
      { dot: 'warn', head: 'Difficoltà con le precedenze', meta: 'M. Rossi · 20 mag', tags: [['Precedenze ⚠', 'badge-warn']] },
      { dot: 'good', head: 'Buon controllo del veicolo', meta: 'M. Rossi · 17 mag', tags: [['Frizione ✓', 'badge-green'], ['Freni ✓', 'badge-green']] },
    ] },
  { name: 'Sara Conti', age: 19, lessons: 5, lastLesson: '5gg fa', instructor: 'F. Marino', progress: 22, progressClass: '', badgeClass: 'badge-blue', badgeLabel: 'Inizio',
    manoeuvres: [['Partenza in salita', 2], ['Parcheggio parallelo', 1], ['Inversione a U', 1], ['Sorpasso', 1], ['Guida in autostrada', 1]],
    notes: [
      { dot: 'good', head: 'Prima lezione positiva', meta: 'F. Marino · 15 mag', tags: [['Atteggiamento ✓', 'badge-green']] },
    ] },
  { name: 'Marco Verdi', age: 22, lessons: 14, lastLesson: 'oggi', instructor: 'M. Rossi', progress: 65, progressClass: '', badgeClass: 'badge-warn', badgeLabel: 'In corso',
    manoeuvres: [['Partenza in salita', 4], ['Parcheggio parallelo', 4], ['Inversione a U', 3], ['Sorpasso', 3], ['Guida in autostrada', 2]],
    notes: [
      { dot: 'good', head: 'Ottimo parcheggio parallelo', meta: 'M. Rossi · 22 mag', tags: [['Parcheggio ✓', 'badge-green']] },
      { dot: 'warn', head: 'Rallentare in autostrada', meta: 'M. Rossi · 19 mag', tags: [['Velocità ⚠', 'badge-warn']] },
    ] },
  { name: 'Anna Moretti', age: 25, lessons: 7, lastLesson: '3gg fa', instructor: 'L. Costa', progress: 35, progressClass: '', badgeClass: 'badge-blue', badgeLabel: 'Inizio',
    manoeuvres: [['Partenza in salita', 2], ['Parcheggio parallelo', 2], ['Inversione a U', 2], ['Sorpasso', 2], ['Guida in autostrada', 1]],
    notes: [
      { dot: 'good', head: 'Buona partenza in salita', meta: 'L. Costa · 19 mag', tags: [['Frizione ✓', 'badge-green']] },
    ] },
];

export function render() {
  return `
    <div id="page-students" class="page">
      <div style="padding:20px;">
        <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;">
          <div><div class="page-title">Studenti</div><div class="page-sub">Profilo completo e storico lezioni di ogni studente</div></div>
          <div class="pill-tabs">
            <button class="pill-tab active">Tutti (12)</button>
            <button class="pill-tab">Miei (8)</button>
            <button class="pill-tab">Pronto esame (3)</button>
          </div>
        </div>
        ${renderStudentList()}
        <div id="student-detail" style="display:none;"></div>
      </div>
    </div>`;
}

export function mount(nav) {
  document.querySelectorAll('#page-students .student-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.idx, 10);
      showDetail(idx);
    });
  });
  document.querySelectorAll('#page-students .btn-log').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); nav('log'); });
  });
}

function renderStudentRow(idx, s) {
  return `
    <div class="student-row" data-idx="${idx}">
      <div><div class="s-name">${s.name}</div><div class="s-sub">${s.age} anni · ${s.lessons} lezioni · Ultima: ${s.lastLesson}</div></div>
      <div style="font-size:12px;">${s.instructor}</div>
      <div style="display:flex;align-items:center;gap:7px;"><div class="progress-bar-wrap"><div class="progress-bar ${s.progressClass}" style="width:${s.progress}%"></div></div><span style="font-size:11px;color:var(--muted);">${s.progress}%</span></div>
      <span class="metric-badge ${s.badgeClass}">${s.badgeLabel}</span>
      <button class="btn btn-log" style="font-size:12px;padding:4px 8px;">+ Log</button>
    </div>`;
}

function renderStudentList() {
  return `
    <div class="card">
      <div class="col-header"><span>Studente</span><span>Istruttore</span><span>Progressi</span><span>Stato</span><span>Azioni</span></div>
      <div class="card-body">
        ${STUDENTS.map((s, i) => renderStudentRow(i, s)).join('')}
      </div>
    </div>`;
}

function renderStars(count) {
  let html = '<div class="stars">';
  for (let i = 0; i < 5; i++) {
    html += `<span class="star${i < count ? ' on' : ''}">★</span>`;
  }
  html += '</div>';
  return html;
}

function showDetail(idx) {
  const s = STUDENTS[idx];
  if (!s) return;
  const d = document.getElementById('student-detail');

  const manRows = s.manoeuvres.map(([label, stars]) => `
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
      <span>${label}</span>
      ${renderStars(stars)}
    </div>`).join('');

  const noteRows = s.notes.map((n, i) => {
    const line = i < s.notes.length - 1 ? '<div class="tl-line"></div>' : '';
    const tagHtml = n.tags.map(([label, cls]) => `<span class="tag ${cls}">${label}</span>`).join('');
    return `
      <div class="tl-item">
        <div style="position:relative;"><div class="tl-dot ${n.dot}"></div>${line}</div>
        <div class="tl-content">
          <div class="tl-head">${n.head}</div>
          <div class="tl-meta">${n.meta}</div>
          <div class="tl-tags">${tagHtml}</div>
        </div>
      </div>`;
  }).join('');

  d.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${s.name} · Profilo dettagliato</span>
        <button class="btn btn-close-detail"><i class="ti ti-x" aria-hidden="true"></i></button>
      </div>
      <div class="grid2" style="padding:14px 16px;gap:14px;">
        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Valutazione manovre</div>
          <div style="display:flex;flex-direction:column;gap:7px;">${manRows}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Ultime note istruttori</div>
          <div class="timeline">${noteRows}</div>
        </div>
      </div>
    </div>`;

  d.style.display = 'block';
  d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  d.querySelector('.btn-close-detail')?.addEventListener('click', () => {
    d.style.display = 'none';
  });
}
