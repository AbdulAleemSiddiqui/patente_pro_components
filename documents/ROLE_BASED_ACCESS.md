# Role-Based Access Control (RBAC)

## Overview

This document defines what each user role can see and access in the PatentePro application.

---

## User Roles

### 1. **Admin**
Full access to all features and settings.

**Pages Accessible:**
- ✅ Dashboard - Overview of all metrics
- ✅ Schedule - View/edit all lessons
- ✅ Availability - Manage instructor availability
- ✅ Students - View and manage all students
- ✅ Users - Create/edit teachers, students, and admins
- ✅ Lesson Log - Log lessons for any instructor
- ✅ Settings - School settings, routes, maneuvers, error tags
- ✅ Maneuvers - View and manage maneuver catalog
- ✅ Swap - View and manage all swap requests
- ✅ Profile - View/edit own profile

**Actions:**
- Create/delete/edit users
- Manage school settings
- View all lessons and schedules
- Full CRUD on all data

---

### 2. **Teacher**
Limited to their own students, schedule, and availability.

**Pages Accessible:**
- ✅ Dashboard - Overview of their students and lessons
- ✅ Schedule - View their lesson schedule
- ✅ Availability - Set their weekly availability
- ✅ Students - View list of their students (read-only)
- ✅ Maneuvers - View maneuver catalog (read-only)
- ✅ Swap - Request swaps with other teachers
- ✅ Profile - View/edit own profile

**Pages NOT Accessible:**
- ❌ Users - Cannot manage users
- ❌ Settings - Cannot change school settings
- ❌ Lesson Log - Can only log via schedule

**Actions:**
- View their own students
- Set their availability
- Log lessons for their students
- Request lesson swaps
- Edit their own profile and password

---

### 3. **Student**
Limited to viewing their own progress and schedule.

**Pages Accessible:**
- ✅ Dashboard - Overview of their progress
- ✅ Schedule - View their lesson schedule
- ✅ Maneuvers - View their maneuver progress (read-only)
- ✅ Profile - View/edit own profile

**Pages NOT Accessible:**
- ❌ Students - Cannot view other students
- ❌ Users - Cannot manage users
- ❌ Settings - Cannot access school settings
- ❌ Lesson Log - Cannot log lessons
- ❌ Availability - Cannot set availability
- ❌ Swap - Cannot request swaps

**Actions:**
- View their own schedule
- View their maneuver ratings
- Edit their own profile and password

---

## Navigation Structure

### Main Section
- **Dashboard** - Available to all roles
- **Schedule** - Available to all roles (filtered by user)
- **Availability** - Admin and teachers only

### Admin Section
- **Students** - Admin and teachers (read-only for teachers)
- **Users** - Admin only
- **Lesson Log** - Admin and teachers
- **Settings** - Admin only

### Tools Section
- **Maneuvers** - Available to all roles (read-only for teachers/students)
- **Swap** - Admin and teachers only

### Profile Section
- **Profile** - Available to all logged-in users

---

## Implementation

### Navigation Filtering
The navigation is filtered using `getNavItemsForRole(role)` in [src/lib/roleAccess.js](../src/lib/roleAccess.js)

### Route Protection
Routes are protected in [src/router/AppRouter.jsx](../src/router/AppRouter.jsx) using the `RequireAuth` component.

### Page-Level Protection
Each page should check user roles before showing sensitive actions (create, edit, delete).

---

## Quick Reference Table

| Feature | Admin | Teacher | Student |
|---------|-------|---------|---------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Schedule | ✅ | ✅ | ✅ (own) |
| Set Availability | ✅ | ✅ (own) | ❌ |
| View Students | ✅ (all) | ✅ (assigned) | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Log Lessons | ✅ | ✅ (own) | ❌ |
| School Settings | ✅ | ❌ | ❌ |
| View Maneuvers | ✅ | ✅ (view) | ✅ (view) |
| Request Swaps | ✅ | ✅ | ❌ |
| Edit Profile | ✅ | ✅ | ✅ |

---

## Technical Files

- **Role Configuration:** [src/lib/roleAccess.js](../src/lib/roleAccess.js)
- **Navigation:** [src/components/Layout.jsx](../src/components/Layout.jsx)
- **Router:** [src/router/AppRouter.jsx](../src/router/AppRouter.jsx)
- **Profile Page:** [src/pages/ProfilePage.jsx](../src/pages/ProfilePage.jsx)

---

## Future Enhancements

- Add row-level security (RLS) for API calls
- Add audit logging for admin actions
- Add time-based access restrictions
- Add multi-tenant support for schools
