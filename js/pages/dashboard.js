export function render() {
  return `
    <div id="page-dashboard" class="page active">
      <div style="padding:20px;">
        <div class="page-header">
          <div class="page-title">Panoramica</div>
          <div class="page-sub">Mercoledì 22 maggio 2026 · Istruttore: Marco Rossi</div>
        </div>
        ${renderMetrics()}
        <div class="grid2">
          ${renderRecentStudents()}
          ${renderCriticalAreas()}
        </div>
        ${renderUpcomingLessons()}
      </div>
    </div>`;
}

export function mount(nav) {
  document.querySelectorAll('#page-dashboard .student-row').forEach(row => {
    row.addEventListener('click', () => nav('students'));
  });
  document.querySelectorAll('#page-dashboard .btn-log').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); nav('log'); });
  });
  document.querySelector('#page-dashboard .btn-all-students')?.addEventListener('click', () => nav('students'));
}

function renderMetrics() {
  return `
    <div class="cards-row">
      <div class="metric-card"><div class="metric-label">Studenti attivi</div><div class="metric-value">12</div><span class="metric-badge badge-green">+2 questo mese</span></div>
      <div class="metric-card"><div class="metric-label">Lezioni oggi</div><div class="metric-value">4</div><span class="metric-badge badge-blue">2 completate</span></div>
      <div class="metric-card"><div class="metric-label">Pronto per esame</div><div class="metric-value">3</div><span class="metric-badge badge-green">↑ da 1</span></div>
      <div class="metric-card"><div class="metric-label">Swap richiesti</div><div class="metric-value">1</div><span class="metric-badge badge-warn">In attesa</span></div>
    </div>`;
}

function renderStudentRow(name, age, lessons, instructor, progress, progressClass, badgeClass, badgeLabel) {
  return `
    <div class="student-row">
      <div><div class="s-name">${name}</div><div class="s-sub">${age} anni · ${lessons} lezioni</div></div>
      <div style="font-size:12px;color:var(--muted);">${instructor}</div>
      <div style="display:flex;align-items:center;gap:7px;"><div class="progress-bar-wrap"><div class="progress-bar ${progressClass}" style="width:${progress}%"></div></div><span style="font-size:11px;color:var(--muted);">${progress}%</span></div>
      <span class="metric-badge ${badgeClass}" style="font-size:11px;">${badgeLabel}</span>
      <button class="btn btn-log" style="font-size:12px;padding:4px 8px;">Log</button>
    </div>`;
}

function renderRecentStudents() {
  return `
    <div>
      <div class="card">
        <div class="card-header"><span class="card-title">Studenti recenti</span><button class="btn btn-all-students" style="font-size:12px;padding:5px 10px;">Tutti <i class="ti ti-arrow-right" aria-hidden="true"></i></button></div>
        <div class="col-header"><span>Nome</span><span>Istruttore</span><span>Prog.</span><span>Stato</span><span></span></div>
        <div class="card-body">
          ${renderStudentRow('Giulia Ferretti', 23, 18, 'M. Rossi', 82, 'good', 'badge-green', 'Pronto')}
          ${renderStudentRow('Luca Bianchi', 20, 9, 'M. Rossi', 44, 'warn', 'badge-warn', 'In corso')}
          ${renderStudentRow('Sara Conti', 19, 5, 'F. Marino', 22, '', 'badge-blue', 'Inizio')}
        </div>
      </div>
    </div>`;
}

function renderCriticalArea(label, percent, color) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;">
      <span style="color:var(--text);">${label}</span>
      <div style="display:flex;align-items:center;gap:8px;width:140px;">
        <div class="progress-bar-wrap" style="flex:1;"><div class="progress-bar" style="width:${percent}%;background:${color};"></div></div>
        <span style="font-size:11px;color:var(--muted);min-width:28px;">${percent}%</span>
      </div>
    </div>`;
}

function renderCriticalAreas() {
  return `
    <div>
      <div class="card">
        <div class="card-header"><span class="card-title">Aree critiche (tutti gli studenti)</span></div>
        <div style="padding:14px 16px;display:flex;flex-direction:column;gap:9px;">
          ${renderCriticalArea('Parcheggio in parallelo', 72, 'var(--accent)')}
          ${renderCriticalArea('Inversione a U', 61, 'var(--warn)')}
          ${renderCriticalArea('Precedenza agli incroci', 48, 'var(--warn)')}
          ${renderCriticalArea('Controllo specchietti', 38, 'var(--brand-mid)')}
          ${renderCriticalArea('Sorpasso sicuro', 25, 'var(--success)')}
        </div>
      </div>
    </div>`;
}

function renderLessonSlot(time, student, status, statusColor, highlight) {
  const bg = highlight ? 'background:var(--brand-light);' : '';
  const timeColor = highlight ? 'color:var(--brand-mid);' : '';
  const nameColor = highlight ? 'color:var(--brand);' : '';
  return `
    <div style="padding:12px 14px;${bg}">
      <div style="font-size:11px;color:var(--brand-mid);margin-bottom:6px;${timeColor}">${time}</div>
      <div style="font-size:13px;font-weight:500;color:var(--text);${nameColor}">${student}</div>
      <div style="font-size:11px;color:${statusColor};margin-top:3px;">${status}</div>
    </div>`;
}

function renderUpcomingLessons() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Prossime lezioni oggi</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;">
        ${renderLessonSlot('09:00', 'Giulia Ferretti', '✓ Completata', 'var(--success)', false)}
        ${renderLessonSlot('11:00', 'Luca Bianchi', '✓ Completata', 'var(--success)', false)}
        ${renderLessonSlot('14:00 · Adesso', 'Marco Verdi', '⏳ Tra 2 ore', 'var(--warn)', true)}
        ${renderLessonSlot('16:30', 'Anna Moretti', 'Programmata', 'var(--muted)', false)}
      </div>
    </div>`;
}
