/**
 * Role-Based Access Control Configuration
 * Defines which pages each role can access
 */

// All available pages and their categories
export const NAV_ITEMS = [
  // Main section - core functionality
  { section: 'main',  page: 'dashboard',        icon: 'LayoutDashboard', label: 'Dashboard' },
  { section: 'main',  page: 'schedule',         icon: 'CalendarDays',      label: 'Calendar' },
  { section: 'main',  page: 'log',              icon: 'ClipboardList',     label: 'Log lesson' },

  // Admin section - only admins see these
  { section: 'admin', page: 'users',            icon: 'UserPlus',           label: 'Users' },
  { section: 'admin', page: 'lessonsAdmin',     icon: 'CalendarCheck',      label: 'Lessons' },

  // Student section - both admins and teachers see this
  { section: 'student', page: 'students',        icon: 'TrendingUp',         label: 'Progress' },

  // Tools section - available to appropriate roles
  { section: 'tools', page: 'settings',         icon: 'Settings',           label: 'Settings', comingSoon: true },

  // Profile section - all users see this
  { section: 'profile', page: 'profile',        icon: 'User',               label: 'Profile' },
];

/**
 * Get allowed pages for each role
 */
export const ROLE_ACCESS = {
  admin: [
    'dashboard',
    'schedule',
    'log',
    'students',
    'users',
    'lessonsAdmin',
    'settings',
    'profile',
  ],

  teacher: [
    'dashboard',
    'schedule',
    'log',
    'students',       // Same students page as admin (with student data)
    'profile',
  ],

  student: [
    'dashboard',
    'schedule',
    'student_progress', // Student's own progress
    'profile',
  ],
};

/**
 * Check if a role can access a specific page
 */
export function canAccessPage(role, page) {
  if (!role || !ROLE_ACCESS[role]) return false;
  return ROLE_ACCESS[role].includes(page);
}

/**
 * Filter navigation items based on role
 */
export function getNavItemsForRole(role) {
  const allowedPages = ROLE_ACCESS[role] || [];

  return NAV_ITEMS.filter(item => {
    // Profile is always accessible if logged in
    if (item.page === 'profile') return true;

    // Check if role can access this page
    return allowedPages.includes(item.page);
  });
}
