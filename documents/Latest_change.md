# June 2026 Architecture Refactor (Latest Status)

## Completed Since Original Project Plan

A full structural audit was performed before beginning Supabase integration.

### Audit Findings

#### App.jsx was a monolith

The original application consisted of a single 1000+ line `App.jsx` file containing:

* Hardcoded mock datasets (`STUDENTS`, `TEACHERS`, `LESSONS`)
* No route separation
* No authentication guard
* No page-level structure
* No connection to Supabase despite helper files existing

The UI worked visually but was not production-ready.

#### Routing Missing

`react-router-dom` was installed but not implemented.

Every URL loaded the same dashboard view.

#### Auth Missing

No authentication flow existed.

The application had no protected routes and no role-based redirects.

#### Supabase Not Connected

The application displayed a configuration badge but did not read any real data from Supabase.

---

## Refactor Completed

### Step 1 — Vite Preparation

`vite.config.js` replaced in preparation for PWA support.

Current status:

* Vite working
* PWA plugin preparation completed
* Full PWA configuration still pending

### Step 2 — Zustand Authentication Store

Created:

src/store/useAuthStore.js

Responsibilities:

* User state
* Role state
* Initialization flow
* Demo fallback mode when Supabase is not configured

Current behavior:

* If Supabase credentials do not exist:

  * User automatically becomes Admin
  * Login screen is skipped
  * Application loads in demo mode

### Step 3 — Router Layer

Created:

src/router/AppRouter.jsx

Responsibilities:

* Route definitions
* Protected route handling
* Login route
* Admin route entry point
* Future teacher/student route expansion

### Step 4 — main.jsx Refactor

main.jsx now:

* Boots Zustand auth store
* Loads AppRouter
* Prepares application for React Router
* Removes direct monolithic rendering

### Step 5 — App.jsx Decomposition

The monolithic App.jsx was split into reusable pages and components.

New structure:

src/
├── components/
│   ├── Layout.jsx
│   └── ui.jsx
│
├── pages/
│   ├── DashboardPage.jsx
│   ├── StudentsPage.jsx
│   ├── LessonLogPage.jsx
│   ├── SettingsPage.jsx
│   ├── UsersPage.jsx
│   ├── SchedulePage.jsx
│   ├── ManoeuvresPage.jsx
│   └── SwapPage.jsx
│
├── router/
│   └── AppRouter.jsx
│
├── store/
│   └── useAuthStore.js
│
└── App.jsx

App.jsx is now intentionally thin and acts as a route shell rather than a feature container.

---

## Current Runtime Status

The application:

✅ Builds successfully

✅ Routing works

✅ Zustand auth store works

✅ Demo admin mode works

✅ Existing UI preserved

✅ Ready for Supabase integration

The application is now structurally prepared for:

* Real authentication
* Real database calls
* Multi-role access control
* PWA support

---

## Next Phase

### Phase 2 — Supabase Integration

Upcoming work:

1. Create Supabase project
2. Configure .env.local
3. Add project URL and anon key
4. Execute migration SQL
5. Verify authentication
6. Replace remaining mock data with Supabase queries
7. Connect dashboard metrics
8. Connect scheduling
9. Connect lesson feedback
10. Connect swap requests

## Supabase Progress

* ✅ Supabase configuration is now setup successfully.
* ✅ Demo Supabase user was added.
* ✅ Login flow has been verified successfully.
* ✅ Admin user creation system implemented (June 9, 2026)
* ✅ User management UI with modal forms added
* ✅ Auth store enhanced with automatic tenant_id fetching
* ✅ Mock data moved to seeded database tables

### Admin User Creation System (June 9, 2026)

**Problem Solved:**
- Needed a way for admins to create teachers/students
- Required coordination between `auth.users` (Supabase Auth) and `public.users` (application data)
- Users logged in without `tenant_id` in metadata caused creation failures

**Solution Implemented:**

1. **New Files Created:**
   - `src/lib/adminApi.js` - Admin API functions using service role key
   - `supabase/migrations/202606090004_ensure_admin_user.sql` - Admin user sync

2. **Updated Files:**
   - `src/pages/UsersPage.jsx` - Added user creation modal and form
   - `src/lib/auth.js` - Added `updateUserMetadata()` function
   - `src/store/useAuthStore.js` - Auto-fetches tenant_id from DB if missing
   - `.env.local` - Added `VITE_SUPABASE_SERVICE_ROLE_KEY`

3. **Data Flow:**
   ```
   Admin fills form → Supabase Admin API creates auth.users
                    → Code inserts into public.users with same ID
                    → Stores tenant_id in auth metadata
   ```

4. **Functions Available:**
   - `createUser()` - Creates auth + public.users entries
   - `sendPasswordResetEmail()` - Send password reset links
   - `deleteUser()` - Remove users from both tables
   - Auto tenant_id fetching on login/init

5. **How to Use:**
   1. Run migration `202606090004_ensure_admin_user.sql` in Supabase SQL Editor
   2. Add service role key to `.env.local`
   3. Restart dev server
   4. Login as admin
   5. Navigate to Users page
   6. Click "Invite Teacher" or "Invite Student"
   7. Fill form and submit

6. **User Creation Flow:**
   ```
   ┌──────────────────┐
   │  Admin Form      │
   │  (React App)     │
   └────────┬─────────┘
            │ createUser() called
            ▼
   ┌──────────────────────────────────┐
   │  Supabase Admin API              │
   │  (service_role_key required)     │
   └────────┬─────────────────────────┘
            │ Creates auth user
            ▼
   ┌──────────────────────────────────┐
   │  auth.users (Supabase managed)   │
   │  - id: uuid                      │
   │  - email: john@school.com        │
   │  - encrypted_password: ...       │
   └────────┬─────────────────────────┘
            │ Returns user ID
            ▼
   ┌──────────────────────────────────┐
   │  public.users (Your table)       │
   │  - id: (FK to auth.users)       │
   │  - tenant_id: ...                │
   │  - role: teacher/student        │
   │  - full_name, email, phone       │
   └──────────────────────────────────┘
   ```

---

## 🆕 Latest Features (June 12-13, 2026)

### Teacher Availability & Calendar Integration

**Problem Solved:**
- Teachers need a way to set their availability for lesson scheduling
- Admins needed to check if teachers are available before scheduling lessons
- Needed a unified calendar interface instead of separate pages

**Solution Implemented:**

1. **Database Schema Updated** (`supabase/migrations/202606060001_initial_schema.sql`):
   - Changed `teacher_availability` from weekly recurring (`day_of_week`, `start_time`, `end_time`) to date-specific blocks (`start_at`, `end_at`)
   - Added `tenant_id` column for proper multi-tenancy
   - Updated indexes for performance

2. **New API Functions** (`src/lib/api.js`):
   - `listTeacherAvailability({ tenantId, teacherId, from, to })` - Fetch availability for date range
   - `createTeacherAvailability({ tenantId, teacherId, startAt, endAt })` - Create availability block
   - `deleteTeacherAvailability({ id })` - Delete availability block
   - `updateLesson({ id, ... })` - Update existing lessons
   - `deleteLesson({ id })` - Delete lessons

3. **Combined Calendar** (`src/pages/SchedulePage.jsx`):
   - **Type-Choice Popup**: Admins selecting time slots see "Schedule Lesson" or "Add Teacher Availability" options
   - **Availability Rendering**: Light, semi-transparent colors with left border (available lessons remain solid)
   - **Month View**: Shows both lesson count and distinct teacher availability count per day
   - **Smart Teacher Filtering**: Teacher dropdown only shows teachers who:
     - Have availability covering the selected time slot
     - Have no conflicting lessons during that time
   - **Lesson Editing**: Admins can edit lesson start time and duration (end time auto-calculated)
   - **Conflict Checking**: Cannot delete availability if lessons are scheduled during that time
   - **Delete Functionality**: Delete buttons added to both Lesson and Availability modals

4. **Teacher Feedback Flow**:
   - Teachers clicking on lessons in Day View see "Give Lesson Feedback" modal
   - On confirmation, redirects to Log lesson page with pre-filled, read-only lesson details
   - Supports easy lesson feedback submission for completed lessons

5. **Navigation Updated** (`src/lib/roleAccess.js`):
   - Removed "Availability" menu item (now integrated into Schedule page)
   - Removed availability page references from routing

---

## Usage

### For Admins - Schedule Page

1. **View Schedule**: 
   - Month/Week/Day/Agenda views
   - Color-coded by student
   - Teacher availability shown in lighter colors

2. **Schedule New Lesson**:
   - Drag to select time slot (Week/Day view)
   - Choose "Schedule Lesson" from popup
   - Select student and teacher (only available teachers shown)
   - Duration determined by slot selection

3. **Add Teacher Availability**:
   - Drag to select time slot (Week/Day view)
   - Choose "Add Teacher Availability" from popup
   - Select teacher
   - Duration determined by slot selection

4. **Edit Lesson**:
   - Click on existing lesson
   - Change start time (datetime-local input)
   - Change duration (dropdown)
   - End time auto-calculated and displayed
   - Delete option available

5. **Delete/Cancel Availability**:
   - Click on availability block
   - Delete button in modal
   - System checks for conflicting lessons first
   - Shows warning if lessons exist during that time

### For Teachers - Schedule Page

1. **View Schedule**:
   - See your upcoming lessons
   - See your availability blocks
   - Month/Week/Day views available

2. **Schedule Lessons**:
   - Drag to select time slot (Week/Day view)
   - Opens lesson modal directly (no type-choice)
   - Select student from dropdown
   - Duration determined by slot selection

3. **Give Feedback**:
   - Click on lesson in Day view
   - Confirm "Give Lesson Feedback"
   - Redirected to Log lesson page with pre-filled details

---

## Technical Details

### Availability Data Model

```sql
CREATE TABLE teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  check (start_at < end_at)
);
```

### Conflict Detection Logic

When deleting availability:
- System checks for lessons scheduled during the availability period
- Excludes cancelled lessons
- Shows warning with student names and lesson details
- Blocks deletion until lessons are rescheduled/cancelled

### Teacher Availability Checking

For scheduling and editing:
- Checks if teacher has availability block covering entire lesson duration
- Checks for conflicting lessons (excluding current lesson when editing)
- Returns only teachers who pass both checks
- Shows helpful count messages ("X of Y teachers available")

---

## 🆕 Latest Feature (September 9, 2026)

### Editable Maneuver Catalog (Admin)

**Problem Solved:**
- Maneuver names in the catalog were only set by seed migrations — admins could not correct or localize them from the app

**Solution Implemented:**

1. **Rename API** (`src/lib/api.js`):
   - `updateManeuver({ id, name })` — updates `maneuvers.name` for the given row

2. **Editable catalog UI** (`src/pages/SettingsPage.jsx`):
   - Maneuver catalog grouped by parent type (FASE 1 / FASE 2 / PERCORSO URBANO), matching the Log lesson page grouping
   - Each maneuver chip has a pencil button; clicking switches to an inline input (Enter saves, Esc cancels, ✓/✕ buttons available)
   - Empty names and duplicate names (against the `unique (tenant_id, name)` constraint) are rejected with an error toast
   - On success the catalog reloads and a confirmation toast is shown

3. **RLS Migration** (`supabase/migrations/202609090001_disable_rls_maneuvers.sql`):
   - Disables RLS on `maneuvers` (the jwt-claim policies could never pass without custom JWT claims — same fix already applied to the feedback tables and tenants)

**Notes:**
- Renaming a maneuver propagates everywhere automatically — Log lesson, Progress, and Students pages read names from the database
- Add / delete / reorder of maneuvers remains future work (Phase 4 checklist updated)

---

## 🆕 Latest Feature (September 9, 2026) — Lesson vs Exam

### Lesson Type on Scheduled Lessons

**Problem Solved:**
- A scheduled slot can be a regular lesson or an examination, but there was no way to record or see which

**Solution Implemented:**

1. **Database** (`supabase/migrations/202609090002_add_lesson_kind.sql`):
   - `lessons.kind` text column — `'lesson'` (default, covers existing rows) or `'exam'`, enforced by a check constraint

2. **API** (`src/lib/api.js`):
   - `updateLesson` now accepts `kind` (`createLesson` already passes the full payload through)

3. **Lessons page** (`src/pages/LessonsAdminPage.jsx`):
   - Add/edit lesson modal has a "Type" field (Lesson / Exam)
   - Scheduled lessons table has a Type column — blue badge for Lesson, warn badge for Exam
   - Duration column now uses the same 1 hour / 2 hours labels as the form

4. **Translations:** `laKind`, `laKindLesson`, `laKindExam` (en + it)

**Notes:**
- The Schedule calendar and other pages are untouched — kind currently shows only in the lessons list, as requested
