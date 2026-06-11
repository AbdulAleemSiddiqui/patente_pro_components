### ✅ Phase 1 — Project Setup & Architecture Refactor

* [x] npm install
* [x] Added:

  * react-router-dom
  * zustand
  * react-big-calendar
  * date-fns
  * vite-plugin-pwa
* [x] Development server verified
* [x] Routing layer added
* [x] Zustand auth store added
* [x] App.jsx split into page architecture
* [x] Shared layout components extracted
* [x] Shared UI primitives extracted
* [x] Demo auth flow implemented
* [ ] Delete old js/ folder (verify still exists)
* [ ] Final PWA configuration

### 🔲 Phase 2 — Supabase Integration

* [x] Create Supabase project
* [x] Configure .env.local
* [x] Add VITE_SUPABASE_URL
* [x] Add VITE_SUPABASE_ANON_KEY
* [x] Add VITE_SUPABASE_SERVICE_ROLE_KEY
* [x] Run migration SQL
* [x] Enable email auth
* [x] Verify authentication
* [x] **Admin user creation system** (June 9, 2026)
* [x] **User management UI with modal forms**
* [x] **Auto tenant_id fetching from database**
* [x] Seed mock data into database
* [ ] Replace mock data with live queries

Notes:

* Supabase config is setup successfully.
* Demo Supabase user was added.
* Login flow has been verified against Supabase.
* Next: move mocked demo data into seeded database so the app remains visually complete and fully connected to the DB.
