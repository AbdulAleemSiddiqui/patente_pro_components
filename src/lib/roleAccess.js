/**
 * Role-Based Access Control Configuration
 * Defines which pages each role can access
 */

// All available pages and their categories
export const NAV_ITEMS = [
  // Main section - core functionality
  { section: 'main',        page: 'dashboard',     icon: 'LayoutDashboard', label: 'Database' },
  { section: 'main',        page: 'students',      icon: 'TrendingUp',      label: 'Student Progress' },
  { section: 'main',        page: 'lessonsAdmin',  icon: 'CalendarCheck',   label: 'Lessons' },
  { section: 'main',        page: 'log',           icon: 'ClipboardList',   label: 'Log Lessons' },

  // Users section - directory management
  { section: 'users',       page: 'studentsAdmin', icon: 'Users',           label: 'Students' },
  { section: 'users',       page: 'teachers',      icon: 'UserPlus',        label: 'Teachers' },

  // Other section - tools
  { section: 'other',       page: 'examiners',     icon: 'UserCheck',       label: 'Examiner' },
  { section: 'other',       page: 'settings',      icon: 'Settings',        label: 'Settings' },

  // Profile section - all users see this
  { section: 'profile',     page: 'profile',       icon: 'User',            label: 'Profile' },
];

/**
 * Get allowed pages for each role
 */
export const ROLE_ACCESS = {
  admin: [
    'dashboard',
    'students',
    'lessonsAdmin',
    'log',
    'studentsAdmin',
    'teachers',
    'examiners',
    'settings',
    'profile',
  ],

  teacher: [
    'dashboard',
    'students',       // Same progress page as admin (with student data)
    'log',
    'examiners',      // Examiner directory — view and edit examiners + notes
    'profile',
  ],

  student: [
    'dashboard',
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
