# PatentePro - Driving School Management System

A modern web application for driving school instructors and administrators to manage students, lessons, schedules, and progress tracking.

## 🌟 Features

### For Instructors
- **Dashboard** - Overview of active students, lessons today, and swap requests
- **Student Management** - Track student profiles, progress, and lesson history
- **Lesson Logging** - Complete detailed reports after each driving session
- **Progress Tracking** - Monitor student performance across different skill areas
- **Availability Planner** - Set weekly teaching availability
- **Calendar View** - View and manage scheduled lessons by teacher or student

### For Administrators
- **User Management** - Invite teachers and students, manage access
- **School Settings** - Configure school profile, routes, maneuvers, and error tags
- **Teacher Availability** - Review and manage instructor schedules
- **Lesson Scheduling** - Create and manage lessons with calendar integration

### For Students
- **Progress Tracking** - View personal learning progress and feedback
- **Lesson History** - Access completed lessons and instructor notes
- **Performance Analytics** - See general averages and recent feedback

### Additional Features
- **Slot Swap System** - Request and accept lesson swaps between instructors
- **Multi-language Support** - English and Italian language options
- **Real-time Updates** - Database connectivity with Supabase
- **Responsive Design** - Works perfectly on desktop and mobile devices
- **Role-based Access** - Different interfaces for admin, teacher, and student roles

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL database + Auth)
- **Calendar**: React Big Calendar
- **Date Utilities**: date-fns

## 📋 Prerequisites

- Node.js (latest version)
- A Supabase project account
- Git (for version control)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd patente_pro_components
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Set up the database**
   
   Run the migration files in order from your Supabase SQL editor:
   - `supabase/migrations/202606060001_initial_schema.sql`
   - `supabase/migrations/202606090002_seed_demo_data.sql`
   - `supabase/migrations/202606090004_ensure_admin_user.sql`
   - `supabase/migrations/202606130001_add_manoeuvre_details.sql`
   - `supabase/migrations/202606130002_populate_manoeuvres.sql`
   - `supabase/migrations/202606130003_add_highway_routes_genova.sql`
   - `supabase/migrations/202606130004_add_general_rating_field.sql`
   - `supabase/migrations/202606130005_fix_rating_column.sql`

   Or use the complete migration:
   ```bash
   supabase migration up
   ```

## 🏃 Running the Application

**Development mode:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

The app will be available at `http://localhost:5173` in development mode.

## 📁 Project Structure

```
patente_pro_components/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Layout.jsx      # Main layout with sidebar and header
│   │   └── ui.jsx          # UI component library
│   ├── pages/              # Page components
│   │   ├── DashboardPage.jsx
│   │   ├── StudentsPage.jsx
│   │   ├── LessonLogPage.jsx
│   │   ├── SchedulePage.jsx
│   │   ├── SwapPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── UsersPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── StudentProgressPage.jsx
│   ├── lib/                # Utility libraries
│   │   ├── api.js          # API functions
│   │   ├── roleAccess.js   # Role-based navigation
│   │   └── supabase.js     # Database connection
│   ├── store/              # State management
│   │   └── useAuthStore.js # Authentication state
│   ├── App.jsx             # Main application component
│   └── main.jsx            # Application entry point
├── supabase/               # Database migrations and setup
│   └── migrations/         # SQL migration files
├── public/                 # Static assets
├── .env.example           # Environment variables template
├── package.json           # Project dependencies
├── vite.config.js         # Vite configuration
└── README.md              # This file
```

## 👥 User Roles

### Admin
- Full access to all features
- User management and invitations
- School settings configuration
- Teacher availability management

### Teacher
- Student management and progress tracking
- Lesson logging and scheduling
- Swap request management
- Availability planning

### Student
- View personal progress and feedback
- Access lesson history
- View performance analytics

## 🌐 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 📱 Mobile Responsiveness

The application is fully responsive and works on:
- Desktop computers (768px and above)
- Tablets (768px - 1024px)
- Mobile devices (below 768px)

Mobile features include:
- Hamburger menu navigation
- Touch-optimized interface
- Simplified header for smaller screens
- Overlay menu with backdrop

## 🔐 Authentication

The application uses Supabase Auth for user authentication. Users can:
- Sign in with email and password
- Have role-based access control
- Maintain secure sessions across page refreshes

## 📊 Database Schema

The application uses PostgreSQL via Supabase with tables for:
- Users and profiles
- Students and teachers
- Lessons and schedules
- Manoeuvres and evaluations
- Swap requests
- Routes and route types
- Error tags and evaluations

## 🐛 Recent Updates & Fixes

### Mobile Navigation Fix (June 2026)
- Added hamburger menu button for mobile devices
- Implemented slide-out drawer menu with overlay
- Auto-close menu on navigation item click
- Responsive header with hidden search on mobile
- Improved touch interactions

### Previous Updates
- Teacher availability calendar
- Edit and delete lesson functionality
- Month calendar view with lesson counts
- Language improvements for English and Italian

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly on desktop and mobile
4. Submit a pull request

## 📄 License

This project is proprietary software for driving school management.

## 🆘 Support

For issues or questions, please contact the development team or create an issue in the repository.

---

Built with ❤️ for driving school management