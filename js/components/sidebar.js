export function renderSidebar(navItems) {
  const sections = {};
  navItems.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  let html = `<div id="sidebar">`;
  html += `
    <div id="sidebar-logo">
      <div class="logo-name"><i class="ti ti-steering-wheel" aria-hidden="true"></i> PatentePro</div>
      <div class="logo-sub">Gestione istruttori</div>
    </div>`;

  for (const [section, items] of Object.entries(sections)) {
    html += `<div class="nav-section">${section}</div>`;
    items.forEach(item => {
      html += `<div class="nav-item" data-page="${item.page}"><i class="ti ${item.icon}" aria-hidden="true"></i> ${item.label}</div>`;
    });
  }

  html += `<div class="nav-spacer"></div>`;
  html += `
    <div class="instructor-pill">
      <div class="avatar">MR</div>
      <div><div class="name">Marco Rossi</div><div class="role">Istruttore</div></div>
    </div>`;
  html += `</div>`;
  return html;
}
