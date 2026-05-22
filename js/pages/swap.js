import { showToast } from '../components/toast.js';

export function render() {
  return `
    <div id="page-swap" class="page">
      <div style="padding:20px;">
        <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;">
          <div><div class="page-title">Scambio slot istruttori</div><div class="page-sub">Richiedi o accetta scambi di lezione tra colleghi</div></div>
          <button class="btn btn-primary btn-new-swap"><i class="ti ti-plus" aria-hidden="true"></i> Nuova richiesta</button>
        </div>
        <div class="grid2">
          ${renderIncomingRequests()}
          ${renderInstructorAvailability()}
        </div>
        ${renderSwapHistory()}
      </div>
    </div>`;
}

export function mount() {
  document.querySelector('#page-swap .btn-accept')?.addEventListener('click', () => showToast('Swap accettato ✓'));
  document.querySelector('#page-swap .btn-reject')?.addEventListener('click', () => showToast('Swap rifiutato'));
  document.querySelector('#page-swap .btn-new-swap')?.addEventListener('click', () => showToast('Richiesta di swap inviata ✓'));
  document.querySelectorAll('#page-swap .btn-contact').forEach(btn => {
    btn.addEventListener('click', () => showToast('Richiesta inviata'));
  });
}

function renderIncomingRequests() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Richieste in arrivo</span><span class="metric-badge badge-warn">1 nuova</span></div>
      <div class="card-body">
        <div class="swap-row">
          <div class="avail-dot dot-warn"></div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:500;color:var(--text);">Federica Marino → Marco Rossi</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">Venerdì 24 mag · 10:00 · Studente: Sara Conti</div>
            <div style="font-size:11px;color:var(--warn);margin-top:2px;">Motivo: visita medica</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-accept" style="font-size:12px;padding:5px 10px;color:var(--success);border-color:var(--success);">Accetta</button>
            <button class="btn btn-reject" style="font-size:12px;padding:5px 10px;">Rifiuta</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderInstructorRow(name, availability, dotClass) {
  return `
    <div class="swap-row">
      <div class="avail-dot ${dotClass}"></div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:500;">${name}</div><div style="font-size:11px;color:var(--muted);">${availability}</div></div>
      <button class="btn btn-contact" style="font-size:12px;padding:5px 10px;">Contatta</button>
    </div>`;
}

function renderInstructorAvailability() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Disponibilità istruttori</span></div>
      <div class="card-body">
        ${renderInstructorRow('Federica Marino', 'Libera: lun-mer mattina', 'dot-green')}
        ${renderInstructorRow('Luigi Costa', 'Libero: giovedì pomeriggio', 'dot-green')}
        ${renderInstructorRow('Giorgio Esposito', 'Parzialmente disponibile', 'dot-warn')}
      </div>
    </div>`;
}

function renderSwapHistory() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Storico swap</span></div>
      <div class="card-body">
        <div class="swap-row"><div class="avail-dot dot-green"></div><div style="flex:1;font-size:13px;"><strong>16 mag</strong> · Marco Rossi ↔ Luigi Costa · Studente: Anna Moretti · <span style="color:var(--success);">Completato</span></div></div>
        <div class="swap-row"><div class="avail-dot dot-green"></div><div style="flex:1;font-size:13px;"><strong>10 mag</strong> · Federica Marino ↔ Marco Rossi · Studente: Luca Bianchi · <span style="color:var(--success);">Completato</span></div></div>
      </div>
    </div>`;
}
