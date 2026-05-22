import { showToast } from '../components/toast.js';

export function render() {
  return `
    <div id="page-log" class="page">
      <div style="padding:20px;">
        <div class="page-header"><div class="page-title">Registra lezione</div><div class="page-sub">Compila il report dopo ogni sessione di guida</div></div>
        <div class="grid2">
          ${renderLessonForm()}
          <div>
            ${renderManoeuvreCard()}
            ${renderErrorsCard()}
          </div>
        </div>
      </div>
    </div>`;
}

export function mount() {
  document.querySelectorAll('#page-log .tag-route').forEach(tag => {
    tag.addEventListener('click', () => tag.classList.toggle('sel'));
  });
  document.querySelectorAll('#page-log .tag-error').forEach(tag => {
    tag.addEventListener('click', () => tag.classList.toggle('err'));
  });
  document.querySelectorAll('#page-log .man-item').forEach(item => {
    item.addEventListener('click', () => {
      item.style.borderColor = item.style.borderColor === 'var(--brand-mid)' ? '' : 'var(--brand-mid)';
    });
  });
  document.querySelectorAll('#session-stars .star').forEach((star, i, stars) => {
    star.addEventListener('click', () => {
      stars.forEach((s, j) => s.classList.toggle('on', j <= i));
    });
  });
  document.querySelector('#page-log .btn-save')?.addEventListener('click', () => {
    showToast('Lezione salvata con successo ✓');
  });
}

function renderLessonForm() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Dettagli lezione</span></div>
      <div class="log-form">
        <div><label>Studente</label><select><option>Giulia Ferretti</option><option>Luca Bianchi</option><option>Marco Verdi</option><option>Sara Conti</option></select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label>Data</label><input type="date" value="2026-05-22"></div>
          <div><label>Durata (min)</label><input type="number" value="50" min="30" max="120"></div>
        </div>
        <div><label>Tipo di percorso</label>
          <div class="tag-row" style="margin-top:6px;">
            <span class="tag tag-route sel">Città</span>
            <span class="tag tag-route">Extraurbano</span>
            <span class="tag tag-route">Autostrada</span>
            <span class="tag tag-route">Parcheggio</span>
            <span class="tag tag-route">Notturno</span>
          </div>
        </div>
        <div><label>Valutazione generale</label>
          <div class="stars" id="session-stars" style="margin-top:4px;">
            <span class="star on">★</span>
            <span class="star on">★</span>
            <span class="star on">★</span>
            <span class="star">★</span>
            <span class="star">★</span>
          </div>
        </div>
        <div><label>Note istruttore</label><textarea placeholder="Es: buona guida in città, da migliorare l'uso degli specchietti alle rotonde..."></textarea></div>
        <button class="btn btn-primary btn-save"><i class="ti ti-device-floppy" aria-hidden="true"></i> Salva lezione</button>
      </div>
    </div>`;
}

function renderManoeuvreStars(count) {
  let html = '<div class="stars">';
  for (let i = 0; i < 5; i++) {
    html += `<span class="star${i < count ? ' on' : ''}">★</span>`;
  }
  html += '</div>';
  return html;
}

function renderManoeuvreCard() {
  return `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header"><span class="card-title">Manovre eseguite</span></div>
      <div class="manoeuvre-grid">
        <div class="man-item">
          <div><div class="m-name">Partenza in salita</div><div class="m-cat">Controllo veicolo</div></div>
          ${renderManoeuvreStars(3)}
        </div>
        <div class="man-item">
          <div><div class="m-name">Parcheggio parallelo</div><div class="m-cat">Parcheggio</div></div>
          ${renderManoeuvreStars(2)}
        </div>
        <div class="man-item">
          <div><div class="m-name">Inversione a U</div><div class="m-cat">Manovre</div></div>
          ${renderManoeuvreStars(4)}
        </div>
        <div class="man-item">
          <div><div class="m-name">Sorpasso sicuro</div><div class="m-cat">Strada</div></div>
          ${renderManoeuvreStars(5)}
        </div>
      </div>
    </div>`;
}

function renderErrorsCard() {
  const errors = ['Cintura', 'Specchietti', 'Precedenza', 'Segnaletica', 'Distanze', 'Velocità', 'Clacson', 'Frecce', 'Freni', 'Sorpasso'];
  const active = new Set(['Specchietti', 'Distanze']);
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Errori commessi</span></div>
      <div style="padding:12px 16px;">
        <div class="tag-row">
          ${errors.map(e => `<span class="tag tag-error${active.has(e) ? ' err' : ''}">${e}</span>`).join('')}
        </div>
      </div>
    </div>`;
}
