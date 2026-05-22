export function render() {
  return `
    <div id="page-manoeuvres" class="page">
      <div style="padding:20px;">
        <div class="page-header"><div class="page-title">Manovre & criteri esame</div><div class="page-sub">Checklist ufficiale Motorizzazione Civile – Patente B</div></div>
        <div class="grid2">
          ${renderChecklistCard('ti-car', 'Controllo del veicolo', [
            ['Regolazione sedile e specchietti', 'badge-green', 'Base'],
            ['Uso corretto frizione e freno', 'badge-green', 'Base'],
            ['Partenza in salita (freno di stazionamento)', 'badge-warn', 'Medio'],
            ['Cambio marce fluido', 'badge-green', 'Base'],
          ])}
          ${renderChecklistCard('ti-parking', 'Parcheggio', [
            ['Parcheggio parallelo (strada)', 'badge-red', 'Difficile'],
            ['Parcheggio a spina (angolo 45°)', 'badge-warn', 'Medio'],
            ['Parcheggio perpendicolare', 'badge-warn', 'Medio'],
            ['Uscita da parcheggio stretto', 'badge-red', 'Difficile'],
          ])}
          ${renderChecklistCard('ti-arrows-left-right', 'Manovre stradali', [
            ['Inversione a U (strada a doppio senso)', 'badge-red', 'Difficile'],
            ['Svolta a destra / sinistra in incrocio', 'badge-warn', 'Medio'],
            ['Sorpasso di veicolo lento', 'badge-red', 'Difficile'],
            ['Attraversamento di rotatoria', 'badge-warn', 'Medio'],
          ])}
          ${renderChecklistCard('ti-eye', 'Comportamenti valutati', [
            ['Uso sistematico degli specchietti', 'badge-red', 'Critico'],
            ['Segnalazione con le frecce', 'badge-red', 'Critico'],
            ['Rispetto della precedenza', 'badge-red', 'Critico'],
            ['Mantenimento corsia', 'badge-warn', 'Medio'],
          ])}
        </div>
      </div>
    </div>`;
}

export function mount() {}

function renderChecklistCard(icon, title, items) {
  const rows = items.map((item, i) => {
    const border = i < items.length - 1 ? 'border-bottom:0.5px solid var(--border);' : '';
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;${border}">
        <span>${item[0]}</span>
        <span class="metric-badge ${item[1]}">${item[2]}</span>
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="ti ${icon}" aria-hidden="true"></i> ${title}</span></div>
      <div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;font-size:13px;">
        ${rows}
      </div>
    </div>`;
}
