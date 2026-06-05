# PatentePro Next Tasks

Source reviewed: `documents/PatentePro_Architecture_and_Interaction_Spec.md`

## Current Status

- React + Vite project setup is already present.
- Tailwind CSS is already present.
- The former vanilla prototype has been migrated into a React UI prototype.
- English / Italian UI switching exists in the current prototype.
- Backend, auth, database, PWA, calendar, and deployment foundation are not yet implemented.

## Next Task List

### 1. Finish Phase 0 Foundation

- Add Supabase client configuration.
- Define environment variables for Supabase URL and anon key.
- Create initial database migration files.
- Implement the MVP schema:
  - `tenants`
  - `cities`
  - `route_types`
  - `route_sub_types`
  - `users`
  - `teacher_availability`
  - `maneuvers`
  - `lessons`
  - `lesson_feedback`
  - `maneuver_ratings`
  - `error_tags`
  - `lesson_feedback_error_tags`
  - `swap_requests`
- Add row-level security policies for tenant isolation.
- Add auth role handling for `admin`, `teacher`, and `student`.
- Add basic route protection by role.
- Add PWA setup with `vite-plugin-pwa`.
- Add manifest, app icons, and service worker stub.

### 2. Add App Architecture Before Feature Work

- Split the current single `App.jsx` into folders:
  - `components/`
  - `pages/`
  - `data/`
  - `lib/`
  - `stores/`
  - `routes/`
- Add a lightweight global store with Zustand.
- Move static mock data into dedicated data files.
- Add reusable UI primitives:
  - `Button`
  - `Card`
  - `Badge`
  - `ProgressBar`
  - `Stars`
  - `Tag`
  - `PageHeader`
  - `Toast`
- Add i18n structure for English and Italian copy.

### 3. Add Admin Core Screens

- Add Admin Settings page:
  - school name
  - logo
  - city
  - theme color
  - route configuration
- Add User Management page:
  - teachers
  - students
  - invite flow
  - edit / deactivate user
- Add Teacher Availability page.
- Add Schedule Lesson flow.
- Add lesson calendar view using `react-big-calendar`.
- Add schedule tabs:
  - by teacher
  - by student

### 4. Add Teacher PWA Screens

- Add teacher dashboard with today's lessons.
- Add own lesson calendar.
- Add lesson detail sheet.
- Add multi-step feedback form:
  - route selection
  - conditional route sub-type selection
  - maneuver ratings
  - error tags
  - free-text notes
- Add student profile view.
- Add exam checklist view.

### 5. Add Swap And Notification Features

- Add swap request creation flow.
- Filter target teachers by exact availability.
- Add incoming swap request list.
- Add accept / reject behavior.
- Update lesson ownership when a swap is accepted.
- Add email notification integration with Resend.

### 6. Add Pilot-Ready Polish

- Add loading states.
- Add empty states.
- Add form validation.
- Add error handling.
- Add dashboard aggregates:
  - active student count
  - today's lessons
  - exam-ready count
  - struggling maneuvers
  - pending swap count
- Add deployment setup for Vercel.
- Add Supabase hosted project setup notes.

## Recommended Immediate Next Task

Start with **Phase 0 backend foundation**:

1. Add Supabase configuration.
2. Create the database migration schema.
3. Add auth and role-aware routing.
4. Add tenant-aware data access helpers.

This should happen before expanding Admin or Teacher screens, because most later features depend on users, roles, tenants, lessons, availability, and feedback records.
