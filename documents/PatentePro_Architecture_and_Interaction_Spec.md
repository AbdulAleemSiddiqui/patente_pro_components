# PatentePro — Architecture & Interaction Specification

> **Scope:** MVP · Web admin panel + PWA for teachers  
> **Date:** June 2026  
> **Status:** Pre-development — approved for MVP build

---

## 1. System Overview

PatentePro is a SaaS driving-school management tool. The MVP serves three actor roles — **Admin**, **Teacher**, and **Student** (Student is read-only in phase 2). Each tenant is a single driving school. Future expansion targets multi-school, multi-city deployments.

---

## 2. Actor Roles

| Role | Interface | Access |
|---|---|---|
| Admin | Web browser | Full CRUD, school settings, schedule management, reporting |
| Teacher | PWA (mobile) | Own calendar, lesson feedback, swap requests, student profiles |
| Student | PWA (mobile) — phase 2 | Read-only schedule + lesson feedback |

---

## 3. Technology Stack

### Guiding constraints
- **Free tier for as long as possible** — no paid infra during MVP/pilot.
- **No vendor lock-in** — avoid services that are expensive to migrate away from.
- **PWA first** — single codebase for web admin and teacher mobile experience.
- **Calendar must be excellent** — interactive, free, future-proof.

### Chosen stack

#### Frontend
**React + Vite** — the standard. Fast dev, good PWA support via `vite-plugin-pwa`.

**Calendar:** [`react-big-calendar`](https://github.com/jquense/react-big-calendar) — open source, MIT licensed, excellent week/month/day views, supports custom event rendering. Alternative: `FullCalendar` (free tier available, slightly more polished). Both are easy to extend.

**UI:** Tailwind CSS — utility-first, no lock-in, excellent mobile support.

**State:** Zustand — lightweight, minimal boilerplate. No Redux needed at this scale.

**PWA:** `vite-plugin-pwa` with Workbox — offline support, installable on Android/iOS home screen.

#### Backend
**Supabase (self-hosted) OR Railway + Postgres + custom API**

Recommendation for MVP: **Supabase hosted free tier** (500 MB, up to 2 active projects). For a pilot with a handful of schools, 500 MB is ample — a lesson record with all fields is ~2 KB; 10,000 lessons = 20 MB. Migrate to self-hosted Supabase or a plain Postgres + REST API on Railway/Render when needed.

The API layer is standard REST (or tRPC if you want full type-safety end-to-end). Do NOT couple the frontend tightly to Supabase's client SDK — go through your own API functions. This makes a future backend swap painless.

| Layer | Choice | Free tier |
|---|---|---|
| Database | Postgres (via Supabase or Railway) | Yes |
| Auth | Supabase Auth (JWT, role claims) | Yes |
| File storage | Supabase Storage (logo uploads) | 1 GB free |
| Email notifications | Resend.com | 3,000 emails/month free |
| Hosting (frontend) | Vercel or Netlify | Yes |
| Hosting (API, if custom) | Railway | $5 free credit/month |

#### Auth
Supabase Auth with JWT. Each user row carries a `role` claim (`admin`, `teacher`, `student`) and a `tenant_id` (school ID). Row-level security (RLS) in Postgres enforces data isolation between tenants.

---

## 4. Data Model (simplified)

```
tenants
  id, name, city_id, logo_url, theme_color, created_at

cities
  id, name

route_types
  id, city_id, name, requires_sub_selection (bool)

route_sub_types
  id, route_type_id, label   -- e.g. "A7 Bolzaneto" for highway entries

users
  id, tenant_id, role (admin|teacher|student), full_name, email, phone

teacher_availability
  id, teacher_id, day_of_week (0-6), start_time, end_time

maneuvers
  id, tenant_id, name, order_index

lessons
  id, tenant_id, teacher_id, student_id, scheduled_at, duration_minutes, status (scheduled|completed|cancelled)

lesson_feedback
  id, lesson_id, route_type_id, route_sub_type_id, notes, submitted_at

maneuver_ratings
  id, lesson_feedback_id, maneuver_id, rating (1-5)

error_tags
  id, tenant_id, label   -- e.g. "late rear-view check", "hard braking"

lesson_feedback_error_tags
  lesson_feedback_id, error_tag_id

swap_requests
  id, requesting_teacher_id, target_teacher_id, lesson_id, status (pending|accepted|rejected), created_at
```

---

## 5. User Interaction Flow

### 5.1 Admin flows

#### School setup (once)
1. Admin registers → first user = owner (admin role).
2. Settings page: upload logo, set school name, choose city.
3. City selection loads pre-configured route types and sub-types.
4. Admin can add/edit maneuvers and error tags for the school.

#### Manage users
1. Admin → Users → Add Teacher → enters name, email → system sends invite email.
2. Teacher receives invite, sets password.
3. Same flow for students.
4. CRUD: edit name/contact, deactivate (soft delete), reassign lessons.

#### Schedule a lesson
1. Admin → Schedule → New Lesson.
2. Pick date + duration (30/45/60/90 min selector).
3. System queries `teacher_availability` filtered by day and time slot → shows only eligible teachers.
4. Admin selects teacher + student → lesson created.
5. Both teacher and student receive confirmation email.

#### View lesson schedule
- Two top-level tabs: **By Teacher** / **By Student**.
- Search bar filters by name.
- Calendar view: each tile shows initials + time. Click → popup with full lesson detail.
- Popup shows: teacher, student, duration, status, feedback summary (if submitted).

#### Admin dashboard
- Active student count.
- Today's lesson list.
- Exam-ready count (students where all maneuvers ≥ 4 stars).
- Top 3 struggling maneuvers across all students (aggregated from ratings).
- Pending swap requests (count badge).

### 5.2 Teacher flows (PWA)

#### Dashboard
- Today's lesson list (time, student name, duration).
- Pending swap request alerts.
- Quick link to submit pending feedback.

#### Set availability
- Weekly grid (Mon–Sun, morning/afternoon/evening slots or custom time picker).
- Teacher checks available slots → saved to `teacher_availability`.
- Admin sees this when scheduling.

#### Lesson calendar
- Month/week view filtered to own lessons only.
- Tap a lesson tile → detail sheet slides up.
- Detail sheet has two actions: **Submit Feedback** / **Request Swap**.

#### Submit lesson feedback
1. Open feedback form (from lesson detail or after a lesson notification).
2. Step 1 — Route:
   - Select route type (e.g. "City driving", "Highway", "Parking").
   - If `requires_sub_selection = true`, second dropdown appears (e.g. "A7 Bolzaneto entry").
3. Step 2 — Maneuvers:
   - Each maneuver listed with a 1–5 star rating.
   - Optional: tag one or more error tags per maneuver.
4. Step 3 — Note: free text, optional.
5. Submit → `lesson_feedback` + `maneuver_ratings` written → student profile updated.

#### Student profile (teacher view)
- Accessible from lesson detail or a student list.
- Maneuver progress grid: each maneuver, latest rating, trend arrow.
- Lesson timeline: chronological list of past sessions with feedback summary.
- Exam readiness indicator (green / amber / red).

#### Exam checklist
- Official Motorizzazione Civile Patente B items listed.
- Each item linked to one or more maneuvers.
- Checkmark auto-filled when linked maneuver ≥ threshold rating.
- Teacher can manually override any item.

#### Request a swap
1. Teacher taps a lesson → **Request Swap**.
2. Dropdown shows only teachers available for the exact date + time + duration.
3. Teacher selects colleague → swap request created.
4. Target teacher receives email with a deep link to the swap request page.
5. Target teacher opens app → Swap Requests page → **Accept** or **Reject**.
6. On Accept: lesson `teacher_id` updated, both teachers' calendars reflect the change. Confirmation email sent to both + admin.
7. On Reject: requesting teacher notified, lesson unchanged.

### 5.3 Student flows (phase 2)

- Login → view own lesson calendar (read-only).
- Tap a past lesson → view feedback: route type, maneuver ratings, error tags, teacher note.
- No edit access.

---

## 6. Notification Strategy

**Phase 1 (MVP):** Email only via Resend.com.

| Trigger | Recipient |
|---|---|
| New lesson scheduled | Teacher + Student |
| Lesson cancelled | Teacher + Student |
| Swap request sent | Target teacher |
| Swap accepted/rejected | Requesting teacher |
| Feedback submitted | Student (optional) |

**Phase 2:** Add WhatsApp via Twilio or 360dialog (paid). SMS via Twilio. Toggle in admin settings.

---

## 7. City & Route Configuration

Each tenant belongs to one city. The city record defines available route types and their sub-types.

**Example — Genova city config:**
```
Route types:
  - "City driving"         → no sub-selection
  - "Highway driving"      → sub-types: A7 Bolzaneto, A26 Ovada, A10 Pegli, A7 Ronco Scrivia
  - "Extra-urban (hills)"  → sub-types: Passo della Bocchetta, Via Aurelia north, Via Aurelia south
  - "Parking"              → no sub-selection
  - "Roundabout practice"  → no sub-selection
```

When a teacher opens the feedback form:
- Dropdown 1: route type.
- If `requires_sub_selection = true` → Dropdown 2 appears dynamically.
- If `false` → Dropdown 2 is hidden.

Admin configures this once per city in Settings → Routes.

---

## 8. Multi-Tenancy Architecture

The MVP schema is already multi-tenant. Every table carries `tenant_id`. Postgres RLS enforces:

```sql
-- Example RLS policy on lessons
create policy "tenant isolation"
  on lessons
  using (tenant_id = auth.jwt() ->> 'tenant_id');
```

**Scaling to multi-city:**
- `tenants` table references `cities`.
- City admins could be introduced as a super-admin role above school admins.
- Sell the platform per-city: all schools in Genova share route/city config but are isolated tenants.

**No code changes needed at MVP** — just add tenants and cities.

---

## 9. PWA Considerations

The teacher app is a PWA because:
- No App Store approval delay for an MVP.
- Single codebase with the admin web app.
- Works on any Android or iOS device (iOS ≥ 16.4 has good PWA support including push notifications).

Install prompt is triggered on first visit after the teacher logs in. The app icon and splash screen use the school's logo (configured by admin).

Offline support (Workbox): cache the lesson list and feedback form. Sync submissions when back online.

---

## 10. Development Phases

### Phase 0 — Foundation (1–2 weeks)
- Repo setup: React + Vite + Tailwind + Supabase.
- Auth: login, JWT, role middleware.
- Schema: run migrations, RLS policies.
- PWA manifest + service worker stub.

### Phase 1 — Admin core (2–3 weeks)
- Settings page (school config, city, routes).
- User management (teacher + student CRUD).
- Teacher availability page.
- Schedule lesson flow.
- Lesson schedule calendar view.

### Phase 2 — Teacher core (2–3 weeks)
- Teacher dashboard.
- My lesson calendar (PWA).
- Lesson feedback form (multi-step).
- Student profile page.
- Exam checklist.

### Phase 3 — Swap & notifications (1–2 weeks)
- Swap request flow (send/accept/reject).
- Email notifications via Resend.
- Swap request list page.

### Phase 4 — Polish & pilot (1 week)
- Admin dashboard aggregates.
- Error handling, loading states, empty states.
- Basic analytics (exam-ready count, struggling maneuvers).
- Deploy to Vercel + Supabase hosted.

### Phase 5 — Student access (post-pilot)
- Student login + read-only schedule.
- Lesson feedback view.

---

## 11. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| PWA vs native app | PWA | Faster MVP, no app store, single codebase |
| Supabase vs self-hosted Postgres | Supabase hosted (start) | Free, fast setup; migrate to self-hosted when budget allows |
| REST vs GraphQL | REST | Simpler, less setup, sufficient for this scale |
| Email provider | Resend | 3k free emails/month, excellent DX, easy to swap |
| Calendar library | react-big-calendar | MIT, actively maintained, fully customisable |
| Frontend hosting | Vercel | Free, zero-config for Vite, global CDN |
| State management | Zustand | Lightweight, no boilerplate overhead for MVP |

---

## 12. What Is Explicitly Out of Scope for MVP

- Payment / billing integration.
- In-app messaging / chat.
- Document uploads (student licence scans etc.).
- WhatsApp/SMS notifications.
- Offline-first sync (basic PWA caching only).
- Advanced analytics / BI dashboard.
- Student-facing exam booking.

---

*Document version 1.0 — update after sprint 0 kickoff.*
