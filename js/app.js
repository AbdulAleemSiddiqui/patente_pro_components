import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { showToast } from './components/toast.js';
import * as dashboard from './pages/dashboard.js';
import * as students from './pages/students.js';
import * as log from './pages/log.js';
import * as manoeuvres from './pages/manoeuvres.js';
import * as swap from './pages/swap.js';

const NAV_ITEMS = [
  { section: 'Principale', page: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { section: 'Principale', page: 'students', icon: 'ti-users', label: 'Studenti' },
  { section: 'Principale', page: 'log', icon: 'ti-clipboard-list', label: 'Registra lezione' },
  { section: 'Strumenti', page: 'manoeuvres', icon: 'ti-route', label: 'Manovre' },
  { section: 'Strumenti', page: 'swap', icon: 'ti-arrows-exchange', label: 'Scambio slot' },
];

const PAGES = { dashboard, students, log, manoeuvres, swap };

function init() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar(NAV_ITEMS)}
    <div id="main">
      ${renderHeader()}
      ${Object.values(PAGES).map(p => p.render()).join('')}
    </div>`;

  bindGlobalEvents();
  mountPage('dashboard');
}

function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  mountPage(page);
}

let currentPage = null;
function mountPage(page) {
  if (currentPage === page) return;
  currentPage = page;
  PAGES[page]?.mount(nav);
}

function bindGlobalEvents() {
  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => nav(item.dataset.page));
  });

  // Header buttons
  document.getElementById('btn-notifications')?.addEventListener('click', () => showToast('Notifiche: nessun aggiornamento'));
  document.getElementById('btn-new-lesson')?.addEventListener('click', () => nav('log'));
}

init();
