# PatentePro — Project Context File

> **How to use this file:**
> - **With Codex (VS Code):** Keep this file open or reference it at the start of every session: *"Read PATENTEPRO.md first, then help me with..."*
> - **With Claude (chat):** Paste this file at the start of a new conversation to restore full context
> - **Keep it updated:** Every time a phase is completed or a decision changes, update the relevant section

---

## What is PatentePro

A web + mobile PWA for Italian driving schools targeting the **Motorizzazione Civile Patente B** exam. It replaces WhatsApp scheduling, paper notes, and zero visibility with one centralised tool.

**Five core features:**
1. Dashboard — active students, today's lessons, exam-ready count, struggling maneuvers
2. Student profiles — per-maneuver star ratings, lesson timeline, exam readiness
3. Lesson logging — route type, maneuver ratings, error tags, free-text note
4. Exam checklist — official Patente B checklist linked to student performance data
5. Slot swapping — in-app swap requests with email notifications, accept/reject flow

**Three user roles:**
| Role | Interface | Access |
|---|---|---|
| Admin | Web browser | Full CRUD, school settings, scheduling, reports |
| Teacher | PWA (mobile) | Own calendar, lesson feedback, swap requests, student profiles |
| Student | PWA (mobile) — phase 2 | Read-only schedule + lesson feedback |

---

## Repository

- **Repo:** https://github.com/AbdulAleemSiddiqui/patente_pro_components
- **Forked from:** khanuzair680/patente_pro_components
- **Branch:** main
- **Prototype (visual reference):** https://khanuzair680.github.io/patente_pro_components/

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | React + Vite | Already scaffolded |
| Styling | Tailwind CSS | Already in package.json |
| Icons | Lucide React | Already in package.json |
| State management | Zustand | Needs adding |
| Routing | react-router-dom | Needs adding |
| Calendar | react-big-calendar + date-fns | Needs adding |
| PWA | vite-plugin-pwa | Needs adding |
| Database + Auth | Supabase (hosted free tier) | `@supabase/supabase-js` v2 already in package.json |
| Email notifications | Resend.com | Free tier, 3k emails/month |
| Hosting | Vercel | Free tier, auto-deploys from GitHub |

---

## Current Repo Structure

```
patente_pro_components/
  src/                          ← React source (review contents before building)
    main.jsx                    ← entry point
    lib/
      supabase.js               ← Supabase client (may already exist)
  supabase/
    migrations/                 ← SQL migration files WRITTEN but NOT yet run
  js/                           ← OLD vanilla prototype files — DELETE these
  documents/                    ← project docs
  index.html                    ← React root, loads src/main.jsx
  package.json                  ← has: react, vite, tailwind, supabase-js, lucide-react
  .env.example                  ← has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  .env.local                    ← NOT committed, YOU create this with real keys
  vite.config.js                ← in place
  .gitignore                    ← in place
  PATENTEPRO.md                 ← this file
```

### Target src/ structure (build toward this)

```
src/
  main.jsx                      ← renders <App /> with router
  App.jsx                       ← route definitions + auth guard
  index.css                     ← Tailwind base imports
  lib/
    supabase.js                 ← single Supabase client instance
    api/
      lessons.js                ← all lesson-related DB calls
      users.js                  ← teacher/student DB calls
      feedback.js               ← feedback + ratings DB calls
      swaps.js                  ← swap request DB calls
  store/
    authStore.js                ← Zustand: current user, role, tenant_id
    lessonStore.js              ← Zustand: lessons for current view
  components/
    layout/
      BottomNav.jsx             ← teacher mobile bottom navigation
      AdminSidebar.jsx          ← admin web sidebar
    shared/
      LessonCard.jsx            ← reused in dashboard + calendar
      StarRating.jsx            ← reused in feedback form + student profile
      LoadingSpinner.jsx
      ErrorMessage.jsx
  pages/
    auth/
      Login.jsx
    teacher/
      Dashboard.jsx
      Calendar.jsx
      FeedbackForm.jsx          ← 3-step wizard
      StudentProfile.jsx
      SwapRequests.jsx
      ExamChecklist.jsx
    admin/
      AdminDashboard.jsx
      ScheduleLesson.jsx
      LessonSchedule.jsx
      ManageUsers.jsx
      Settings.jsx
```

---

## Database Schema

All tables include `tenant_id` for multi-tenancy. Row-level security (RLS) enforces isolation.

```sql
-- Core tables
tenants           (id, name, city_id, logo_url, theme_color)
cities            (id, name)
route_types       (id, city_id, name, requires_sub_selection boolean)
route_sub_types   (id, route_type_id, label)
users             (id, tenant_id, role [admin|teacher|student], full_name, email)
teacher_availability (id, teacher_id, day_of_week, start_time, end_time)
maneuvers         (id, tenant_id, name, order_index)
error_tags        (id, tenant_id, label)

-- Lesson tables
lessons           (id, tenant_id, teacher_id, student_id, scheduled_at,
                   duration_minutes, status [scheduled|completed|cancelled])
lesson_feedback   (id, lesson_id, route_type_id, route_sub_type_id, notes, submitted_at)
maneuver_ratings  (id, lesson_feedback_id, maneuver_id, rating [1-5])
lesson_feedback_error_tags (lesson_feedback_id, error_tag_id)

-- Swap tables
swap_requests     (id, requesting_teacher_id, target_teacher_id, lesson_id,
                   status [pending|accepted|rejected], created_at)
```

**RLS example:**
```sql
create policy "tenant isolation" on lessons
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

---

## Environment Variables

```bash
# .env.local (never commit this file)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Add later for email notifications
RESEND_API_KEY=your-resend-key-here
```

---

## Key Business Rules — Read Before Coding

**Swap requests:**
- When a teacher requests a swap, only teachers who are available for the FULL lesson slot (same date + start time + duration) appear in the dropdown
- On accept: lesson `teacher_id` updates, both calendars reflect the change, email sent to both teachers + admin
- On reject: requesting teacher notified, lesson unchanged

**Lesson feedback form — 3 steps:**
1. Route type (dropdown). If `requires_sub_selection = true` → second dropdown appears (e.g. highway entry point). If false → second dropdown hidden
2. Maneuver ratings: each maneuver gets 1–5 stars + optional error tags
3. Free text note (optional) + submit

**Exam readiness:**
- A student is "exam ready" when all maneuvers are rated ≥ 4 stars
- Dashboard shows exam-ready count and top 3 struggling maneuvers (lowest average rating across all students)

**Teacher availability:**
- Stored as weekly recurring slots (day_of_week 0–6, start_time, end_time)
- Admin schedule lesson page filters teachers by availability for selected date + time

**City config (multi-city future):**
- Admin sets the city once in Settings
- Route types and sub-types are pre-configured per city
- Teachers see the correct dropdowns automatically

**Multi-tenancy:**
- Every DB table has `tenant_id`
- RLS enforces that users only see their own school's data
- Adding a new school = inserting a new row in `tenants` — no code changes needed

---

## Auth Flow

```
User visits app
  → not logged in → redirect to /login
  → logged in, role = admin → redirect to /admin/dashboard
  → logged in, role = teacher → redirect to /teacher/dashboard
  → logged in, role = student → redirect to /student/schedule (phase 2)

JWT carries: user_id, role, tenant_id
Supabase RLS uses tenant_id from JWT for all queries
```

---

## Notification Rules (Email via Resend)

| Trigger | Who gets the email |
|---|---|
| New lesson scheduled | Teacher + Student |
| Lesson cancelled | Teacher + Student |
| Swap request sent | Target teacher (with link to swap page) |
| Swap accepted | Requesting teacher |
| Swap rejected | Requesting teacher |

WhatsApp/SMS: phase 2, not in MVP.

---

## Phases & Current Status

### ✅ Done
- Visual prototype built and client-approved
- React + Vite project scaffolded
- Tailwind, Supabase JS, Lucide React installed
- `index.html` wired to `src/main.jsx`
- `.env.example` created
- Supabase migration SQL written (in `supabase/migrations/`)
- `.gitignore` in place

### 🔲 Phase 1 — Finish project setup
- [ ] `npm install` to restore node_modules after clone
- [ ] Add missing packages: `npm install react-router-dom zustand react-big-calendar date-fns vite-plugin-pwa`
- [ ] Confirm dev server runs: `npm run dev` → localhost:5173
- [ ] Delete old `js/` folder (vanilla prototype leftovers)
- [ ] Add PWA manifest (`public/manifest.json`) and register service worker in `vite.config.js`

### 🔲 Phase 2 — Set up Supabase
- [ ] Create Supabase project (free, Europe West region)
- [ ] Copy URL + anon key → create `.env.local`
- [ ] Run migration SQL in Supabase SQL editor
- [ ] Enable email auth in Supabase dashboard
- [ ] Confirm connection works (small test query)

### 🔲 Phase 3 — Review existing src/ files
- [ ] Read all files in `src/` and identify what is complete vs broken vs missing
- [ ] Fix or replace broken files
- [ ] Confirm Login screen works against real Supabase auth

### 🔲 Phase 4 — Build screens
- [ ] App router + auth guard (`App.jsx`)
- [ ] Bottom nav component (teacher)
- [ ] Teacher: Dashboard
- [ ] Teacher: Calendar (react-big-calendar)
- [ ] Teacher: Feedback form (3-step wizard)
- [ ] Teacher: Student profile
- [ ] Teacher: Swap requests
- [ ] Teacher: Exam checklist
- [ ] Admin: Dashboard
- [ ] Admin: Schedule lesson
- [ ] Admin: Lesson schedule overview
- [ ] Admin: Manage users
- [ ] Admin: Settings

### 🔲 Phase 5 — Wire real data
- [ ] All screens pull from Supabase (replace any mock data)
- [ ] Feedback form saves to DB on submit
- [ ] Swap accept/reject updates DB
- [ ] Admin schedule lesson creates real lesson row
- [ ] Email notifications via Resend
- [ ] Seed demo data (school, teacher, student, some lessons)

### 🔲 Phase 6 — Deploy
- [ ] Connect GitHub repo to Vercel
- [ ] Add env vars in Vercel dashboard
- [ ] Test PWA install on real phone
- [ ] Send link to client

---

## Coding Conventions

- **No inline styles.** Use Tailwind classes only.
- **No direct Supabase calls in components.** All DB access goes through `src/lib/api/` files.
- **One Supabase client.** Created once in `src/lib/supabase.js`, imported everywhere else.
- **Zustand for global state.** `authStore` for user/role/tenant. `lessonStore` for lesson data.
- **React Router for navigation.** No manual `window.location` changes.
- **All API functions are async/await** with try/catch. Errors bubble up to the component to display.
- **PWA-first for teacher screens.** All teacher UI must work at 375px width (iPhone SE).
- **Admin screens are web-only.** Can use wider layouts, sidebars, etc.

---

## Useful Commands

```bash
# Start local dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Push to GitHub (triggers auto-deploy on Vercel)
git add .
git commit -m "your message"
git push
```

---

## How This Project Is Built

**Planning & architecture:** Claude (claude.ai) — decisions, data model, component structure, business rules

**Execution:** Codex in VS Code or ChatGPT — writing the actual code file by file

**Workflow:**
1. Open this file in VS Code before starting a Codex session
2. Tell Codex: *"Read PATENTEPRO.md. I want to build [specific screen/feature]. Follow the conventions and structure in that file."*
3. When a phase is done, update the checkbox in this file and push to GitHub
4. For any architectural question or new feature, go to Claude first, update this file, then execute with Codex

---

*Last updated: June 2026 — Phase 1 starting*
