export function renderHeader() {
  return `
    <div class="header-bar">
      <div class="search-wrap">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input type="text" placeholder="Cerca studente...">
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn" id="btn-notifications"><i class="ti ti-bell" aria-hidden="true"></i></button>
        <button class="btn btn-primary" id="btn-new-lesson"><i class="ti ti-plus" aria-hidden="true"></i> Nuova lezione</button>
      </div>
    </div>`;
}
