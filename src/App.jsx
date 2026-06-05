import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Car,
  CalendarDays,
  ClipboardList,
  Clock,
  Eye,
  LayoutDashboard,
  ParkingCircle,
  Plus,
  Route,
  Save,
  Search,
  Settings,
  Shuffle,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase.js';

const NAV_ITEMS = [
  { section: 'main', page: 'dashboard', icon: LayoutDashboard },
  { section: 'main', page: 'students', icon: Users },
  { section: 'main', page: 'log', icon: ClipboardList },
  { section: 'admin', page: 'settings', icon: Settings },
  { section: 'admin', page: 'users', icon: UserPlus },
  { section: 'admin', page: 'availabilityAdmin', icon: Clock },
  { section: 'admin', page: 'schedule', icon: CalendarDays },
  { section: 'tools', page: 'manoeuvres', icon: Route },
  { section: 'tools', page: 'swap', icon: Shuffle },
];

const STUDENTS = [
  {
    name: 'Giulia Ferretti',
    age: 23,
    lessons: 18,
    lastLesson: { en: 'yesterday', it: 'ieri' },
    instructor: 'M. Rossi',
    progress: 82,
    progressClass: 'good',
    status: 'ready',
    manoeuvres: [
      ['hillStart', 4],
      ['parallelParking', 3],
      ['uTurn', 5],
      ['overtaking', 4],
      ['motorway', 3],
    ],
    notes: [
      { tone: 'good', title: 'cityGood', meta: 'M. Rossi - 21 May', tags: [['mirrorsOk', 'green'], ['priorityOk', 'green']] },
      { tone: 'warn', title: 'parkingImprove', meta: 'F. Marino - 18 May', tags: [['steeringWarn', 'warn']] },
    ],
  },
  {
    name: 'Luca Bianchi',
    age: 20,
    lessons: 9,
    lastLesson: { en: '2 days ago', it: '2gg fa' },
    instructor: 'M. Rossi',
    progress: 44,
    progressClass: 'warn',
    status: 'inProgress',
    manoeuvres: [
      ['hillStart', 3],
      ['parallelParking', 2],
      ['uTurn', 3],
      ['overtaking', 2],
      ['motorway', 1],
    ],
    notes: [
      { tone: 'warn', title: 'priorityDifficulty', meta: 'M. Rossi - 20 May', tags: [['priorityWarn', 'warn']] },
      { tone: 'good', title: 'vehicleControlNote', meta: 'M. Rossi - 17 May', tags: [['clutchOk', 'green'], ['brakesOk', 'green']] },
    ],
  },
  {
    name: 'Sara Conti',
    age: 19,
    lessons: 5,
    lastLesson: { en: '5 days ago', it: '5gg fa' },
    instructor: 'F. Marino',
    progress: 22,
    progressClass: '',
    status: 'start',
    manoeuvres: [
      ['hillStart', 2],
      ['parallelParking', 1],
      ['uTurn', 1],
      ['overtaking', 1],
      ['motorway', 1],
    ],
    notes: [
      { tone: 'good', title: 'firstLesson', meta: 'F. Marino - 15 May', tags: [['attitudeOk', 'green']] },
    ],
  },
  {
    name: 'Marco Verdi',
    age: 22,
    lessons: 14,
    lastLesson: { en: 'today', it: 'oggi' },
    instructor: 'M. Rossi',
    progress: 65,
    progressClass: '',
    status: 'inProgress',
    manoeuvres: [
      ['hillStart', 4],
      ['parallelParking', 4],
      ['uTurn', 3],
      ['overtaking', 3],
      ['motorway', 2],
    ],
    notes: [
      { tone: 'good', title: 'parkingGood', meta: 'M. Rossi - 22 May', tags: [['parkingOk', 'green']] },
      { tone: 'warn', title: 'motorwaySpeed', meta: 'M. Rossi - 19 May', tags: [['speedWarn', 'warn']] },
    ],
  },
  {
    name: 'Anna Moretti',
    age: 25,
    lessons: 7,
    lastLesson: { en: '3 days ago', it: '3gg fa' },
    instructor: 'L. Costa',
    progress: 35,
    progressClass: '',
    status: 'start',
    manoeuvres: [
      ['hillStart', 2],
      ['parallelParking', 2],
      ['uTurn', 2],
      ['overtaking', 2],
      ['motorway', 1],
    ],
    notes: [
      { tone: 'good', title: 'hillStartGood', meta: 'L. Costa - 19 May', tags: [['clutchOk', 'green']] },
    ],
  },
];

const TEACHERS = [
  { name: 'Marco Rossi', initials: 'MR', email: 'marco.rossi@patentepro.it', phone: '+39 320 111 2244', status: 'active', lessonsToday: 4 },
  { name: 'Federica Marino', initials: 'FM', email: 'federica.marino@patentepro.it', phone: '+39 320 222 4411', status: 'active', lessonsToday: 2 },
  { name: 'Luigi Costa', initials: 'LC', email: 'luigi.costa@patentepro.it', phone: '+39 320 333 1188', status: 'active', lessonsToday: 3 },
  { name: 'Giorgio Esposito', initials: 'GE', email: 'giorgio.esposito@patentepro.it', phone: '+39 320 444 7788', status: 'invited', lessonsToday: 0 },
];

const CITY_ROUTES = [
  { type: 'cityDriving', subTypes: [] },
  { type: 'highwayDriving', subTypes: ['A7 Bolzaneto', 'A26 Ovada', 'A10 Pegli', 'A7 Ronco Scrivia'] },
  { type: 'extraUrbanHills', subTypes: ['Passo della Bocchetta', 'Via Aurelia north', 'Via Aurelia south'] },
  { type: 'parkingPractice', subTypes: [] },
  { type: 'roundaboutPractice', subTypes: [] },
];

const ADMIN_AVAILABILITY = [
  { teacher: 'Marco Rossi', mon: '09:00-13:00', tue: '09:00-13:00', wed: '14:00-18:00', thu: '09:00-13:00', fri: '14:00-18:00' },
  { teacher: 'Federica Marino', mon: '09:00-12:00', tue: '-', wed: '09:00-13:00', thu: '15:00-19:00', fri: '09:00-12:00' },
  { teacher: 'Luigi Costa', mon: '14:00-18:00', tue: '14:00-18:00', wed: '-', thu: '09:00-13:00', fri: '09:00-13:00' },
  { teacher: 'Giorgio Esposito', mon: '-', tue: '10:00-12:00', wed: '10:00-12:00', thu: '-', fri: '15:00-18:00' },
];

const LESSONS = [
  { time: '09:00', duration: 50, teacher: 'Marco Rossi', student: 'Giulia Ferretti', status: 'completed' },
  { time: '10:00', duration: 60, teacher: 'Federica Marino', student: 'Sara Conti', status: 'scheduled' },
  { time: '11:00', duration: 50, teacher: 'Marco Rossi', student: 'Luca Bianchi', status: 'completed' },
  { time: '14:00', duration: 50, teacher: 'Marco Rossi', student: 'Marco Verdi', status: 'scheduled' },
  { time: '15:30', duration: 60, teacher: 'Luigi Costa', student: 'Anna Moretti', status: 'scheduled' },
];

const COPY = {
  en: {
    appTitle: 'PatentePro',
    appSubtitle: 'Instructor management',
    instructor: 'Instructor',
    main: 'Main',
    admin: 'Admin',
    tools: 'Tools',
    dashboard: 'Dashboard',
    students: 'Students',
    log: 'Log lesson',
    settings: 'Settings',
    users: 'Users',
    availabilityAdmin: 'Availability',
    schedule: 'Schedule',
    manoeuvres: 'Manoeuvres',
    swap: 'Slot swap',
    search: 'Search student...',
    newLesson: 'New lesson',
    notificationsNone: 'Notifications: no updates',
    databaseConnected: 'DB connected',
    databaseMock: 'Mock data',
    overview: 'Overview',
    overviewSub: 'Wednesday, May 22, 2026 - Instructor: Marco Rossi',
    activeStudents: 'Active students',
    activeStudentsTrend: '+2 this month',
    lessonsToday: 'Lessons today',
    completedTwo: '2 completed',
    readyForExam: 'Ready for exam',
    readyTrend: 'up from 1',
    swapRequests: 'Swap requests',
    pending: 'Pending',
    recentStudents: 'Recent students',
    all: 'All',
    allStudents: 'All students',
    myStudents: 'Mine',
    examReady: 'Exam ready',
    name: 'Name',
    student: 'Student',
    teacher: 'Instructor',
    progress: 'Progress',
    status: 'Status',
    actions: 'Actions',
    ageYears: 'years',
    lessons: 'lessons',
    last: 'Last',
    logAction: '+ Log',
    ready: 'Ready',
    inProgress: 'In progress',
    start: 'Start',
    criticalAreas: 'Critical areas (all students)',
    parallelParking: 'Parallel parking',
    uTurn: 'U-turn',
    priorityCrossroads: 'Priority at intersections',
    mirrorControl: 'Mirror checks',
    safeOvertaking: 'Safe overtaking',
    upcomingLessons: 'Upcoming lessons today',
    completed: 'Completed',
    now: 'Now',
    inTwoHours: 'In 2 hours',
    scheduled: 'Scheduled',
    studentsSub: 'Full profile and lesson history for each student',
    profileDetail: 'Detailed profile',
    manoeuvreEvaluation: 'Manoeuvre evaluation',
    latestNotes: 'Latest instructor notes',
    hillStart: 'Hill start',
    overtaking: 'Overtaking',
    motorway: 'Motorway driving',
    cityGood: 'Excellent city driving',
    parkingImprove: 'Improve parallel parking',
    priorityDifficulty: 'Difficulty with right of way',
    vehicleControlNote: 'Good vehicle control',
    firstLesson: 'Positive first lesson',
    parkingGood: 'Excellent parallel parking',
    motorwaySpeed: 'Slow down on the motorway',
    hillStartGood: 'Good hill start',
    mirrorsOk: 'Mirrors ok',
    priorityOk: 'Priority ok',
    steeringWarn: 'Steering warning',
    priorityWarn: 'Priority warning',
    clutchOk: 'Clutch ok',
    brakesOk: 'Brakes ok',
    attitudeOk: 'Attitude ok',
    parkingOk: 'Parking ok',
    speedWarn: 'Speed warning',
    logSub: 'Complete the report after each driving session',
    lessonDetails: 'Lesson details',
    date: 'Date',
    duration: 'Duration (min)',
    routeType: 'Route type',
    city: 'City',
    extraUrban: 'Extra-urban',
    highway: 'Motorway',
    parking: 'Parking',
    night: 'Night',
    generalRating: 'General rating',
    instructorNotes: 'Instructor notes',
    notesPlaceholder: 'Example: good city driving, improve mirror checks at roundabouts...',
    saveLesson: 'Save lesson',
    lessonSaved: 'Lesson saved successfully',
    performedManoeuvres: 'Performed manoeuvres',
    vehicleControlCat: 'Vehicle control',
    manoeuvresCat: 'Manoeuvres',
    roadCat: 'Road',
    errors: 'Mistakes made',
    schoolSettings: 'School settings',
    schoolSettingsSub: 'Configure the driving school profile, city routes, maneuvers, and error tags',
    schoolProfile: 'School profile',
    schoolName: 'School name',
    cityLabel: 'City',
    themeColor: 'Theme color',
    logoUpload: 'Logo upload',
    logoUploadHint: 'Drop logo file',
    routeConfiguration: 'Route configuration',
    requiresSubSelection: 'Requires sub-selection',
    noSubSelection: 'No sub-selection',
    maneuverCatalog: 'Maneuver catalog',
    errorTagCatalog: 'Error tag catalog',
    saveSettings: 'Save settings',
    settingsSaved: 'Settings saved',
    userManagement: 'User management',
    userManagementSub: 'Invite teachers and students, edit contact details, and deactivate users',
    inviteTeacher: 'Invite teacher',
    inviteStudent: 'Invite student',
    teachers: 'Teachers',
    active: 'Active',
    invited: 'Invited',
    deactivate: 'Deactivate',
    edit: 'Edit',
    inviteSent: 'Invite email queued',
    studentDirectory: 'Student directory',
    availabilityPlanner: 'Teacher availability',
    availabilityPlannerSub: 'Review weekly teaching windows before creating lessons',
    weeklyGrid: 'Weekly grid',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    setAvailability: 'Set availability',
    availabilitySaved: 'Availability saved',
    lessonSchedule: 'Lesson schedule',
    lessonScheduleSub: 'Create lessons and review the calendar by teacher or by student',
    newScheduledLesson: 'New scheduled lesson',
    teacherView: 'By teacher',
    studentView: 'By student',
    pickTeacher: 'Pick teacher',
    pickStudent: 'Pick student',
    eligibleTeachers: 'Eligible teachers',
    calendarView: 'Calendar view',
    scheduledLessonSaved: 'Lesson scheduled',
    routeList: 'Routes',
    subRoutes: 'Sub-routes',
    cityDriving: 'City driving',
    highwayDriving: 'Highway driving',
    extraUrbanHills: 'Extra-urban hills',
    parkingPractice: 'Parking practice',
    roundaboutPractice: 'Roundabout practice',
    belt: 'Seat belt',
    mirrors: 'Mirrors',
    priority: 'Priority',
    signs: 'Road signs',
    distances: 'Distances',
    speed: 'Speed',
    horn: 'Horn',
    indicators: 'Indicators',
    brakes: 'Brakes',
    manoeuvresSub: 'Official practical exam checklist - Category B',
    vehicleControl: 'Vehicle control',
    vehicleControlTitle: 'Vehicle control',
    parkingTitle: 'Parking',
    roadManoeuvres: 'Road manoeuvres',
    behaviours: 'Evaluated behaviours',
    base: 'Basic',
    medium: 'Medium',
    hard: 'Hard',
    critical: 'Critical',
    seatMirrors: 'Seat and mirror adjustment',
    clutchBrake: 'Correct clutch and brake use',
    hillStartBrake: 'Hill start with parking brake',
    smoothGears: 'Smooth gear changes',
    parallelStreet: 'Parallel parking on street',
    angleParking: 'Angled parking',
    perpendicularParking: 'Perpendicular parking',
    tightExit: 'Exit from tight parking space',
    doubleRoadUTurn: 'U-turn on two-way road',
    turns: 'Right and left turns at intersections',
    slowVehicleOvertake: 'Overtake slow vehicle',
    roundabout: 'Cross a roundabout',
    systematicMirrors: 'Systematic mirror use',
    signalIndicators: 'Signal with indicators',
    respectPriority: 'Respect right of way',
    laneKeeping: 'Lane keeping',
    swapTitle: 'Instructor slot swap',
    swapSub: 'Request or accept lesson swaps with colleagues',
    newSwap: 'New request',
    incomingRequests: 'Incoming requests',
    oneNew: '1 new',
    reason: 'Reason',
    medicalVisit: 'medical visit',
    accept: 'Accept',
    reject: 'Reject',
    accepted: 'Swap accepted',
    rejected: 'Swap rejected',
    newSwapSent: 'Swap request sent',
    availability: 'Instructor availability',
    contact: 'Contact',
    contactSent: 'Request sent',
    swapHistory: 'Swap history',
    freeMonWed: 'Free: Mon-Wed morning',
    freeThu: 'Free: Thursday afternoon',
    partlyAvailable: 'Partially available',
    completedStatus: 'Completed',
    language: 'Language',
  },
  it: {
    appTitle: 'PatentePro',
    appSubtitle: 'Gestione istruttori',
    instructor: 'Istruttore',
    main: 'Principale',
    admin: 'Admin',
    tools: 'Strumenti',
    dashboard: 'Dashboard',
    students: 'Studenti',
    log: 'Registra lezione',
    settings: 'Impostazioni',
    users: 'Utenti',
    availabilityAdmin: 'Disponibilità',
    schedule: 'Calendario',
    manoeuvres: 'Manovre',
    swap: 'Scambio slot',
    search: 'Cerca studente...',
    newLesson: 'Nuova lezione',
    notificationsNone: 'Notifiche: nessun aggiornamento',
    databaseConnected: 'DB connesso',
    databaseMock: 'Dati mock',
    overview: 'Panoramica',
    overviewSub: 'Mercoledì 22 maggio 2026 - Istruttore: Marco Rossi',
    activeStudents: 'Studenti attivi',
    activeStudentsTrend: '+2 questo mese',
    lessonsToday: 'Lezioni oggi',
    completedTwo: '2 completate',
    readyForExam: 'Pronto per esame',
    readyTrend: 'da 1',
    swapRequests: 'Swap richiesti',
    pending: 'In attesa',
    recentStudents: 'Studenti recenti',
    all: 'Tutti',
    allStudents: 'Tutti gli studenti',
    myStudents: 'Miei',
    examReady: 'Pronto esame',
    name: 'Nome',
    student: 'Studente',
    teacher: 'Istruttore',
    progress: 'Progressi',
    status: 'Stato',
    actions: 'Azioni',
    ageYears: 'anni',
    lessons: 'lezioni',
    last: 'Ultima',
    logAction: '+ Log',
    ready: 'Pronto',
    inProgress: 'In corso',
    start: 'Inizio',
    criticalAreas: 'Aree critiche (tutti gli studenti)',
    parallelParking: 'Parcheggio parallelo',
    uTurn: 'Inversione a U',
    priorityCrossroads: 'Precedenza agli incroci',
    mirrorControl: 'Controllo specchietti',
    safeOvertaking: 'Sorpasso sicuro',
    upcomingLessons: 'Prossime lezioni oggi',
    completed: 'Completata',
    now: 'Adesso',
    inTwoHours: 'Tra 2 ore',
    scheduled: 'Programmata',
    studentsSub: 'Profilo completo e storico lezioni di ogni studente',
    profileDetail: 'Profilo dettagliato',
    manoeuvreEvaluation: 'Valutazione manovre',
    latestNotes: 'Ultime note istruttori',
    hillStart: 'Partenza in salita',
    overtaking: 'Sorpasso',
    motorway: 'Guida in autostrada',
    cityGood: 'Ottima guida in città',
    parkingImprove: 'Migliorare parcheggio parallelo',
    priorityDifficulty: 'Difficoltà con le precedenze',
    vehicleControlNote: 'Buon controllo del veicolo',
    firstLesson: 'Prima lezione positiva',
    parkingGood: 'Ottimo parcheggio parallelo',
    motorwaySpeed: 'Rallentare in autostrada',
    hillStartGood: 'Buona partenza in salita',
    mirrorsOk: 'Specchietti ok',
    priorityOk: 'Precedenze ok',
    steeringWarn: 'Sterzata critica',
    priorityWarn: 'Precedenze critiche',
    clutchOk: 'Frizione ok',
    brakesOk: 'Freni ok',
    attitudeOk: 'Atteggiamento ok',
    parkingOk: 'Parcheggio ok',
    speedWarn: 'Velocità critica',
    logSub: 'Compila il report dopo ogni sessione di guida',
    lessonDetails: 'Dettagli lezione',
    date: 'Data',
    duration: 'Durata (min)',
    routeType: 'Tipo di percorso',
    city: 'Città',
    extraUrban: 'Extraurbano',
    highway: 'Autostrada',
    parking: 'Parcheggio',
    night: 'Notturno',
    generalRating: 'Valutazione generale',
    instructorNotes: 'Note istruttore',
    notesPlaceholder: "Es: buona guida in città, da migliorare l'uso degli specchietti alle rotonde...",
    saveLesson: 'Salva lezione',
    lessonSaved: 'Lezione salvata con successo',
    performedManoeuvres: 'Manovre eseguite',
    vehicleControlCat: 'Controllo veicolo',
    manoeuvresCat: 'Manovre',
    roadCat: 'Strada',
    errors: 'Errori commessi',
    schoolSettings: 'Impostazioni scuola',
    schoolSettingsSub: 'Configura profilo scuola, percorsi cittadini, manovre e tag errore',
    schoolProfile: 'Profilo scuola',
    schoolName: 'Nome scuola',
    cityLabel: 'Città',
    themeColor: 'Colore tema',
    logoUpload: 'Caricamento logo',
    logoUploadHint: 'Trascina il logo',
    routeConfiguration: 'Configurazione percorsi',
    requiresSubSelection: 'Richiede sotto-selezione',
    noSubSelection: 'Nessuna sotto-selezione',
    maneuverCatalog: 'Catalogo manovre',
    errorTagCatalog: 'Catalogo tag errore',
    saveSettings: 'Salva impostazioni',
    settingsSaved: 'Impostazioni salvate',
    userManagement: 'Gestione utenti',
    userManagementSub: 'Invita istruttori e studenti, modifica contatti e disattiva utenti',
    inviteTeacher: 'Invita istruttore',
    inviteStudent: 'Invita studente',
    teachers: 'Istruttori',
    active: 'Attivo',
    invited: 'Invitato',
    deactivate: 'Disattiva',
    edit: 'Modifica',
    inviteSent: 'Email di invito in coda',
    studentDirectory: 'Elenco studenti',
    availabilityPlanner: 'Disponibilità istruttori',
    availabilityPlannerSub: 'Controlla le fasce settimanali prima di creare lezioni',
    weeklyGrid: 'Griglia settimanale',
    mon: 'Lun',
    tue: 'Mar',
    wed: 'Mer',
    thu: 'Gio',
    fri: 'Ven',
    setAvailability: 'Imposta disponibilità',
    availabilitySaved: 'Disponibilità salvata',
    lessonSchedule: 'Calendario lezioni',
    lessonScheduleSub: 'Crea lezioni e consulta il calendario per istruttore o studente',
    newScheduledLesson: 'Nuova lezione programmata',
    teacherView: 'Per istruttore',
    studentView: 'Per studente',
    pickTeacher: 'Seleziona istruttore',
    pickStudent: 'Seleziona studente',
    eligibleTeachers: 'Istruttori disponibili',
    calendarView: 'Vista calendario',
    scheduledLessonSaved: 'Lezione programmata',
    routeList: 'Percorsi',
    subRoutes: 'Sotto-percorsi',
    cityDriving: 'Guida in città',
    highwayDriving: 'Guida in autostrada',
    extraUrbanHills: 'Extraurbano collinare',
    parkingPractice: 'Pratica parcheggio',
    roundaboutPractice: 'Pratica rotonde',
    belt: 'Cintura',
    mirrors: 'Specchietti',
    priority: 'Precedenza',
    signs: 'Segnaletica',
    distances: 'Distanze',
    speed: 'Velocità',
    horn: 'Clacson',
    indicators: 'Frecce',
    brakes: 'Freni',
    manoeuvresSub: 'Checklist ufficiale esame pratico - Patente B',
    vehicleControlTitle: 'Controllo del veicolo',
    parkingTitle: 'Parcheggio',
    roadManoeuvres: 'Manovre stradali',
    behaviours: 'Comportamenti valutati',
    base: 'Base',
    medium: 'Medio',
    hard: 'Difficile',
    critical: 'Critico',
    seatMirrors: 'Regolazione sedile e specchietti',
    clutchBrake: 'Uso corretto frizione e freno',
    hillStartBrake: 'Partenza in salita con freno di stazionamento',
    smoothGears: 'Cambio marce fluido',
    parallelStreet: 'Parcheggio parallelo su strada',
    angleParking: 'Parcheggio a spina',
    perpendicularParking: 'Parcheggio perpendicolare',
    tightExit: 'Uscita da parcheggio stretto',
    doubleRoadUTurn: 'Inversione a U su strada a doppio senso',
    turns: 'Svolte a destra e sinistra in incrocio',
    slowVehicleOvertake: 'Sorpasso di veicolo lento',
    roundabout: 'Attraversamento di rotatoria',
    systematicMirrors: 'Uso sistematico degli specchietti',
    signalIndicators: 'Segnalazione con le frecce',
    respectPriority: 'Rispetto della precedenza',
    laneKeeping: 'Mantenimento corsia',
    swapTitle: 'Scambio slot istruttori',
    swapSub: 'Richiedi o accetta scambi di lezione tra colleghi',
    newSwap: 'Nuova richiesta',
    incomingRequests: 'Richieste in arrivo',
    oneNew: '1 nuova',
    reason: 'Motivo',
    medicalVisit: 'visita medica',
    accept: 'Accetta',
    reject: 'Rifiuta',
    accepted: 'Swap accettato',
    rejected: 'Swap rifiutato',
    newSwapSent: 'Richiesta di swap inviata',
    availability: 'Disponibilità istruttori',
    contact: 'Contatta',
    contactSent: 'Richiesta inviata',
    swapHistory: 'Storico swap',
    freeMonWed: 'Libera: lun-mer mattina',
    freeThu: 'Libero: giovedì pomeriggio',
    partlyAvailable: 'Parzialmente disponibile',
    completedStatus: 'Completato',
    language: 'Lingua',
  },
};

const badgeTone = {
  green: 'bg-success-light text-success',
  warn: 'bg-warn-light text-warn',
  red: 'bg-accent-light text-accent',
  blue: 'bg-brand-light text-brand-mid',
};

function App() {
  const [page, setPage] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const [toast, setToast] = useState('');
  const t = COPY[lang];

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2500);
  };

  const navigate = (nextPage) => setPage(nextPage);

  return (
    <div className="min-h-screen bg-white p-0 sm:p-5 text-ink">
      <div className="flex h-screen min-h-[620px] overflow-hidden border border-line bg-shell sm:h-[calc(100vh-40px)] sm:rounded-[10px]">
        <Sidebar navItems={NAV_ITEMS} page={page} navigate={navigate} t={t} />
        <main className="flex-1 overflow-y-auto">
          <TopHeader lang={lang} setLang={setLang} navigate={navigate} showToast={showToast} t={t} />
          <ActivePage page={page} navigate={navigate} showToast={showToast} t={t} lang={lang} />
        </main>
      </div>
      <Toast message={toast} />
    </div>
  );
}

function Sidebar({ navItems, page, navigate, t }) {
  const sections = useMemo(
    () => navItems.reduce((acc, item) => ({ ...acc, [item.section]: [...(acc[item.section] || []), item] }), {}),
    [navItems],
  );

  return (
    <aside className="hidden w-[200px] shrink-0 flex-col bg-brand text-white md:flex">
      <div className="border-b border-white/10 px-4 pb-3 pt-[18px]">
        <div className="flex items-center gap-2 text-[15px] font-medium">
          <Car size={17} />
          {t.appTitle}
        </div>
        <div className="mt-0.5 text-[11px] text-white/50">{t.appSubtitle}</div>
      </div>
      {Object.entries(sections).map(([section, items]) => (
        <div key={section}>
          <div className="pb-1 pl-3 pt-2.5 text-[10px] uppercase tracking-[0.8px] text-white/35">{t[section]}</div>
          {items.map(({ page: itemPage, icon: Icon }) => (
            <button
              key={itemPage}
              className={`flex w-full items-center gap-2.5 border-l-2 px-4 py-2.5 text-left text-[13px] transition ${
                page === itemPage
                  ? 'border-[#6eb5f5] bg-white/10 text-white'
                  : 'border-transparent text-white/65 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => navigate(itemPage)}
            >
              <Icon size={16} />
              {t[itemPage]}
            </button>
          ))}
        </div>
      ))}
      <div className="flex-1" />
      <div className="m-3 flex items-center gap-2.5 rounded-md bg-white/10 px-3 py-2.5">
        <div className="grid size-8 place-items-center rounded-full bg-[#6eb5f5] text-xs font-medium text-brand">MR</div>
        <div>
          <div className="text-xs font-medium text-white">Marco Rossi</div>
          <div className="text-[11px] text-white/45">{t.instructor}</div>
        </div>
      </div>
    </aside>
  );
}

function TopHeader({ lang, setLang, navigate, showToast, t }) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={15} />
        <input
          className="w-[200px] rounded-md border border-line bg-[#f5f5f5] py-2 pl-8 pr-3 text-[13px] outline-none focus:border-brand-mid"
          placeholder={t.search}
        />
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={isSupabaseConfigured ? 'green' : 'warn'}>
          {isSupabaseConfigured ? t.databaseConnected : t.databaseMock}
        </Badge>
        <SegmentedLanguage lang={lang} setLang={setLang} t={t} />
        <IconButton label="Notifications" onClick={() => showToast(t.notificationsNone)}>
          <Bell size={16} />
        </IconButton>
        <Button primary onClick={() => navigate('log')}>
          <Plus size={16} />
          {t.newLesson}
        </Button>
      </div>
    </header>
  );
}

function SegmentedLanguage({ lang, setLang, t }) {
  return (
    <div className="flex rounded-full border border-line bg-white p-0.5" aria-label={t.language}>
      {['en', 'it'].map((code) => (
        <button
          key={code}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${lang === code ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ActivePage({ page, navigate, showToast, t, lang }) {
  if (page === 'students') return <StudentsPage navigate={navigate} t={t} lang={lang} />;
  if (page === 'log') return <LessonLogPage showToast={showToast} t={t} />;
  if (page === 'settings') return <SettingsPage showToast={showToast} t={t} />;
  if (page === 'users') return <UsersPage showToast={showToast} t={t} lang={lang} />;
  if (page === 'availabilityAdmin') return <AvailabilityAdminPage showToast={showToast} t={t} />;
  if (page === 'schedule') return <SchedulePage showToast={showToast} t={t} />;
  if (page === 'manoeuvres') return <ManoeuvresPage t={t} />;
  if (page === 'swap') return <SwapPage showToast={showToast} t={t} />;
  return <DashboardPage navigate={navigate} t={t} />;
}

function DashboardPage({ navigate, t }) {
  const critical = [
    ['parallelParking', 72, 'bg-accent'],
    ['uTurn', 61, 'bg-warn'],
    ['priorityCrossroads', 48, 'bg-warn'],
    ['mirrorControl', 38, 'bg-brand-mid'],
    ['safeOvertaking', 25, 'bg-success'],
  ];

  return (
    <Page>
      <PageHeader title={t.overview} subtitle={t.overviewSub} />
      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t.activeStudents} value="12" badge={t.activeStudentsTrend} tone="green" />
        <MetricCard label={t.lessonsToday} value="4" badge={t.completedTwo} tone="blue" />
        <MetricCard label={t.readyForExam} value="3" badge={t.readyTrend} tone="green" />
        <MetricCard label={t.swapRequests} value="1" badge={t.pending} tone="warn" />
      </div>
      <TwoColumnGrid>
        <Card title={t.recentStudents} action={<Button small onClick={() => navigate('students')}>{t.all} <ArrowRight size={14} /></Button>}>
          <StudentTableHeader compact t={t} />
          {STUDENTS.slice(0, 3).map((student) => (
            <StudentRow key={student.name} student={student} t={t} compact onClick={() => navigate('students')} onLog={() => navigate('log')} />
          ))}
        </Card>
        <Card title={t.criticalAreas}>
          <div className="flex flex-col gap-2.5 p-4">
            {critical.map(([key, percent, color]) => (
              <div key={key} className="flex items-center justify-between gap-4 text-[13px]">
                <span>{t[key]}</span>
                <div className="flex w-[150px] items-center gap-2">
                  <ProgressBar percent={percent} color={color} />
                  <span className="w-8 text-right text-[11px] text-muted">{percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TwoColumnGrid>
      <Card title={t.upcomingLessons}>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          <LessonSlot time="09:00" student="Giulia Ferretti" status={t.completed} tone="success" />
          <LessonSlot time="11:00" student="Luca Bianchi" status={t.completed} tone="success" />
          <LessonSlot time={`14:00 - ${t.now}`} student="Marco Verdi" status={t.inTwoHours} tone="warn" highlight />
          <LessonSlot time="16:30" student="Anna Moretti" status={t.scheduled} tone="muted" />
        </div>
      </Card>
    </Page>
  );
}

function StudentsPage({ navigate, t, lang }) {
  const [selectedStudent, setSelectedStudent] = useState(null);

  return (
    <Page>
      <PageHeader
        title={t.students}
        subtitle={t.studentsSub}
        action={
          <div className="flex flex-wrap gap-1">
            <Pill active>{t.allStudents} (12)</Pill>
            <Pill>{t.myStudents} (8)</Pill>
            <Pill>{t.examReady} (3)</Pill>
          </div>
        }
      />
      <Card>
        <StudentTableHeader t={t} />
        {STUDENTS.map((student) => (
          <StudentRow
            key={student.name}
            student={student}
            t={t}
            lang={lang}
            onClick={() => setSelectedStudent(student)}
            onLog={() => navigate('log')}
          />
        ))}
      </Card>
      {selectedStudent && <StudentDetailPanel student={selectedStudent} t={t} onClose={() => setSelectedStudent(null)} />}
    </Page>
  );
}

function LessonLogPage({ showToast, t }) {
  const [routes, setRoutes] = useState(new Set(['city']));
  const [errors, setErrors] = useState(new Set(['mirrors', 'distances']));
  const [rating, setRating] = useState(3);
  const [selectedManoeuvres, setSelectedManoeuvres] = useState(new Set());
  const routeKeys = ['city', 'extraUrban', 'highway', 'parking', 'night'];
  const errorKeys = ['belt', 'mirrors', 'priority', 'signs', 'distances', 'speed', 'horn', 'indicators', 'brakes', 'overtaking'];
  const manoeuvres = [
    ['hillStart', 'vehicleControlCat', 3],
    ['parallelParking', 'parking', 2],
    ['uTurn', 'manoeuvresCat', 4],
    ['safeOvertaking', 'roadCat', 5],
  ];

  const toggleSet = (setter, key) => {
    setter((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <Page>
      <PageHeader title={t.log} subtitle={t.logSub} />
      <TwoColumnGrid>
        <Card title={t.lessonDetails}>
          <div className="flex flex-col gap-3 p-4">
            <Field label={t.student}>
              <select className={fieldClass}>
                {STUDENTS.map((student) => <option key={student.name}>{student.name}</option>)}
              </select>
            </Field>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label={t.date}><input className={fieldClass} type="date" defaultValue="2026-05-22" /></Field>
              <Field label={t.duration}><input className={fieldClass} type="number" defaultValue="50" min="30" max="120" /></Field>
            </div>
            <Field label={t.routeType}>
              <div className="flex flex-wrap gap-1.5">
                {routeKeys.map((key) => <Tag key={key} active={routes.has(key)} onClick={() => toggleSet(setRoutes, key)}>{t[key]}</Tag>)}
              </div>
            </Field>
            <Field label={t.generalRating}><Stars value={rating} onChange={setRating} /></Field>
            <Field label={t.instructorNotes}><textarea className={`${fieldClass} h-[68px] resize-none`} placeholder={t.notesPlaceholder} /></Field>
            <Button primary onClick={() => showToast(`${t.lessonSaved} ✓`)}>
              <Save size={16} />
              {t.saveLesson}
            </Button>
          </div>
        </Card>
        <div>
          <Card title={t.performedManoeuvres}>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {manoeuvres.map(([name, category, stars]) => (
                <button
                  key={name}
                  className={`flex items-center justify-between rounded-md border p-3 text-left transition ${
                    selectedManoeuvres.has(name) ? 'border-brand-mid bg-brand-light' : 'border-line bg-white hover:border-brand-mid'
                  }`}
                  onClick={() => toggleSet(setSelectedManoeuvres, name)}
                >
                  <span>
                    <span className="block text-[13px]">{t[name]}</span>
                    <span className="block text-[11px] text-muted">{t[category]}</span>
                  </span>
                  <Stars value={stars} readonly />
                </button>
              ))}
            </div>
          </Card>
          <Card title={t.errors}>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {errorKeys.map((key) => <Tag key={key} error active={errors.has(key)} onClick={() => toggleSet(setErrors, key)}>{t[key]}</Tag>)}
              </div>
            </div>
          </Card>
        </div>
      </TwoColumnGrid>
    </Page>
  );
}

function SettingsPage({ showToast, t }) {
  const maneuvers = ['hillStart', 'parallelParking', 'uTurn', 'safeOvertaking', 'motorway'];
  const errorTags = ['mirrors', 'priority', 'distances', 'speed', 'brakes', 'indicators'];

  return (
    <Page>
      <PageHeader
        title={t.schoolSettings}
        subtitle={t.schoolSettingsSub}
        action={<Button primary onClick={() => showToast(`${t.settingsSaved} ✓`)}><Save size={16} />{t.saveSettings}</Button>}
      />
      <TwoColumnGrid>
        <Card title={t.schoolProfile}>
          <div className="grid gap-3 p-4">
            <Field label={t.schoolName}><input className={fieldClass} defaultValue="Autoscuola Genova Centro" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.cityLabel}>
                <select className={fieldClass} defaultValue="Genova">
                  <option>Genova</option>
                  <option>Milano</option>
                  <option>Torino</option>
                </select>
              </Field>
              <Field label={t.themeColor}><input className={fieldClass} type="color" defaultValue="#1a3a5c" /></Field>
            </div>
            <Field label={t.logoUpload}>
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-line bg-[#f5f5f5] text-sm text-muted">
                {t.logoUploadHint}
              </div>
            </Field>
          </div>
        </Card>
        <Card title={t.routeConfiguration}>
          <div className="divide-y divide-line">
            {CITY_ROUTES.map((route) => (
              <div key={route.type} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-medium">{t[route.type]}</div>
                  <Badge tone={route.subTypes.length ? 'warn' : 'green'}>
                    {route.subTypes.length ? t.requiresSubSelection : t.noSubSelection}
                  </Badge>
                </div>
                {route.subTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {route.subTypes.map((subType) => <Tag key={subType} passive active>{subType}</Tag>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </TwoColumnGrid>
      <TwoColumnGrid>
        <Card title={t.maneuverCatalog}>
          <div className="flex flex-wrap gap-1.5 p-4">
            {maneuvers.map((key) => <Tag key={key} passive active>{t[key]}</Tag>)}
          </div>
        </Card>
        <Card title={t.errorTagCatalog}>
          <div className="flex flex-wrap gap-1.5 p-4">
            {errorTags.map((key) => <Tag key={key} passive error active>{t[key]}</Tag>)}
          </div>
        </Card>
      </TwoColumnGrid>
    </Page>
  );
}

function UsersPage({ showToast, t, lang }) {
  return (
    <Page>
      <PageHeader
        title={t.userManagement}
        subtitle={t.userManagementSub}
        action={
          <div className="flex gap-2">
            <Button onClick={() => showToast(t.inviteSent)}><Plus size={16} />{t.inviteStudent}</Button>
            <Button primary onClick={() => showToast(t.inviteSent)}><UserPlus size={16} />{t.inviteTeacher}</Button>
          </div>
        }
      />
      <Card title={t.teachers}>
        <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_1fr_130px] gap-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid">
          <span>{t.name}</span>
          <span>Email</span>
          <span>Phone</span>
          <span>{t.status}</span>
          <span>{t.actions}</span>
        </div>
        {TEACHERS.map((teacher) => (
          <div key={teacher.email} className="grid gap-3 border-b border-line px-4 py-3 text-[13px] last:border-b-0 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr_130px] lg:items-center">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-brand-light text-xs font-medium text-brand">{teacher.initials}</div>
              <div>
                <div className="font-medium">{teacher.name}</div>
                <div className="text-[11px] text-muted">{teacher.lessonsToday} {t.lessonsToday.toLowerCase()}</div>
              </div>
            </div>
            <div className="text-muted">{teacher.email}</div>
            <div className="text-muted">{teacher.phone}</div>
            <Badge tone={teacher.status === 'active' ? 'green' : 'warn'}>{t[teacher.status]}</Badge>
            <div className="flex gap-1.5">
              <Button small>{t.edit}</Button>
              <Button small>{t.deactivate}</Button>
            </div>
          </div>
        ))}
      </Card>
      <Card title={t.studentDirectory}>
        {STUDENTS.map((student) => (
          <div key={student.name} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 text-[13px] last:border-b-0">
            <div>
              <div className="font-medium">{student.name}</div>
              <div className="text-[11px] text-muted">{student.age} {t.ageYears} - {student.lessons} {t.lessons} - {t.last}: {student.lastLesson[lang]}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={student.status === 'ready' ? 'green' : student.status === 'inProgress' ? 'warn' : 'blue'}>{t[student.status]}</Badge>
              <Button small>{t.edit}</Button>
            </div>
          </div>
        ))}
      </Card>
    </Page>
  );
}

function AvailabilityAdminPage({ showToast, t }) {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];

  return (
    <Page>
      <PageHeader
        title={t.availabilityPlanner}
        subtitle={t.availabilityPlannerSub}
        action={<Button primary onClick={() => showToast(`${t.availabilitySaved} ✓`)}><Save size={16} />{t.setAvailability}</Button>}
      />
      <Card title={t.weeklyGrid}>
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[180px_repeat(5,1fr)] border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted">
              <span>{t.teacher}</span>
              {days.map((day) => <span key={day}>{t[day]}</span>)}
            </div>
            {ADMIN_AVAILABILITY.map((row) => (
              <div key={row.teacher} className="grid grid-cols-[180px_repeat(5,1fr)] border-b border-line px-4 py-3 text-[13px] last:border-b-0">
                <div className="font-medium">{row.teacher}</div>
                {days.map((day) => (
                  <button
                    key={day}
                    className={`mr-2 rounded-md border px-2 py-1.5 text-left text-xs ${
                      row[day] === '-' ? 'border-line bg-[#f5f5f5] text-muted' : 'border-success bg-success-light text-success'
                    }`}
                    onClick={() => showToast(t.availabilitySaved)}
                  >
                    {row[day]}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>
      <TwoColumnGrid>
        <Card title={t.eligibleTeachers}>
          {TEACHERS.filter((teacher) => teacher.status === 'active').map((teacher) => (
            <InstructorRow key={teacher.email} name={teacher.name} availability={`${teacher.lessonsToday} ${t.lessonsToday.toLowerCase()}`} tone="green" t={t} showToast={showToast} />
          ))}
        </Card>
        <Card title={t.routeConfiguration}>
          <div className="p-4 text-[13px] text-muted">
            {CITY_ROUTES.length} {t.routeList.toLowerCase()} - {CITY_ROUTES.filter((route) => route.subTypes.length).length} {t.subRoutes.toLowerCase()}
          </div>
        </Card>
      </TwoColumnGrid>
    </Page>
  );
}

function SchedulePage({ showToast, t }) {
  const [view, setView] = useState('teacherView');

  return (
    <Page>
      <PageHeader
        title={t.lessonSchedule}
        subtitle={t.lessonScheduleSub}
        action={
          <div className="flex gap-1">
            <Pill active={view === 'teacherView'} onClick={() => setView('teacherView')}>{t.teacherView}</Pill>
            <Pill active={view === 'studentView'} onClick={() => setView('studentView')}>{t.studentView}</Pill>
          </div>
        }
      />
      <TwoColumnGrid>
        <Card title={t.newScheduledLesson}>
          <div className="grid gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.date}><input className={fieldClass} type="date" defaultValue="2026-05-22" /></Field>
              <Field label={t.duration}>
                <select className={fieldClass} defaultValue="60">
                  <option value="30">30</option>
                  <option value="45">45</option>
                  <option value="60">60</option>
                  <option value="90">90</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.pickTeacher}>
                <select className={fieldClass}>{TEACHERS.filter((teacher) => teacher.status === 'active').map((teacher) => <option key={teacher.email}>{teacher.name}</option>)}</select>
              </Field>
              <Field label={t.pickStudent}>
                <select className={fieldClass}>{STUDENTS.map((student) => <option key={student.name}>{student.name}</option>)}</select>
              </Field>
            </div>
            <Button primary onClick={() => showToast(`${t.scheduledLessonSaved} ✓`)}><Plus size={16} />{t.newScheduledLesson}</Button>
          </div>
        </Card>
        <Card title={t.eligibleTeachers}>
          {TEACHERS.filter((teacher) => teacher.status === 'active').map((teacher) => (
            <div key={teacher.email} className="flex items-center justify-between border-b border-line px-4 py-3 text-[13px] last:border-b-0">
              <div>
                <div className="font-medium">{teacher.name}</div>
                <div className="text-[11px] text-muted">{teacher.email}</div>
              </div>
              <Badge tone="green">{t.active}</Badge>
            </div>
          ))}
        </Card>
      </TwoColumnGrid>
      <Card title={`${t.calendarView} - ${t[view]}`}>
        <div className="grid border-b border-line bg-[#f5f5f5] px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid-cols-[90px_1.4fr_1.4fr_1fr_1fr]">
          <span>Time</span>
          <span>{t.teacher}</span>
          <span>{t.student}</span>
          <span>{t.duration}</span>
          <span>{t.status}</span>
        </div>
        {LESSONS.map((lesson) => (
          <div key={`${lesson.time}-${lesson.student}`} className="grid gap-2 border-b border-line px-4 py-3 text-[13px] last:border-b-0 lg:grid-cols-[90px_1.4fr_1.4fr_1fr_1fr] lg:items-center">
            <div className="font-medium text-brand-mid">{lesson.time}</div>
            <div>{view === 'teacherView' ? lesson.teacher : lesson.student}</div>
            <div className="text-muted">{view === 'teacherView' ? lesson.student : lesson.teacher}</div>
            <div className="text-muted">{lesson.duration} min</div>
            <Badge tone={lesson.status === 'completed' ? 'green' : 'blue'}>{t[lesson.status]}</Badge>
          </div>
        ))}
      </Card>
    </Page>
  );
}

function ManoeuvresPage({ t }) {
  const cards = [
    [Car, 'vehicleControlTitle', [['seatMirrors', 'green', 'base'], ['clutchBrake', 'green', 'base'], ['hillStartBrake', 'warn', 'medium'], ['smoothGears', 'green', 'base']]],
    [ParkingCircle, 'parkingTitle', [['parallelStreet', 'red', 'hard'], ['angleParking', 'warn', 'medium'], ['perpendicularParking', 'warn', 'medium'], ['tightExit', 'red', 'hard']]],
    [Route, 'roadManoeuvres', [['doubleRoadUTurn', 'red', 'hard'], ['turns', 'warn', 'medium'], ['slowVehicleOvertake', 'red', 'hard'], ['roundabout', 'warn', 'medium']]],
    [Eye, 'behaviours', [['systematicMirrors', 'red', 'critical'], ['signalIndicators', 'red', 'critical'], ['respectPriority', 'red', 'critical'], ['laneKeeping', 'warn', 'medium']]],
  ];

  return (
    <Page>
      <PageHeader title={`${t.manoeuvres} & ${t.examReady}`} subtitle={t.manoeuvresSub} />
      <TwoColumnGrid>
        {cards.map(([Icon, title, rows]) => (
          <Card key={title} title={<span className="flex items-center gap-2"><Icon size={16} /> {t[title]}</span>}>
            <div className="flex flex-col px-4 py-3 text-[13px]">
              {rows.map(([label, tone, level], index) => (
                <div key={label} className={`flex items-center justify-between gap-3 py-2 ${index < rows.length - 1 ? 'border-b border-line' : ''}`}>
                  <span>{t[label]}</span>
                  <Badge tone={tone}>{t[level]}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </TwoColumnGrid>
    </Page>
  );
}

function SwapPage({ showToast, t }) {
  return (
    <Page>
      <PageHeader
        title={t.swapTitle}
        subtitle={t.swapSub}
        action={<Button primary onClick={() => showToast(`${t.newSwapSent} ✓`)}><Plus size={16} />{t.newSwap}</Button>}
      />
      <TwoColumnGrid>
        <Card title={t.incomingRequests} action={<Badge tone="warn">{t.oneNew}</Badge>}>
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[13px]">
            <Dot tone="warn" />
            <div className="flex-1">
              <div className="font-medium">Federica Marino → Marco Rossi</div>
              <div className="mt-0.5 text-[11px] text-muted">Friday, 24 May - 10:00 - {t.student}: Sara Conti</div>
              <div className="mt-0.5 text-[11px] text-warn">{t.reason}: {t.medicalVisit}</div>
            </div>
            <div className="flex gap-1.5">
              <Button small success onClick={() => showToast(`${t.accepted} ✓`)}>{t.accept}</Button>
              <Button small onClick={() => showToast(t.rejected)}>{t.reject}</Button>
            </div>
          </div>
        </Card>
        <Card title={t.availability}>
          <InstructorRow name="Federica Marino" availability={t.freeMonWed} tone="green" t={t} showToast={showToast} />
          <InstructorRow name="Luigi Costa" availability={t.freeThu} tone="green" t={t} showToast={showToast} />
          <InstructorRow name="Giorgio Esposito" availability={t.partlyAvailable} tone="warn" t={t} showToast={showToast} />
        </Card>
      </TwoColumnGrid>
      <Card title={t.swapHistory}>
        <HistoryRow text={`16 May - Marco Rossi ↔ Luigi Costa - ${t.student}: Anna Moretti - ${t.completedStatus}`} />
        <HistoryRow text={`10 May - Federica Marino ↔ Marco Rossi - ${t.student}: Luca Bianchi - ${t.completedStatus}`} />
      </Card>
    </Page>
  );
}

function StudentDetailPanel({ student, t, onClose }) {
  return (
    <Card
      title={`${student.name} - ${t.profileDetail}`}
      action={<IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <section>
          <SectionLabel>{t.manoeuvreEvaluation}</SectionLabel>
          <div className="flex flex-col gap-2 text-xs">
            {student.manoeuvres.map(([name, stars]) => (
              <div key={name} className="flex items-center justify-between gap-3">
                <span>{t[name]}</span>
                <Stars value={stars} readonly />
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionLabel>{t.latestNotes}</SectionLabel>
          <div className="py-1">
            {student.notes.map((note, index) => (
              <div key={`${note.title}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                {index < student.notes.length - 1 && <div className="absolute left-[4px] top-3 h-[calc(100%-8px)] w-px bg-line" />}
                <Dot tone={note.tone === 'good' ? 'green' : 'warn'} />
                <div>
                  <div className="text-[13px] font-medium">{t[note.title]}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{note.meta}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {note.tags.map(([label, tone]) => <Tag key={label} passive active={!false} tone={tone}>{t[label]}</Tag>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Card>
  );
}

function StudentTableHeader({ compact, t }) {
  const first = compact ? t.name : t.student;
  return (
    <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_80px] gap-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid">
      <span>{first}</span>
      <span>{t.teacher}</span>
      <span>{t.progress}</span>
      <span>{t.status}</span>
      <span>{compact ? '' : t.actions}</span>
    </div>
  );
}

function StudentRow({ student, t, lang, compact, onClick, onLog }) {
  const tone = student.status === 'ready' ? 'green' : student.status === 'inProgress' ? 'warn' : 'blue';

  return (
    <button className="grid w-full gap-3 border-b border-line px-4 py-3 text-left text-[13px] transition last:border-b-0 hover:bg-[#f5f5f5] lg:grid-cols-[2fr_1.2fr_1fr_1fr_80px] lg:items-center" onClick={onClick}>
      <div>
        <div className="font-medium">{student.name}</div>
        <div className="mt-0.5 text-[11px] text-muted">
          {student.age} {t.ageYears} - {student.lessons} {t.lessons}
          {!compact && ` - ${t.last}: ${student.lastLesson[lang || 'en']}`}
        </div>
      </div>
      <div className="text-xs text-muted">{student.instructor}</div>
      <div className="flex items-center gap-2">
        <ProgressBar percent={student.progress} tone={student.progressClass} />
        <span className="w-8 text-[11px] text-muted">{student.progress}%</span>
      </div>
      <Badge tone={tone}>{t[student.status]}</Badge>
      <span
        className="inline-flex w-fit items-center rounded-md border border-line bg-white px-2 py-1 text-xs hover:bg-[#f5f5f5]"
        onClick={(event) => {
          event.stopPropagation();
          onLog();
        }}
      >
        {compact ? 'Log' : t.logAction}
      </span>
    </button>
  );
}

function MetricCard({ label, value, badge, tone }) {
  return (
    <div className="rounded-md border border-line bg-white p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-medium">{value}</div>
      <Badge tone={tone}>{badge}</Badge>
    </div>
  );
}

function LessonSlot({ time, student, status, tone, highlight }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'warn' ? 'text-warn' : 'text-muted';
  return (
    <div className={`px-3.5 py-3 ${highlight ? 'bg-brand-light' : ''}`}>
      <div className="mb-1.5 text-[11px] text-brand-mid">{time}</div>
      <div className={`text-[13px] font-medium ${highlight ? 'text-brand' : ''}`}>{student}</div>
      <div className={`mt-0.5 text-[11px] ${toneClass}`}>{tone === 'success' ? '✓ ' : ''}{status}</div>
    </div>
  );
}

function InstructorRow({ name, availability, tone, t, showToast }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[13px] last:border-b-0">
      <Dot tone={tone} />
      <div className="flex-1">
        <div className="font-medium">{name}</div>
        <div className="text-[11px] text-muted">{availability}</div>
      </div>
      <Button small onClick={() => showToast(t.contactSent)}>{t.contact}</Button>
    </div>
  );
}

function HistoryRow({ text }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[13px] last:border-b-0">
      <Dot tone="green" />
      <div className="flex-1">{text}</div>
    </div>
  );
}

function Page({ children }) {
  return <div className="p-5">{children}</div>;
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function TwoColumnGrid({ children }) {
  return <div className="mb-3.5 grid gap-3.5 xl:grid-cols-2">{children}</div>;
}

function Card({ title, action, children }) {
  return (
    <section className="mb-3.5 overflow-hidden rounded-[10px] border border-line bg-white">
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="text-sm font-medium">{title}</div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function Button({ children, primary, small, success, onClick }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3.5 py-2 text-[13px] transition ${
        small ? 'px-2.5 py-1.5 text-xs' : ''
      } ${
        primary
          ? 'border-brand bg-brand text-white hover:border-brand-mid hover:bg-brand-mid'
          : success
            ? 'border-success bg-white text-success hover:bg-success-light'
            : 'border-line bg-white text-ink hover:bg-[#f5f5f5]'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function IconButton({ label, children, onClick }) {
  return (
    <button
      className="inline-grid size-9 place-items-center rounded-md border border-line bg-white text-ink transition hover:bg-[#f5f5f5]"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Badge({ tone = 'blue', children }) {
  return <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] ${badgeTone[tone]}`}>{children}</span>;
}

function ProgressBar({ percent, color, tone }) {
  const toneClass = color || (tone === 'good' ? 'bg-success' : tone === 'warn' ? 'bg-warn' : 'bg-brand-mid');
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f5f5f5]">
      <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function Stars({ value, onChange, readonly }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={`text-base leading-none ${star <= value ? 'text-[#e6a817]' : 'text-line'} ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          aria-label={`${star} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function Tag({ children, active, error, passive, tone, onClick }) {
  const activeClass = error
    ? 'border-accent bg-accent-light text-accent'
    : tone
      ? `${badgeTone[tone]} border-transparent`
      : 'border-brand-mid bg-brand-light text-brand-mid';
  return (
    <button
      type="button"
      className={`rounded-full border px-2.5 py-1 text-xs ${active ? activeClass : 'border-line bg-white text-muted'} ${passive ? 'cursor-default' : ''}`}
      onClick={passive ? undefined : onClick}
    >
      {children}
    </button>
  );
}

function Pill({ children, active, onClick }) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-xs ${active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Dot({ tone }) {
  const color = tone === 'green' ? 'bg-success' : 'bg-warn';
  return <span className={`mt-1 size-2.5 shrink-0 rounded-full ${color}`} />;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function SectionLabel({ children }) {
  return <div className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted">{children}</div>;
}

function Toast({ message }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-md bg-brand px-4 py-2.5 text-[13px] text-white transition ${
      message ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
    }`}>
      {message}
    </div>
  );
}

const fieldClass = 'w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid';

export default App;
