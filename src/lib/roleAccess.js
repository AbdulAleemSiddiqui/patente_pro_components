/**
 * Role-Based Access Control Configuration
 * Defines which pages each role can access
 */

// All available pages and their categories
export const NAV_ITEMS = [
  // Main section - core functionality
  { section: 'main',  page: 'dashboard',        icon: 'LayoutDashboard', label: 'Dashboard' },
  { section: 'main',  page: 'schedule',         icon: 'CalendarDays',      label: 'Schedule' },

  // Admin section - only admins see these
  { section: 'admin', page: 'students',         icon: 'Users',              label: 'Students' },
  { section: 'admin', page: 'users',            icon: 'UserPlus',           label: 'Users' },
  { section: 'admin', page: 'log',              icon: 'ClipboardList',      label: 'Lesson Log' },
  { section: 'admin', page: 'settings',         icon: 'Settings',           label: 'Settings' },

  // Tools section - available to all roles
  { section: 'tools', page: 'manoeuvres',       icon: 'Route',              label: 'Maneuvers' },
  { section: 'tools', page: 'swap',             icon: 'Shuffle',            label: 'Swap' },

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
    'students',
    'users',
    'log',
    'settings',
    'manoeuvres',
    'swap',
    'profile',
  ],

  teacher: [
    'dashboard',
    'schedule',       // Their lesson schedule
    'students',       // List of students (read-only)
    'manoeuvres',     // View maneuvers
    'swap',           // Request swaps
    'profile',
  ],

  student: [
    'dashboard',
    'schedule',       // Their lesson schedule
    'manoeuvres',     // View their progress
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
