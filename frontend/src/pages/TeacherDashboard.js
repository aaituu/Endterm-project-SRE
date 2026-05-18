import React, { useEffect, useState, useCallback } from 'react';
import api, { getImageUrl } from '../utils/api.js';
import StudentWorkPanel from '../components/StudentWorkPanel.js';

/* =====================================================================
   ICON MAP — иконки для каждого раздела (emoji / FA class)
   ===================================================================== */
const SECTION_ICONS = {
  'Тапсырмалар':              { icon: 'fa-clipboard-list', color: '#3b5bdb', bg: '#e7f5ff' },
  'Класс ақпараттары':        { icon: 'fa-chalkboard-teacher', color: '#2f9e44', bg: '#ebfbee' },
  'Жарыс жетістіктерім':      { icon: 'fa-trophy', color: '#e67700', bg: '#fff9db' },
  'Айлық жоспарларым':        { icon: 'fa-calendar-alt', color: '#7048e8', bg: '#f3f0ff' },
  'Менің аттестацияларым':    { icon: 'fa-file-alt', color: '#c92a2a', bg: '#fff5f5' },
  'Курстар':                  { icon: 'fa-certificate', color: '#0f766e', bg: '#ccfbf1' },
  'Тәрбиешің ұяшығы':         { icon: 'fa-user-graduate', color: '#2f9e44', bg: '#ebfbee' },
  'Кітапхана':                { icon: 'fa-book', color: '#1971c2', bg: '#e7f5ff' },
  'Оқушы мамандығы':          { icon: 'fa-graduation-cap', color: '#7048e8', bg: '#f3f0ff' },
  'Дарынды оқушылар':         { icon: 'fa-star', color: '#e67700', bg: '#fff9db' },
  'Марапаттар':               { icon: 'fa-award', color: '#c92a2a', bg: '#fff5f5' },
  'Менің материалдарым':      { icon: 'fa-folder-open', color: '#2f9e44', bg: '#ebfbee' },
  'Оқушылармен қосымша жұмыс': { icon: 'fa-users', color: '#7048e8', bg: '#f3f0ff' },
  'ҚМЖ':                      { icon: 'fa-calendar-check', color: '#1971c2', bg: '#e7f5ff' },
  'Жеке жетістіктерім':       { icon: 'fa-medal', color: '#e67700', bg: '#fff9db' },
  'Сабаққа ену':              { icon: 'fa-door-open', color: '#c92a2a', bg: '#fff5f5' },
  'Менің рейтингім':          { icon: 'fa-chart-line', color: '#7048e8', bg: '#f3f0ff' },
  'Іс-шаралар':               { icon: 'fa-calendar-day', color: '#1971c2', bg: '#e7f5ff' },
  'Профиль өзгерту':          { icon: 'fa-user-cog', color: '#495057', bg: '#f8f9fa' },
};

const ALL_SECTIONS = Object.keys(SECTION_ICONS);

const STATUS_LABELS = {
  completed:   { label: 'Орындалды',    color: '#2f9e44', bg: '#ebfbee' },
  in_progress: { label: 'Орындалуда',   color: '#1971c2', bg: '#e7f5ff' },
  not_started: { label: 'Басталмады',   color: '#868e96', bg: '#f8f9fa' },
  overdue:     { label: 'Мерзімі өткен',color: '#c92a2a', bg: '#fff5f5' },
};

const PRIORITY_LABELS = {
  high:   { label: 'Жоғары', color: '#c92a2a', bg: '#fff5f5' },
  medium: { label: 'Средний', color: '#e67700', bg: '#fff9db' },
  low:    { label: 'Төмен',  color: '#2f9e44', bg: '#ebfbee' },
};

function statusBadge(status) {
  const s = STATUS_LABELS[status] || { label: status || '—', color: '#495057', bg: '#f8f9fa' };
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: s.color, background: s.bg
    }}>{s.label}</span>
  );
}

function priorityBadge(p) {
  const pr = PRIORITY_LABELS[p] || { label: p || '—', color: '#495057', bg: '#f8f9fa' };
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: pr.color, background: pr.bg
    }}>{pr.label}</span>
  );
}

function formatKZ(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(' г.', ' жыл');
}

function shortDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const months = ['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
  return `${dt.getFullYear()} ж. ${dt.getDate()} ${months[dt.getMonth()]}`;
}

/* ===================================================================== */
const TeacherDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('Тапсырмалар');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Тапсырмалар ── */
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, in_progress: 0, overdue: 0 });
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskNote, setTaskNote] = useState('');
  const [taskFile, setTaskFile] = useState(null);
  const [savingTask, setSavingTask] = useState(false);

  /* ── Жетістіктер ── */
  const [competitions, setCompetitions] = useState([]);       // жеке жарыс жетістіктері
  const [preparations, setPreparations] = useState([]);      // олимпиадаға дайындық
  const [compTypes, setCompTypes]     = useState([]);
  const [compNames, setCompNames]     = useState([]);
  const [compLevels, setCompLevels]   = useState([]);
  const [students, setStudents]       = useState([]);
  const [showCompForm, setShowCompForm] = useState(false);
  const [showPrepForm, setShowPrepForm] = useState(false);

  const [compForm, setCompForm] = useState({
    competition_type_id: '',
    competition_name_id: '',
    level_id: '',
    date: new Date().toISOString().slice(0, 10),
    participants: [{ student_id: '', place: '', file: null }]
  });
  const [prepForm, setPrepForm] = useState({
    student_id: '',
    competition_type: '',
    competition_subtype: ''
  });

  /* ── Рейтинг / статистика ── */
  const [ratingData, setRatingData] = useState(null);
  const [teacherStats, setTeacherStats] = useState({
    events_count: 0,
    gifted_students: 0,
    entering_lessons: 0,
    today_present_count: 0,
    today_late_count: 0,
    today_absent_count: 0,
    today_attendance_total: 0
  });
  const [studentReports, setStudentReports] = useState([]);
  const [monthlyPlans, setMonthlyPlans] = useState([]);
  const [qmgItems, setQmgItems] = useState([]);
  const [lessonVisits, setLessonVisits] = useState([]);
  const [events, setEvents] = useState([]);
  const [ratingRows, setRatingRows] = useState([]);
  const [sectionBusy, setSectionBusy] = useState(false);
  const [attestations, setAttestations] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseFiles, setCourseFiles] = useState([]);
  const [courseForm, setCourseForm] = useState({
    title: '',
    topic: '',
    provider: '',
    description: '',
    started_at: '',
    finished_at: '',
    next_training_at: ''
  });
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState([]);
  const [homeroom, setHomeroom] = useState({ is_homeroom: false, classData: null, students: [] });
  const [planForm, setPlanForm] = useState({ title: '', month: '', tasks: [{ title: '', start_date: '', deadline: '' }] });
  const [attTypes, setAttTypes] = useState([]);
  const [attForm, setAttForm] = useState({ type_id: '', issued_at: '', document_url: '' });
  const [reportForm, setReportForm] = useState({ report_type: 'gifted', report_date: '', subject_id: '', topic: '', task_type: '', feedback: '', results: [] });
  const [subjects, setSubjects] = useState([]);
  const [qmgFormOpen, setQmgFormOpen] = useState(false);
  const [qmgDetail, setQmgDetail] = useState(null);
  const [qmgForm, setQmgForm] = useState({ title: '', subject_id: '', class_category: '', duration_mins: 45 });
  const [achievementForm, setAchievementForm] = useState({ student_id: '', competition_name: '', description: '', achievement_type: '', level: '', achievement_date: '', place_rank: '' });
  const [materialFormOpen, setMaterialFormOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: '', subject_id: '', direction: '', class_category: '' });
  const [reservations, setReservations] = useState([]);
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationForm, setReservationForm] = useState({ book_id: '', user_id: '', borrow_date: '', return_date: '', status: 'issued', user_search: '' });
  const [reservationUsers, setReservationUsers] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportResults, setSupportResults] = useState([]);
  const [selectedSupportStudent, setSelectedSupportStudent] = useState(null);
  const [planDetail, setPlanDetail] = useState(null);
  const [awardForm, setAwardForm] = useState({ student_id: '', award_type: '', reason: '', reg_number: '', award_date: '' });
  const [visitForm, setVisitForm] = useState({
    visit_date: '',
    visited_teacher_id: '',
    subject_id: '',
    class_id: '',
    lesson_type: 'Ашық сабақ',
    students_total: '',
    students_present: '',
    topic: '',
    qmg_standard: '',
    organization: '',
    homework_check: '',
    teacher_communication: '',
    new_topic_explanation: '',
    topic_reveal: '',
    methods_used: '',
    task_level: '',
    feedback_given: '',
    overall_conclusion: ''
  });
  const [visitTeachers, setVisitTeachers] = useState([]);
  const [visitSubjects, setVisitSubjects] = useState([]);
  const [visitClasses, setVisitClasses] = useState([]);
  const [visitPhoto, setVisitPhoto] = useState(null);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', date: '', time: '', location: '', event_type_id: '' });
  const [eventTypes, setEventTypes] = useState([]);
  const [supportModal, setSupportModal] = useState('');
  const [classView, setClassView] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', iin: '', position: '', current_password: '', new_password: '', confirm_password: '' });
  const [profileTeacher, setProfileTeacher] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramLink, setTelegramLink] = useState(null);
  const [rolesMap, setRolesMap] = useState({});
  const prettyLabel = { fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '.02em' };
  const prettyInput = { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#f8fafc', fontSize: 14 };

  const showToast = useCallback((message, type = 'info') => {
    const existing = document.getElementById('td-toast-container');
    const tc = existing || (() => {
      const el = document.createElement('div');
      el.id = 'td-toast-container';
      el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(el);
      return el;
    })();
    const colors = { success: '#2f9e44', error: '#c92a2a', info: '#1971c2' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:#fff;border-left:4px solid ${colors[type]||colors.info};padding:12px 20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);font-size:14px;max-width:320px;animation:slideIn .3s ease;`;
    toast.textContent = message;
    tc.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }, []);

  /* ── Load all ── */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes, ratingsRes, teacherStatsRes] = await Promise.all([
        api.tasks.list('limit=100'),
        api.tasks.stats(),
        api.get(`/ratings?user_id=${api.getUser()?.id || ''}`).catch(() => ({ success: false })),
        api.teacherProfile.stats().catch(() => ({ success: false }))
      ]);
      if (tasksRes.success) setTasks(tasksRes.data || []);
      if (statsRes.success) setTaskStats(statsRes.data || {});
      if (teacherStatsRes.success && teacherStatsRes.data) {
        setTeacherStats(teacherStatsRes.data);
      }
      if (ratingsRes.success && Array.isArray(ratingsRes.data) && ratingsRes.data.length) {
        setRatingData(ratingsRes.data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCompetitions = useCallback(async () => {
    try {
      const [compRes, prepRes, typesRes, namesRes, levelsRes, studRes] = await Promise.all([
        api.get('/olympiads/achievements').catch(() => ({ success: false, data: [] })),
        api.get('/olympiads/preparations').catch(() => ({ success: false, data: [] })),
        api.get('/competition-dictionaries/types'),
        api.get('/competition-names'),
        api.get('/competition-dictionaries/levels'),
        api.get('/student-profiles?limit=200').catch(() => ({ success: false, data: [] }))
      ]);
      if (compRes.success) setCompetitions(compRes.data || []);
      if (prepRes.success) setPreparations(prepRes.data || []);
      if (typesRes.success) setCompTypes(typesRes.data || []);
      if (namesRes.success) setCompNames(namesRes.data || []);
      if (levelsRes.success) setCompLevels(levelsRes.data || []);
      if (studRes.success) {
        // student-profiles returns {id, student_id, student_name}
        const raw = studRes.data || [];
        setStudents(raw);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadExtendedSection = useCallback(async (section) => {
    setSectionBusy(true);
    try {
      if (section === 'Оқушылармен қосымша жұмыс') {
        const [repRes, profRes] = await Promise.all([
          api.studentReports.list('limit=100'),
          api.studentProfiles.list('limit=200')
        ]);
        if (repRes.success) setStudentReports(repRes.data || []);
        if (profRes.success) setStudentProfiles(profRes.data || []);
      }
      if (section === 'Айлық жоспарларым') {
        const res = await api.monthlyPlans.list();
        if (res.success) setMonthlyPlans(res.data || []);
      }
      if (section === 'ҚМЖ') {
        const res = await api.qmg.list();
        if (res.success) setQmgItems(res.data || []);
      }
      if (section === 'Сабаққа ену') {
        const [res, tRes] = await Promise.all([
          api.visits.list(),
          api.visits.teacherOptions().catch(() => ({ success: false, data: [] }))
        ]);
        if (res.success) setLessonVisits(res.data || []);
        if (tRes.success) setVisitTeachers(tRes.data || []);
        setVisitSubjects([]);
        setVisitClasses([]);
      }
      if (section === 'Іс-шаралар') {
        const [res, etRes] = await Promise.all([
          api.get('/events'),
          api.get('/event-types').catch(() => ({ success: false, data: [] }))
        ]);
        if (res.success) setEvents(res.data || []);
        if (etRes.success) setEventTypes(etRes.data || []);
      }
      if (section === 'Менің рейтингім') {
        const uid = api.getUser()?.id;
        const res = await api.get(`/ratings?user_id=${uid || ''}`);
        if (res.success) setRatingRows(res.data || []);
      }
      if (section === 'Менің материалдарым') {
        const res = await api.materials.list();
        if (res.success) setQmgItems(res.data || []);
      }
      if (section === 'Менің аттестацияларым') {
        const [res, tr] = await Promise.all([
          api.get('/attestations/my').catch(() => api.attestations.list()),
          api.attestations.typesList()
        ]);
        if (res.success) setAttestations(res.data || []);
        if (tr.success) setAttTypes(tr.data || []);
      }
      if (section === 'Курстар') {
        const res = await api.teacherCourses.list();
        if (res.success) setTeacherCourses(res.data || []);
      }
      if (section === 'Кітапхана') {
        const [booksRes, reservationsRes] = await Promise.all([
          api.library.books.list('limit=50'),
          api.library.reservations.list()
        ]);
        if (booksRes.success) setLibraryBooks(booksRes.data || []);
        if (reservationsRes.success) setReservations(reservationsRes.data || []);
      }
      if (section === 'Дарынды оқушылар') {
        const [res, classesRes] = await Promise.all([
          api.studentProfiles.list('limit=500'),
          api.students.classes()
        ]);
        if (res.success) setStudentProfiles(res.data || []);
        if (classesRes.success) setAllClasses(classesRes.data || []);
      }
      if (section === 'Марапаттар' || section === 'Жеке жетістіктерім') {
        const res = await api.studentAchievements.list('limit=100');
        if (res.success) setStudentReports(res.data || []);
      }
      if (section === 'Оқушылармен қосымша жұмыс' || section === 'ҚМЖ' || section === 'Менің материалдарым' || section === 'Жеке жетістіктерім') {
        const subRes = await api.academic.subjects.list();
        if (subRes.success) setSubjects(subRes.data || []);
      }
      if (section === 'Класс ақпараттары' || section === 'Тәрбиешің ұяшығы' || section === 'Оқушы мамандығы') {
        const [homeRes, classesRes] = await Promise.all([
          api.teacherProfile.homeroom(),
          api.students.classes()
        ]);
        if (homeRes.success) setHomeroom(homeRes);
        if (classesRes.success) setAllClasses(classesRes.data || []);
        if (classesRes.success && section === 'Оқушы мамандығы') {
          const firstClassId = classesRes.data?.[0]?.id;
          if (firstClassId) {
            const studentsRes = await api.students.byClass(firstClassId);
            if (studentsRes.success) {
              setHomeroom({
                is_homeroom: true,
                classData: classesRes.data[0],
                students: studentsRes.data || []
              });
            }
          }
        }
      }
      if (section === 'Профиль өзгерту') {
        const [meRes, rolesRes, telegramRes] = await Promise.all([
          api.auth.me(),
          api.roles.list().catch(() => ({ success: false, data: [] })),
          api.telegram.status().catch(() => ({ success: false }))
        ]);
        if (telegramRes.success) setTelegramStatus(telegramRes.data);
        if (rolesRes.success) {
          const map = {};
          (rolesRes.data || []).forEach((r) => { map[r.name] = r.id; });
          setRolesMap(map);
        }
        if (meRes.success && meRes.data) {
          setProfileForm((p) => ({
            ...p,
            full_name: meRes.data.full_name || '',
            iin: meRes.data.iin || '',
            position: ''
          }));
          if (meRes.data.teacher_id) {
            const tRes = await api.teachers.get(meRes.data.teacher_id);
            if (tRes.success && tRes.data) {
              setProfileTeacher(tRes.data);
              setProfileForm((p) => ({ ...p, position: tRes.data.category || '' }));
              setProfilePhotoPreview(tRes.data.photo_url ? getImageUrl(tRes.data.photo_url) : '');
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSectionBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!api.isLoggedIn()) { window.location.href = '/login'; return; }
    const u = api.getUser();
    setUser(u);
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeSection === 'Жарыс жетістіктерім') loadCompetitions();
    if ([
      'Оқушылармен қосымша жұмыс',
      'Айлық жоспарларым',
      'ҚМЖ',
      'Сабаққа ену',
      'Іс-шаралар',
      'Менің рейтингім',
      'Менің материалдарым',
      'Менің аттестацияларым',
      'Курстар',
      'Кітапхана',
      'Дарынды оқушылар',
      'Марапаттар',
      'Жеке жетістіктерім',
      'Класс ақпараттары',
      'Тәрбиешің ұяшығы',
      'Оқушы мамандығы',
      'Профиль өзгерту'
    ].includes(activeSection)) {
      loadExtendedSection(activeSection);
    }
  }, [activeSection, loadCompetitions, loadExtendedSection]);

  /* ── Load task detail ── */
  const openTaskDetail = async (task) => {
    // Set basic data immediately for fast UX
    setSelectedTask(task);
    setTaskNote('');
    setTaskFile(null);
    // Load full data in background
    try {
      const res = await api.tasks.get(task.id);
      if (res.success && res.data) {
        setSelectedTask(res.data);
      }
    } catch (e) {
      console.error('Task detail load error:', e);
    }
  };

  /* ── Task detail save ── */
  const saveTaskChanges = async () => {
    if (!selectedTask) return;
    setSavingTask(true);
    try {
      const updates = {};
      // If note written — mark as completed and save note
      if (taskNote.trim()) {
        updates.workflow_status = 'completed';
        // Store note in description field (append to existing)
        const existingDesc = selectedTask.description || '';
        const sep = existingDesc ? '\n\n' : '';
        updates.description = existingDesc + sep + 'Орындалған туралы жазба:\n' + taskNote.trim();
      }
      if (Object.keys(updates).length > 0) {
        await api.tasks.update(selectedTask.id, updates);
      }
      // Upload submission file if selected
      if (taskFile) {
        const fd = new FormData();
        fd.append('files', taskFile);
        fd.append('title', selectedTask.title);
        await api.upload(`/tasks`, fd).catch(() => {});
      }
      showToast('Өзгерістер сақталды', 'success');
      setSelectedTask(null);
      setTaskNote('');
      setTaskFile(null);
      loadDashboard();
    } catch (e) {
      showToast('Сақтау қатесі', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  /* ── Competition form submit ── */
  const submitCompetition = async () => {
    try {
      // For each participant
      for (const p of compForm.participants) {
        if (!p.student_id || !p.place) continue;
        // Create preparation if not exists
        const prepRes = await api.post('/olympiads/preparations', {
          student_id: parseInt(p.student_id),
          competition_type: compForm.competition_type_id,
          competition_subtype: compForm.competition_name_id
        });
        const prepId = prepRes.success ? prepRes.data?.id : null;
        if (prepId) {
          await api.post('/olympiads/achievements', {
            preparation_id: prepId,
            place: p.place,
            date: compForm.date
          });
        }
      }
      showToast('Жетістік сақталды', 'success');
      setShowCompForm(false);
      setCompForm({
        competition_type_id: '', competition_name_id: '', level_id: '',
        date: new Date().toISOString().slice(0, 10),
        participants: [{ student_id: '', place: '', file: null }]
      });
      loadCompetitions();
    } catch (e) {
      showToast('Қате: ' + e.message, 'error');
    }
  };

  const submitPrep = async () => {
    if (!prepForm.student_id || !prepForm.competition_type) {
      return showToast('Барлық өрістерді толтырыңыз', 'error');
    }
    const res = await api.post('/olympiads/preparations', {
      student_id: parseInt(prepForm.student_id),
      competition_type: prepForm.competition_type,
      competition_subtype: prepForm.competition_subtype
    });
    if (!res.success) return showToast(res.message || 'Қате', 'error');
    showToast('Өтінім сақталды', 'success');
    setShowPrepForm(false);
    setPrepForm({ student_id: '', competition_type: '', competition_subtype: '' });
    loadCompetitions();
  };

  const addPlanTaskRow = () => setPlanForm((p) => ({ ...p, tasks: [...p.tasks, { title: '', start_date: '', deadline: '' }] }));
  const saveMonthlyPlan = async () => {
    if (!planForm.title.trim()) return showToast('Жоспар атауын енгізіңіз', 'error');
    const planRes = await api.monthlyPlans.create({ title: planForm.title.trim(), month: planForm.month || null });
    if (!planRes.success) return showToast(planRes.message || 'Қате', 'error');
    for (const t of planForm.tasks) {
      if (!t.title?.trim()) continue;
      await api.monthlyPlans.createTask(planRes.data.id, { title: t.title.trim(), start_date: t.start_date || null, deadline: t.deadline || null });
    }
    showToast('Жоспар сақталды', 'success');
    setPlanForm({ title: '', month: '', tasks: [{ title: '', start_date: '', deadline: '' }] });
    loadExtendedSection('Айлық жоспарларым');
  };

  const togglePlanTask = async (task) => {
    const next = task.status === 'done' ? 'pending' : 'done';
    const res = await api.monthlyPlans.updateTask(task.id, { status: next });
    if (res.success) loadExtendedSection('Айлық жоспарларым');
  };

  const openPlanDetail = async (planId) => {
    const res = await api.monthlyPlans.get(planId);
    if (!res.success) return showToast(res.message || 'Жоспар жүктелмеді', 'error');
    setPlanDetail(res.data);
  };

  const saveAttestation = async () => {
    const teacherId = api.getUser()?.teacher_id;
    if (!teacherId || !attForm.type_id || !attForm.issued_at) return showToast('Түрі мен күні міндетті', 'error');
    const r = await api.attestations.create({
      teacher_id: teacherId,
      type_id: Number(attForm.type_id),
      issued_at: attForm.issued_at,
      document_url: attForm.document_url || null,
    });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Аттестация қосылды', 'success');
    setAttForm({ type_id: '', issued_at: '', document_url: '' });
    loadExtendedSection('Менің аттестацияларым');
  };

  const autoNextCourseDate = (finishedAt) => {
    if (!finishedAt) return '';
    const d = new Date(finishedAt);
    if (Number.isNaN(d.getTime())) return '';
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().slice(0, 10);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim() || !courseForm.finished_at) {
      return showToast('Курс атауы және оқыған мерзімі міндетті', 'error');
    }
    setCourseSaving(true);
    try {
      const fd = new FormData();
      Object.entries(courseForm).forEach(([key, value]) => {
        if (value) fd.append(key, value);
      });
      if (!courseForm.next_training_at) {
        fd.append('next_training_at', autoNextCourseDate(courseForm.finished_at));
      }
      courseFiles.forEach((file) => fd.append('files', file));
      const res = await api.teacherCourses.create(fd);
      if (!res.success) return showToast(res.message || 'Курс сақталмады', 'error');
      showToast('Курс және сертификаттар сақталды', 'success');
      setCourseForm({ title: '', topic: '', provider: '', description: '', started_at: '', finished_at: '', next_training_at: '' });
      setCourseFiles([]);
      setCourseFormOpen(false);
      loadExtendedSection('Курстар');
    } finally {
      setCourseSaving(false);
    }
  };

  const deleteCourse = async (id) => {
    const res = await api.teacherCourses.delete(id);
    if (!res.success) return showToast(res.message || 'Курс жойылмады', 'error');
    showToast('Курс жойылды', 'success');
    loadExtendedSection('Курстар');
  };

  const addStudentProfileQuick = async (student_id, profile_type) => {
    const teacherId = api.getUser()?.teacher_id;
    const r = await api.studentProfiles.create({
      student_id,
      profile_type,
      assigned_teacher_id: teacherId || null,
      assigned_at: new Date().toISOString().slice(0, 10),
      is_active: true
    });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Оқушы қосылды', 'success');
    loadExtendedSection('Оқушылармен қосымша жұмыс');
  };

  const searchSupportStudents = async (q) => {
    setSupportSearch(q);
    if (!q || q.trim().length < 2) {
      setSupportResults([]);
      return;
    }
    const res = await api.students.search(q.trim());
    if (res.success) setSupportResults(res.data || []);
  };

  const attachSupportStudent = async (profileType) => {
    if (!selectedSupportStudent) return showToast('Алдымен оқушыны іздеп таңдаңыз', 'error');
    const mapped = profileType === 'gifted' ? 'gifted' : 'struggling';
    await addStudentProfileQuick(selectedSupportStudent.id, mapped);
    setSupportSearch('');
    setSupportResults([]);
    setSelectedSupportStudent(null);
  };

  const saveAward = async () => {
    if (!awardForm.student_id || !awardForm.award_type || !awardForm.reason) {
      return showToast('Міндетті өрістерді толтырыңыз', 'error');
    }
    const title = `Мадақтама түрі:${awardForm.award_type} | Не үшін алды:${awardForm.reason} | Тіркеу нөмірі:${awardForm.reg_number || '-'}`;
    const r = await api.studentAchievements.create({
      student_id: Number(awardForm.student_id),
      competition_name: title,
      achievement_type: awardForm.award_type,
      level: 'Мектеп',
      place_rank: awardForm.reg_number || null,
      achievement_date: awardForm.award_date || null
    });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Марапат қосылды', 'success');
    setAwardForm({ student_id: '', award_type: '', reason: '', reg_number: '', award_date: '' });
    loadExtendedSection('Марапаттар');
  };

  const saveVisit = async () => {
    if (!visitForm.visit_date || !visitForm.visited_teacher_id) return showToast('Күні мен мұғалім міндетті', 'error');
    const today = new Date().toISOString().slice(0, 10);
    if (visitForm.visit_date < today) return showToast('Өткен күнді таңдауға болмайды', 'error');
    const fd = new FormData();
    Object.entries({
      ...visitForm,
      visited_teacher_id: Number(visitForm.visited_teacher_id),
      subject_id: visitForm.subject_id ? Number(visitForm.subject_id) : null,
      class_id: visitForm.class_id ? Number(visitForm.class_id) : null,
      students_total: visitForm.students_total ? Number(visitForm.students_total) : 0,
      students_present: visitForm.students_present ? Number(visitForm.students_present) : 0
    }).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    });
    if (visitPhoto) fd.append('photo', visitPhoto);
    const r = await api.visits.createForm(fd);
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Сабаққа ену есебі сақталды', 'success');
    setVisitForm({
      visit_date: '', visited_teacher_id: '', subject_id: '', class_id: '', lesson_type: 'Ашық сабақ',
      students_total: '', students_present: '', topic: '', qmg_standard: '', organization: '', homework_check: '',
      teacher_communication: '', new_topic_explanation: '', topic_reveal: '', methods_used: '', task_level: '', feedback_given: '', overall_conclusion: ''
    });
    setVisitPhoto(null);
    setVisitSubjects([]);
    setVisitClasses([]);
    loadExtendedSection('Сабаққа ену');
  };

  const saveEvent = async () => {
    if (!eventForm.title || !eventForm.date || !eventForm.time || !eventForm.location) return showToast('Міндетті өрістерді толтырыңыз', 'error');
    const r = await api.post('/events', eventForm);
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Іс-шара қосылды', 'success');
    setEventForm({ title: '', description: '', date: '', time: '', location: '', event_type_id: '' });
    setEventFormOpen(false);
    loadExtendedSection('Іс-шаралар');
  };

  const onVisitTeacherChange = async (teacherId) => {
    setVisitForm((f) => ({ ...f, visited_teacher_id: teacherId, subject_id: '', class_id: '' }));
    setVisitClasses([]);
    if (!teacherId) {
      setVisitSubjects([]);
      return;
    }
    const res = await api.visits.subjectsByTeacher(teacherId);
    if (res.success) setVisitSubjects(res.data || []);
    else setVisitSubjects([]);
  };

  const onVisitSubjectChange = async (subjectId) => {
    setVisitForm((f) => ({ ...f, subject_id: subjectId, class_id: '' }));
    if (!subjectId || !visitForm.visited_teacher_id) {
      setVisitClasses([]);
      return;
    }
    const res = await api.visits.classesByTeacherSubject(visitForm.visited_teacher_id, subjectId);
    if (res.success) setVisitClasses(res.data || []);
    else setVisitClasses([]);
  };

  const saveStudentReport = async () => {
    if (!reportForm.report_date || !reportForm.subject_id || !reportForm.topic || !reportForm.task_type || !reportForm.results.length) {
      return showToast('Есеп өрістерін толтырыңыз', 'error');
    }
    const r = await api.studentReports.create({
      ...reportForm,
      subject_id: Number(reportForm.subject_id),
      results: reportForm.results.map((x) => ({ student_id: Number(x.student_id), score: Number(x.score || 0) }))
    });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Есеп жіберілді', 'success');
    setReportForm({ report_type: reportForm.report_type, report_date: '', subject_id: '', topic: '', task_type: '', feedback: '', results: [] });
    loadExtendedSection('Оқушылармен қосымша жұмыс');
  };

  const saveQmgGenerated = async () => {
    if (!qmgForm.title || !qmgForm.subject_id || !qmgForm.class_category) return showToast('Қажетті өрістерді толтырыңыз', 'error');
    const r = await api.qmg.generate({
      title: qmgForm.title,
      subject_id: Number(qmgForm.subject_id),
      class_category: qmgForm.class_category,
      duration_mins: Number(qmgForm.duration_mins || 45)
    });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('ҚМЖ генерацияға жіберілді', 'success');
    setQmgFormOpen(false);
    setQmgForm({ title: '', subject_id: '', class_category: '', duration_mins: 45 });
    loadExtendedSection('ҚМЖ');
  };

  const saveAchievement = async () => {
    const fallbackStudentId = achievementForm.student_id || classStudents?.[0]?.id || homeroom?.students?.[0]?.id;
    if (!fallbackStudentId || !achievementForm.competition_name || !achievementForm.achievement_type || !achievementForm.achievement_date) {
      return showToast('Міндетті өрістерді толтырыңыз (сыныпта кемінде 1 оқушы болуы керек)', 'error');
    }
    const r = await api.studentAchievements.create({
      ...achievementForm,
      student_id: Number(fallbackStudentId),
      competition_name: achievementForm.description
        ? `${achievementForm.competition_name} | ${achievementForm.description}`
        : achievementForm.competition_name
    });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Жетістік қосылды', 'success');
    setAchievementForm({ student_id: '', competition_name: '', description: '', achievement_type: '', level: '', achievement_date: '', place_rank: '' });
    loadExtendedSection('Жеке жетістіктерім');
  };

  const saveMaterialGenerated = async () => {
    if (!materialForm.title || !materialForm.subject_id || !materialForm.class_category) return showToast('Міндетті өрістерді толтырыңыз', 'error');
    const r = await api.materials.generate({
      title: materialForm.title,
      subject_id: Number(materialForm.subject_id),
      direction: materialForm.direction || 'Сабақ жоспары',
      class_category: materialForm.class_category
    });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Материал генерацияға жіберілді', 'success');
    setMaterialFormOpen(false);
    setMaterialForm({ title: '', subject_id: '', direction: '', class_category: '' });
    loadExtendedSection('Менің материалдарым');
  };

  const searchReservationUsers = async (q) => {
    setReservationForm((f) => ({ ...f, user_search: q }));
    if (!q || q.length < 2) return setReservationUsers([]);
    const r = await api.library.reservations.searchUsers(q);
    if (r.success) setReservationUsers(r.data || []);
  };

  const saveReservation = async () => {
    if (!reservationForm.book_id || !reservationForm.user_id || !reservationForm.borrow_date || !reservationForm.return_date) {
      return showToast('Бронь өрістерін толтырыңыз', 'error');
    }
    const r = await api.library.reservations.create({
      book_id: Number(reservationForm.book_id),
      user_id: Number(reservationForm.user_id),
      borrow_date: reservationForm.borrow_date,
      return_date: reservationForm.return_date,
      status: reservationForm.status
    });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Бронь сақталды', 'success');
    setReservationForm({ book_id: '', user_id: '', borrow_date: '', return_date: '', status: 'issued', user_search: '' });
    setReservationUsers([]);
    loadExtendedSection('Кітапхана');
  };

  const updateStudentProfileNotes = async (profileId, notes) => {
    const r = await api.studentProfiles.update(profileId, { notes });
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Сақталды', 'success');
    loadExtendedSection('Дарынды оқушылар');
  };

  const selectClassAndLoadStudents = async (classId) => {
    setSelectedClassId(String(classId || ''));
    if (!classId) return setClassStudents([]);
    const r = await api.students.byClass(classId);
    if (r.success) setClassStudents(r.data || []);
  };

  const openClassStudentsPage = async (classItem, section) => {
    const [r, profilesRes] = await Promise.all([
      api.students.byClass(classItem.id),
      section === 'Дарынды оқушылар'
        ? api.studentProfiles.list('limit=500').catch(() => ({ success: false, data: [] }))
        : Promise.resolve({ success: false, data: [] })
    ]);
    if (!r.success) return showToast(r.message || 'Оқушылар жүктелмеді', 'error');
    if (profilesRes.success) setStudentProfiles(profilesRes.data || []);
    setClassView({
      section,
      classId: classItem.id,
      id: classItem.id,
      className: classItem.name,
      name: classItem.name,
      students: r.data || []
    });
  };

  const saveStudentProfession = async (student, profession) => {
    const value = String(profession || '').trim();
    const r = await api.students.setProfession(student.id, value || null);
    if (!r.success) return showToast(r.message || 'Мамандық сақталмады', 'error');
    setClassView((prev) => prev ? {
      ...prev,
      students: prev.students.map((item) => (
        String(item.id) === String(student.id) ? { ...item, profession: value } : item
      ))
    } : prev);
    showToast('Мамандық бағыты сақталды', 'success');
  };

  const markStudentAttendance = async (student, status, reason) => {
    const r = await api.students.markAttendance({
      student_id: student.id,
      status,
      reason: String(reason || '').trim() || null
    });
    if (!r.success) return showToast(r.message || 'Қатысу белгісі сақталмады', 'error');
    const marked = r.data || {};
    setClassView((prev) => prev ? {
      ...prev,
      students: prev.students.map((item) => (
        String(item.id) === String(student.id)
          ? {
              ...item,
              attendance_status: marked.status || status,
              attendance_reason: marked.reason || String(reason || '').trim() || null,
              attendance_marked_at: marked.created_at || new Date().toISOString()
            }
          : item
      ))
    } : prev);
    const statsRes = await api.teacherProfile.stats().catch(() => ({ success: false }));
    if (statsRes.success && statsRes.data) setTeacherStats(statsRes.data);
    showToast('Қатысу белгісі сақталды', 'success');
  };

  const saveStudentWorkProfile = async (student, profileType, notes) => {
    const existing = studentProfiles.find((profile) => String(profile.student_id) === String(student.id));
    const payload = {
      student_id: student.id,
      profile_type: profileType,
      assigned_teacher_id: api.getUser()?.teacher_id || null,
      assigned_at: existing?.assigned_at || new Date().toISOString().slice(0, 10),
      ends_at: existing?.ends_at || null,
      is_active: true,
      notes: String(notes || '').trim() || null
    };
    const r = existing
      ? await api.studentProfiles.update(existing.id, payload)
      : await api.studentProfiles.create(payload);
    if (!r.success) return showToast(r.message || 'Профиль сақталмады', 'error');
    const refreshed = await api.studentProfiles.list('limit=500');
    if (refreshed.success) setStudentProfiles(refreshed.data || []);
    showToast(profileType === 'gifted' ? 'Дарынды оқушы профилі сақталды' : 'Қолдау профилі сақталды', 'success');
  };

  const renderStudentWorkPicker = (section) => (
    <StudentWorkPanel
      section={section}
      classes={allClasses}
      loading={sectionBusy}
      embedded
      onSelectClass={openClassStudentsPage}
    />
  );

  const saveProfile = async () => {
    if (!profileForm.full_name.trim() || !profileForm.iin.trim()) return showToast('ФИО және ИИН міндетті', 'error');
    const roleId = rolesMap[user.role];
    if (!roleId) return showToast('Рөл анықталмады', 'error');
    const userPayload = {
      full_name: profileForm.full_name.trim(),
      iin: profileForm.iin.trim(),
      role_id: roleId,
      teacher_id: user.teacher_id || null,
      is_active: true
    };
    const userRes = await api.users.update(user.id, userPayload);
    if (!userRes.success) return showToast(userRes.message || 'Профиль сақталмады', 'error');

    if (user.teacher_id) {
      const fd = new FormData();
      fd.append('full_name', profileForm.full_name.trim());
      fd.append('category', profileForm.position || '');
      if (profileTeacher?.subject) fd.append('subject', profileTeacher.subject);
      if (profileTeacher?.bio) fd.append('bio', profileTeacher.bio);
      if (profilePhotoFile) fd.append('photo', profilePhotoFile);
      else if (profileTeacher?.photo_url) fd.append('photo_url', profileTeacher.photo_url);
      await api.teachers.update(user.teacher_id, fd);
    }

    const meRes = await api.auth.me();
    if (meRes.success && meRes.data) {
      api.setUser({ ...user, full_name: meRes.data.full_name, iin: meRes.data.iin });
      setUser((p) => ({ ...p, full_name: meRes.data.full_name, iin: meRes.data.iin }));
    }
    showToast('Профиль сақталды', 'success');
  };

  const changePassword = async () => {
    if (!profileForm.current_password || !profileForm.new_password || !profileForm.confirm_password) {
      return showToast('Құпия сөз өрістерін толтырыңыз', 'error');
    }
    if (profileForm.new_password !== profileForm.confirm_password) {
      return showToast('Жаңа құпия сөздер сәйкес емес', 'error');
    }
    const r = await api.auth.changePassword(profileForm.current_password, profileForm.new_password);
    if (!r.success) return showToast(r.message || 'Қате', 'error');
    showToast('Құпия сөз өзгертілді', 'success');
    setProfileForm((p) => ({ ...p, current_password: '', new_password: '', confirm_password: '' }));
  };

  const connectTelegram = async () => {
    setTelegramBusy(true);
    const r = await api.telegram.linkCode();
    setTelegramBusy(false);
    if (!r.success) return showToast(r.message || 'Telegram сілтемесін жасау мүмкін болмады', 'error');
    setTelegramLink(r.data || null);
    const statusRes = await api.telegram.status().catch(() => ({ success: false }));
    if (statusRes.success) setTelegramStatus(statusRes.data);
    if (r.data?.bot_link) {
      window.open(r.data.bot_link, '_blank', 'noopener,noreferrer');
      showToast('Telegram ашылды. Bot ішінде Start басыңыз.', 'success');
    } else {
      showToast(`Telegram коды: ${r.data?.code || ''}`, 'info');
    }
  };

  const logout = () => {
    api.removeToken(); api.removeUser();
    window.location.href = '/login';
  };

  if (!user) return null;

  /* ===================================================================
     RENDER helpers
     =================================================================== */
  const isPrivileged = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'director';
  const excludedForTeachers = ['Кітапхана', 'Дарынды оқушылар', 'Сабаққа ену'];
  
  const visibleSections = ALL_SECTIONS.filter(s => {
    if (!isPrivileged && excludedForTeachers.includes(s)) return false;
    return s !== 'Класс ақпараттары';
  });

  /* ────────────────── TASK DETAIL VIEW ────────────────── */
  if (selectedTask) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Inter', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

        {/* Header */}
        <div style={{
          background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center',
          gap: 12, borderBottom: '1px solid #e9ecef', position: 'sticky', top: 0, zIndex: 100
        }}>
          <button onClick={() => { setSelectedTask(null); setTaskNote(''); setTaskFile(null); }}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: '#e7f5ff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#1971c2'
            }}>←</button>
          <span style={{ color: '#adb5bd', fontSize: 13 }}>Тапсырмалар</span>
          <span style={{ color: '#adb5bd' }}>/</span>
          <span style={{ fontSize: 13, color: '#495057', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedTask.title}
          </span>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <h2 style={{ color: '#1971c2', fontSize: 22, fontWeight: 700, marginBottom: 24, lineHeight: 1.3 }}>
              {selectedTask.title}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
              {selectedTask.description && (
                <div>
                  <div style={{ color: '#868e96', fontSize: 13, marginBottom: 4 }}>Түсініктеме:</div>
                  <div style={{ fontSize: 14, color: '#343a40' }}>{selectedTask.description}</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ color: '#868e96', fontSize: 13, marginBottom: 4 }}>Тағайындады:</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {selectedTask.assigned_by_name || '—'}
                    <span style={{ color: '#868e96', fontWeight: 400 }}> (Администратор)</span>
                  </div>
                </div>
                <div>
                  <div style={{ color: '#868e96', fontSize: 13, marginBottom: 4 }}>Тағайындалған:</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {selectedTask.teacher_name || user.full_name}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#868e96', fontSize: 13, marginBottom: 4 }}>Приоритет:</div>
                  {priorityBadge(selectedTask.priority)}
                </div>
                <div>
                  <div style={{ color: '#868e96', fontSize: 13, marginBottom: 4 }}>Статус:</div>
                  {statusBadge(selectedTask.workflow_status)}
                </div>
              </div>

              {selectedTask.deadline && (
                <div>
                  <div style={{ color: '#868e96', fontSize: 13, marginBottom: 4 }}>Аяқталу күні:</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{formatKZ(selectedTask.deadline)}</div>
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '24px 0' }} />

            {/* Note area */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#495057', fontSize: 14, marginBottom: 8, fontWeight: 500 }}>
                Іске асыру туралы ескерту:
              </label>
              <div style={{
                border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden'
              }}>
                {/* Toolbar */}
                <div style={{
                  background: '#f8f9fa', borderBottom: '1px solid #dee2e6',
                  padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'
                }}>
                  {[
                    { type: 'icon', icon: 'fa-undo-alt', title: 'Undo' },
                    { type: 'icon', icon: 'fa-redo-alt', title: 'Redo' },
                    { type: 'text', text: 'Paragraph' },
                    { type: 'text', text: 'B' },
                    { type: 'text', text: 'I' },
                    { type: 'icon', icon: 'fa-link', title: 'Link' },
                    { type: 'icon', icon: 'fa-image', title: 'Image' },
                    { type: 'icon', icon: 'fa-plus-square', title: 'Insert' },
                    { type: 'icon', icon: 'fa-quote-left', title: 'Quote' },
                    { type: 'icon', icon: 'fa-play', title: 'Play' },
                    { type: 'text', text: '• ' },
                    { type: 'text', text: '1.' },
                    { type: 'icon', icon: 'fa-outdent', title: 'Outdent' },
                    { type: 'icon', icon: 'fa-indent', title: 'Indent' },
                  ].map((it, i) => (
                    <button key={i} title={it.title || it.text} style={{
                      border: '1px solid #dee2e6', background: '#fff', borderRadius: 4,
                      padding: '2px 8px', fontSize: 12, cursor: 'pointer', color: '#495057'
                    }}>
                      {it.type === 'icon' ? <i className={`fas ${it.icon}`}></i> : it.text}
                    </button>
                  ))}
                </div>
                <textarea
                  value={taskNote}
                  onChange={e => setTaskNote(e.target.value)}
                  style={{
                    width: '100%', minHeight: 100, border: 'none', outline: 'none',
                    padding: '12px', resize: 'vertical', fontSize: 14, fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Орындалған жұмыс туралы жазыңыз..."
                />
              </div>
            </div>

            {/* File upload */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#495057', fontSize: 14, marginBottom: 8, fontWeight: 500 }}>
                Орындалған туралы файл:
              </label>
              <div style={{
                border: '1px solid #dee2e6', borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <label style={{
                  background: '#e9ecef', border: '1px solid #dee2e6', borderRadius: 6,
                  padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: '#495057', fontWeight: 500
                }}>
                  Выбрать файл
                  <input type="file" style={{ display: 'none' }}
                    onChange={e => setTaskFile(e.target.files[0] || null)} />
                </label>
                <span style={{ color: '#adb5bd', fontSize: 13 }}>
                  {taskFile ? taskFile.name : 'файл не выбран'}
                </span>
              </div>
            </div>

            <button
              onClick={saveTaskChanges}
              disabled={savingTask}
              style={{
                background: '#1971c2', color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                opacity: savingTask ? 0.7 : 1
              }}>
              {savingTask ? 'Сақталуда...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (classView) {
    return (
      <StudentWorkPanel
        section={classView.section}
        selectedClass={classView}
        students={classView.students}
        profiles={studentProfiles}
        onBack={() => setClassView(null)}
        onSaveProfession={saveStudentProfession}
        onMarkAttendance={markStudentAttendance}
        onSaveProfile={saveStudentWorkProfile}
      />
    );
  }

  /* ────────────────── COMPETITION FORM VIEW ────────────────── */
  if (showCompForm) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Inter', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
        <div style={{
          background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center',
          gap: 12, borderBottom: '1px solid #e9ecef', position: 'sticky', top: 0, zIndex: 100
        }}>
          <button onClick={() => setShowCompForm(false)}
            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f3f0ff', cursor: 'pointer', fontSize: 16, color: '#7048e8', display:'flex',alignItems:'center',justifyContent:'center' }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Жарыстың нәтижесін енгізу</span>
        </div>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 24, fontSize: 18 }}>Жарыстың нәтижесін енгізу</h3>

            {/* Competition Type */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>Жарыс түрі</label>
              <select
                value={compForm.competition_type_id}
                onChange={e => setCompForm(f => ({ ...f, competition_type_id: e.target.value, competition_name_id: '' }))}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #dee2e6', borderRadius: 10, fontSize: 14, cursor: 'pointer', background: '#fff' }}>
                <option value=''>Таңдаңыз</option>
                {compTypes.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Competition Name — filtered by type */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>Жарыс атауы</label>
              <select
                value={compForm.competition_name_id}
                onChange={e => setCompForm(f => ({ ...f, competition_name_id: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #dee2e6', borderRadius: 10, fontSize: 14, cursor: 'pointer', background: '#fff' }}>
                <option value=''>Таңдаңыз</option>
                {compNames
                  .filter(n => !compForm.competition_type_id || String(n.competition_type_id) === String(compForm.competition_type_id))
                  .map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Level */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>Деңгей</label>
              <select
                value={compForm.level_id}
                onChange={e => setCompForm(f => ({ ...f, level_id: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #dee2e6', borderRadius: 10, fontSize: 14, cursor: 'pointer', background: '#fff' }}>
                <option value=''>Таңдаңыз</option>
                {compLevels.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>


            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>Күні</label>
              <input type="date" value={compForm.date}
                onChange={e => setCompForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #dee2e6', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
            </div>

            <div style={{ border: '1.5px solid #dee2e6', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>Қатысушылар</div>
              {compForm.participants.map((p, idx) => (
                <div key={idx} style={{ border: '1px solid #e9ecef', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Қатысушы</label>
                    <select
                      value={p.student_id}
                      onChange={e => setCompForm(f => { const parts = [...f.participants]; parts[idx] = { ...parts[idx], student_id: e.target.value }; return { ...f, participants: parts }; })}
                      style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dee2e6', borderRadius: 8, fontSize: 14 }}>
                      <option value=''>Таңдаңыз</option>
                      {students.map(s => <option key={s.student_id || s.id} value={s.student_id || s.id}>{s.student_name || s.full_name}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Орын</label>
                    <select
                      value={p.place}
                      onChange={e => setCompForm(f => { const parts = [...f.participants]; parts[idx] = { ...parts[idx], place: e.target.value }; return { ...f, participants: parts }; })}
                      style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dee2e6', borderRadius: 8, fontSize: 14 }}>
                      <option value=''>Таңдаңыз</option>
                      {['1','2','3','4','5','Қатысушы'].map(pl => <option key={pl} value={pl}>{pl}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Сертификат (файл)</label>
                    <div style={{ border: '1.5px solid #dee2e6', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ background: '#e9ecef', border: '1px solid #dee2e6', borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer' }}>
                        Выбрать файл
                        <input type="file" style={{ display: 'none' }}
                          onChange={e => setCompForm(f => { const parts = [...f.participants]; parts[idx] = { ...parts[idx], file: e.target.files[0] }; return { ...f, participants: parts }; })} />
                      </label>
                      <span style={{ color: '#adb5bd', fontSize: 13 }}>{p.file ? p.file.name : 'файл не выбран'}</span>
                    </div>
                  </div>
                  {compForm.participants.length > 1 && (
                    <button onClick={() => setCompForm(f => ({ ...f, participants: f.participants.filter((_, i) => i !== idx) }))}
                      style={{ color: '#c92a2a', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
                      Қатысушыны өшіру
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setCompForm(f => ({ ...f, participants: [...f.participants, { student_id: '', place: '', file: null }] }))}
                style={{ background: '#2f9e44', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Қатысушы қосу
              </button>
            </div>

            <button onClick={submitCompetition}
              style={{ width: '100%', background: '#1971c2', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Сақтау
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===================================================================
     MAIN DASHBOARD
     =================================================================== */
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .td-section-btn { transition: background .15s, transform .1s; }
        .td-section-btn:hover { transform: translateY(-2px); }
        .td-task-card { transition: box-shadow .15s, border-color .15s; }
        .td-task-card:hover { box-shadow: 0 4px 20px rgba(25,113,194,.15) !important; border-color: #1971c2 !important; }
        .td-section-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(136px, 1fr)); gap:10px; }
        .td-menu-btn { display:none; align-items:center; justify-content:center; }
        .sidebar-overlay { position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:199;display:none; }
        .sidebar-overlay.open { display:block; }
        @media(max-width:768px){
          .td-sidebar { transform: translateX(-100%) !important; transition: transform .3s; }
          .td-sidebar.open { transform: translateX(0) !important; }
          .td-main { margin-left: 0 !important; }
          .td-menu-btn { display:flex !important; }
          .td-content-pad { padding: 16px !important; }
        }
      `}</style>

      {/* Sidebar overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`td-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', width: 260,
        background: '#fff', borderRight: '1px solid #e9ecef',
        overflowY: 'auto', zIndex: 200, display: 'flex', flexDirection: 'column'
      }}>
        {/* Brand */}
        <div style={{
          padding: '20px 20px 16px', borderBottom: '1px solid #e9ecef',
          background: 'linear-gradient(135deg, #4c6ef5 0%, #7048e8 100%)'
        }}>
          <div style={{ fontSize: 24, marginBottom: 10, color: '#fff' }}>
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
            {user.full_name || 'Мұғалім'}
          </div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginTop: 2 }}>
            {user.iin || ''}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          <div style={{ padding: '4px 16px 8px', fontSize: 11, fontWeight: 600, color: '#adb5bd', textTransform: 'uppercase', letterSpacing: 1 }}>
            Мұғалім кабинеті
          </div>
          {visibleSections.map(section => {
            const ic = SECTION_ICONS[section];
            const isActive = activeSection === section;
            return (
              <button key={section}
                onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  background: isActive ? ic.bg : 'transparent',
                  color: isActive ? ic.color : '#495057',
                  fontWeight: isActive ? 600 : 400, fontSize: 13,
                  borderLeft: isActive ? `3px solid ${ic.color}` : '3px solid transparent',
                  transition: 'all .15s'
                }}>
                <span style={{ fontSize: 14, width: 18, display: 'inline-flex', justifyContent: 'center' }}>
                  <i className={`fas ${ic.icon}`}></i>
                </span>
                {section}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#4c6ef5',
            color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {(user.full_name || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
            <div style={{ color: '#adb5bd', fontSize: 11 }}>teacher</div>
          </div>
          <button onClick={logout} title="Шығу" style={{
            border: 'none', background: 'none', cursor: 'pointer', color: '#c92a2a', fontSize: 16, flexShrink: 0
          }}><i className="fas fa-power-off"></i></button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="td-main" style={{ marginLeft: 260 }}>

        {/* Topbar */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e9ecef',
          padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
          position: 'sticky', top: 0, zIndex: 100
        }}>
          <button onClick={() => setSidebarOpen(true)}
            style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', width: 38, height: 38 }}
            className="td-menu-btn"><i className="fas fa-bars"></i></button>
          <h1 style={{ fontWeight: 700, fontSize: 18, color: '#212529', flex: 1 }}>{activeSection}</h1>
          <button onClick={loadDashboard} style={{
            border: 'none', background: '#f8f9fa', borderRadius: 8,
            width: 36, height: 36, cursor: 'pointer', fontSize: 16
          }} title="Жаңарту"><i className="fas fa-sync-alt"></i></button>
          {activeSection === 'Профиль өзгерту' && (
            <button onClick={connectTelegram} disabled={telegramBusy} style={{
              border: 'none',
              background: telegramStatus?.linked ? '#dcfce7' : '#e0f2fe',
              color: telegramStatus?.linked ? '#15803d' : '#0284c7',
              borderRadius: 8,
              width: 38,
              height: 38,
              cursor: telegramBusy ? 'wait' : 'pointer',
              fontSize: 18
            }} title={telegramStatus?.linked ? 'Telegram қосылған' : 'Telegram қосу'}>
              <i className="fab fa-telegram-plane"></i>
            </button>
          )}
          <button onClick={logout} style={{
            border: 'none', background: '#fff5f5', borderRadius: 8,
            padding: '6px 14px', color: '#c92a2a', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>Шығу</button>
        </header>

        {/* Content */}
        <div className="td-content-pad" style={{ padding: '24px', animation: 'fadeIn .3s ease' }}>

          {/* ══════════════════════════════════════════════════════
              ТАПСЫРМАЛАР
              ══════════════════════════════════════════════════ */}
          {activeSection === 'Тапсырмалар' && (
            <div style={{ animation: 'fadeIn .3s ease' }}>
              {/* Rating banner */}
              <div style={{
                background: 'linear-gradient(135deg, #4c6ef5 0%, #7048e8 100%)',
                borderRadius: 20, padding: '24px', marginBottom: 24, color: '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                    }}><i className="fas fa-trophy"></i></div>
                    <div>
                      <div style={{ fontSize: 13, opacity: .8 }}>Рейтинг</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 42, fontWeight: 800 }}>
                          {ratingData ? ratingData.total_points : taskStats.total || 0}
                        </span>
                        <span style={{ fontSize: 16, opacity: .8 }}>ұпай</span>
                      </div>
                    </div>
                  </div>
                  <a href="#" style={{
                    background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.3)',
                    borderRadius: 12, padding: '10px 18px', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6
                  }}><i className="fas fa-chart-bar"></i> Толық статистика <i className="fas fa-arrow-right"></i></a>
                </div>

                {/* Mini stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 18 }}>
                  {[
                    { label: 'ІС-ШАРАЛАР', num: teacherStats.events_count || 0, place: '#1', mult: 'x1' },
                    { label: 'САБАҚҚА ЕНУ', num: teacherStats.entering_lessons || 0, place: '#2', mult: 'x4' },
                    { label: 'ДАРЫНДЫ, ҮЛГЕРІМІ ТӨМЕН...', num: teacherStats.gifted_students || 0, place: '#3', mult: 'x1' },
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,.15)', borderRadius: 14, padding: '14px',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{
                          background: i === 0 ? '#f59f00' : i === 1 ? '#f06595' : '#74c0fc',
                          color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700
                        }}>
                          {item.place}
                        </span>
                        <span style={{ fontSize: 11, opacity: .8 }}>{item.mult} <i className="fas fa-circle" style={{ color: '#22c55e', fontSize: 8, verticalAlign: 'middle' }}></i></span>
                      </div>
                      <div style={{ fontSize: 10, opacity: .7, letterSpacing: .5, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800 }}>{item.num}</div>
                      <div style={{ fontSize: 10, opacity: .7 }}>балл</div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,.3)', borderRadius: 2, marginTop: 8 }}>
                        <div style={{ height: '100%', width: '60%', background: '#fff', borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                background: '#fff',
                borderRadius: 20,
                padding: 20,
                marginBottom: 24,
                boxShadow: '0 2px 12px rgba(0,0,0,.05)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: '#ecfdf5',
                      color: '#0f766e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18
                    }}>
                      <i className="fas fa-user-check"></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 16 }}>Бүгінгі қатысу</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>Сынып жетекшілік бойынша бүгін белгіленген оқушылар</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('Тәрбиешің ұяшығы')}
                    style={{
                      border: '1px solid #99f6e4',
                      background: '#f0fdfa',
                      color: '#0f766e',
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-arrow-right" style={{ marginRight: 8 }}></i>
                    Ашып белгілеу
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
                  {[
                    { label: 'Қатысқан', value: teacherStats.today_present_count || 0, color: '#166534', bg: '#dcfce7', icon: 'fa-check' },
                    { label: 'Кешіккен', value: teacherStats.today_late_count || 0, color: '#92400e', bg: '#fef3c7', icon: 'fa-clock' },
                    { label: 'Келмеген', value: teacherStats.today_absent_count || 0, color: '#991b1b', bg: '#fee2e2', icon: 'fa-user-times' },
                    { label: 'Белгіленген', value: teacherStats.today_attendance_total || 0, color: '#1d4ed8', bg: '#dbeafe', icon: 'fa-tasks' }
                  ].map((item) => (
                    <div key={item.label} style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: 14,
                      background: '#f8fafc'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{item.label}</span>
                        <span style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: item.color,
                          background: item.bg
                        }}>
                          <i className={`fas ${item.icon}`}></i>
                        </span>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 28, color: '#0f172a', lineHeight: 1 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section grid */}
              <div className="td-section-grid" style={{
                background: '#fff', borderRadius: 20, padding: '20px',
                marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)'
              }}>
                <div className="td-section-grid">
                  {visibleSections.map(section => {
                    const ic = SECTION_ICONS[section];
                    const isActive = activeSection === section;
                    return (
                      <button key={section} className="td-section-btn"
                        onClick={() => setActiveSection(section)}
                        style={{
                          border: 'none', cursor: 'pointer', borderRadius: 14,
                          padding: '16px 8px', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 8, textAlign: 'center',
                          background: isActive ? ic.bg : '#f8f9fa',
                          color: isActive ? ic.color : '#868e96',
                          fontWeight: isActive ? 700 : 400, fontSize: 11,
                          border: isActive ? `2px solid ${ic.color}` : '2px solid transparent',
                          lineHeight: 1.3
                        }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: isActive ? ic.color : '#e9ecef',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, transition: 'all .2s'
                        }}>
                          <i className={`fas ${ic.icon}`} style={{ color: isActive ? '#fff' : '#6b7280', fontSize: 16 }}></i>
                        </div>
                        {section}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tasks list */}
              <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{
                  padding: '18px 24px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', borderBottom: '1px solid #f1f3f5'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e7f5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#3b5bdb' }}>
                      <i className="fas fa-clipboard-list"></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>Менің тапсырмаларым</div>
                      <div style={{ color: '#adb5bd', fontSize: 12 }}>Маған берілген барлық тапсырмалар</div>
                    </div>
                  </div>
                  <span style={{
                    background: '#4c6ef5', color: '#fff', borderRadius: 20,
                    padding: '4px 14px', fontWeight: 700, fontSize: 13
                  }}>{tasks.length} тапсырма</span>
                </div>

                {loading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#adb5bd' }}>Жүктелуде...</div>
                ) : tasks.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#adb5bd' }}>Тапсырмалар жоқ</div>
                ) : (
                  <div>
                    {tasks.map((task, idx) => {
                      const isHighlighted = task.workflow_status === 'in_progress';
                      return (
                        <div key={task.id} className="td-task-card"
                          onClick={() => openTaskDetail(task)}
                          style={{
                            padding: '18px 24px',
                            borderBottom: idx < tasks.length - 1 ? '1px solid #f1f3f5' : 'none',
                            cursor: 'pointer',
                            borderLeft: isHighlighted ? '4px solid #4c6ef5' : '4px solid transparent',
                            background: isHighlighted ? '#f8f9ff' : '#fff',
                            transition: 'all .15s'
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontWeight: 600, fontSize: 15, marginBottom: 8, lineHeight: 1.4,
                                color: isHighlighted ? '#4c6ef5' : '#212529'
                              }}>
                                {task.title}
                                {isHighlighted && <span style={{ marginLeft: 6 }}>→</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <span style={{ color: '#adb5bd', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <i className="fas fa-user" style={{ color: '#94a3b8' }}></i>
                                  <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>
                                    {task.assigned_by_name || user.full_name || '—'}
                                  </span>
                                </span>
                                {task.deadline && (
                                  <span style={{ color: '#adb5bd', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <i className="fas fa-calendar-alt" style={{ color: '#94a3b8' }}></i>
                                    <span style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                                      {shortDate(task.deadline)}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                            {statusBadge(task.workflow_status)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              ЖАРЫС ЖЕТІСТІКТЕРІМ
              ══════════════════════════════════════════════════ */}
          {activeSection === 'Жарыс жетістіктерім' && (
            <div style={{ animation: 'fadeIn .3s ease' }}>
              {/* Header banner */}
              <div style={{
                background: 'linear-gradient(135deg, #6741d9 0%, #7048e8 100%)',
                borderRadius: 20, padding: '24px 28px', marginBottom: 24, color: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                  }}><i className="fas fa-trophy"></i></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>Менің жарыс жетістіктерім</div>
                    <div style={{ fontSize: 13, opacity: .8 }}>Барлық жеке жарыстарыңыз мен жетістіктеріңіз</div>
                  </div>
                </div>
                <button onClick={() => { setShowCompForm(true); }}
                  style={{
                    background: 'rgba(255,255,255,.2)', color: '#fff',
                    border: '1.5px solid rgba(255,255,255,.5)',
                    borderRadius: 12, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(10px)'
                  }}>
                  <i className="fas fa-plus"></i> Жарыс жетістігін тіркеу
                </button>
              </div>

              {/* My achievements */}
              <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{
                  padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10,
                  background: '#f8f9ff', borderBottom: '1px solid #e9ecef'
                }}>
                  <i className="fas fa-award" style={{ color: '#7048e8' }}></i>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Менің жетістіктерім</span>
                  <span style={{
                    background: '#e7f5ff', color: '#1971c2', borderRadius: 20,
                    padding: '2px 10px', fontSize: 12, fontWeight: 600, marginLeft: 4
                  }}>{competitions.length} жарыс</span>
                </div>

                {competitions.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{
                      width: 70, height: 70, borderRadius: '50%', background: '#f3f0ff',
                      margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32
                    }}><i className="fas fa-trophy" style={{ color: '#7048e8' }}></i></div>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Жарыстар жоқ</div>
                    <div style={{ color: '#adb5bd', fontSize: 14, marginBottom: 24 }}>
                      Сізде әлі ешқандай жарыс жоқ. Бірінші жарысыңызға қатысыңыз!
                    </div>
                    <button onClick={() => setShowCompForm(true)} style={{
                      background: '#7048e8', color: '#fff', border: 'none', borderRadius: 12,
                      padding: '12px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6
                    }}><i className="fas fa-plus"></i> Жарыс жетістігін тіркеу</button>
                  </div>
                ) : (
                  <div style={{ padding: 20 }}>
                    {competitions.map(c => (
                      <div key={c.id} style={{
                        border: '1px solid #e9ecef', borderRadius: 12, padding: '14px 18px',
                        marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.competition_type || '—'}</div>
                          <div style={{ color: '#adb5bd', fontSize: 13 }}>{c.student_name} • {formatKZ(c.date)}</div>
                        </div>
                        <span style={{
                          background: '#fff9db', color: '#e67700', borderRadius: 20,
                          padding: '4px 14px', fontWeight: 700, fontSize: 13
                        }}>{c.place}-орын</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Olympiad preparations */}
              <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{
                  padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#f0fff4', borderBottom: '1px solid #b2f2bb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fas fa-book-reader" style={{ color: '#2f9e44' }}></i>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Олимпиадаға дайындық</div>
                      <div style={{ color: '#adb5bd', fontSize: 12 }}>Олимпиадаларға дайындалу үшін тіркелген өтінімдер</div>
                    </div>
                  </div>
                  <button onClick={() => setShowPrepForm(p => !p)} style={{
                    background: '#2f9e44', color: '#fff', border: 'none', borderRadius: 10,
                    padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}><i className="fas fa-plus"></i> Дайындыққа тіркелу</button>
                </div>

                {/* Prep form inline */}
                {showPrepForm && (
                  <div style={{ padding: 20, background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Оқушы</label>
                        <select value={prepForm.student_id}
                          onChange={e => setPrepForm(f => ({ ...f, student_id: e.target.value }))}
                          style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dee2e6', borderRadius: 8, fontSize: 13 }}>
                          <option value=''>Таңдаңыз</option>
                          {students.map(s => <option key={s.student_id || s.id} value={s.student_id || s.id}>{s.student_name || s.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Жарыс түрі</label>
                        <select value={prepForm.competition_type}
                          onChange={e => setPrepForm(f => ({ ...f, competition_type: e.target.value }))}
                          style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dee2e6', borderRadius: 8, fontSize: 13 }}>
                          <option value=''>Таңдаңыз</option>
                          {compTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Жарыс атауы (қосымша)</label>
                      <select value={prepForm.competition_subtype}
                        onChange={e => setPrepForm(f => ({ ...f, competition_subtype: e.target.value }))}
                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dee2e6', borderRadius: 8, fontSize: 13 }}>
                        <option value=''>Таңдаңыз</option>
                        {compNames.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={submitPrep} style={{
                        background: '#2f9e44', color: '#fff', border: 'none', borderRadius: 8,
                        padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                      }}>Сақтау</button>
                      <button onClick={() => setShowPrepForm(false)} style={{
                        background: '#e9ecef', color: '#495057', border: 'none', borderRadius: 8,
                        padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                      }}>Болдырмау</button>
                    </div>
                  </div>
                )}

                {/* Preparations table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1.5px solid #e9ecef' }}>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#868e96', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>##</th>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#868e96', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                          <i className="fas fa-trophy" style={{ marginRight: 8, color: '#a78bfa' }}></i>
                          ОЛИМПИАДА ТҮРІ
                        </th>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#868e96', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                          <i className="fas fa-book" style={{ marginRight: 8, color: '#22c55e' }}></i>
                          ПӘН
                        </th>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#868e96', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Оқушы</th>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#868e96', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Күйі</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preparations.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#adb5bd' }}>
                            Өтінімдер жоқ
                          </td>
                        </tr>
                      ) : preparations.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: '#e7f5ff',
                              color: '#1971c2', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                            }}>{i + 1}</div>
                          </td>
                          <td style={{ padding: '14px 20px', fontWeight: 500 }}>{p.competition_type || '—'}</td>
                          <td style={{ padding: '14px 20px', color: '#495057' }}>{p.competition_subtype || '—'}</td>
                          <td style={{ padding: '14px 20px', color: '#495057' }}>{p.student_name || '—'}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                              background: p.status === 'completed' ? '#ebfbee' : '#e7f5ff',
                              color: p.status === 'completed' ? '#2f9e44' : '#1971c2'
                            }}>{p.status === 'completed' ? 'Аяқталды' : 'Дайындалуда'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Оқушылармен қосымша жұмыс' && (
            <div style={{ display: 'grid', gap: 18 }}>
              <div style={{ background: 'linear-gradient(135deg,#1e1b8f,#4338ca)', borderRadius: 20, padding: 24, color: '#fff' }}>
                <h2 style={{ fontSize: 24, marginBottom: 6 }}>Оқушылармен қосымша жұмыс</h2>
                <p style={{ color: 'rgba(255,255,255,.85)', marginBottom: 16 }}>Дарынды және үлгерімі төмен оқушыларды басқару</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button onClick={() => setSupportModal('student')} style={{ border: 'none', background: '#22c55e', color: '#fff', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}><i className="fas fa-plus" style={{ marginRight: 8 }}></i>Оқушы қосу</button>
                  <button onClick={() => { setReportForm((f) => ({ ...f, report_type: 'gifted' })); setSupportModal('giftedReport'); }} style={{ border: 'none', background: '#f59e0b', color: '#fff', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}><i className="fas fa-star" style={{ marginRight: 8 }}></i>Дарынды есеп</button>
                  <button onClick={() => { setReportForm((f) => ({ ...f, report_type: 'underperforming' })); setSupportModal('weakReport'); }} style={{ border: 'none', background: '#ef4444', color: '#fff', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}><i className="fas fa-hand-holding-heart" style={{ marginRight: 8 }}></i>Үлгерімі есеп</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.3)', borderRadius: 14, padding: 16, background: 'rgba(255,255,255,.07)' }}>
                    <div style={{ fontSize: 14, opacity: .9 }}>Дарынды оқушылар</div>
                    <div style={{ fontWeight: 800, fontSize: 30 }}>{studentProfiles.filter((p) => p.profile_type === 'gifted').length}</div>
                  </div>
                  <div style={{ border: '1px solid rgba(255,255,255,.3)', borderRadius: 14, padding: 16, background: 'rgba(255,255,255,.07)' }}>
                    <div style={{ fontSize: 14, opacity: .9 }}>Үлгерімі төмен оқушылар</div>
                    <div style={{ fontWeight: 800, fontSize: 30 }}>{studentProfiles.filter((p) => p.profile_type === 'struggling').length}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 8px 25px rgba(2,6,23,.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <h3 style={{ marginTop: 0 }}>Дарынды оқушылар</h3>
                    {(studentProfiles || []).filter((p) => p.profile_type === 'gifted').map((p) => (
                      <div key={p.id} style={{ border: '1px solid #86efac', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{p.student_name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{p.class_name || '—'} • {p.notes || 'Бағыты көрсетілмеген'}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 style={{ marginTop: 0 }}>Үлгерімі төмен оқушылар</h3>
                    {(studentProfiles || []).filter((p) => p.profile_type === 'struggling').map((p) => (
                      <div key={p.id} style={{ border: '1px solid #fca5a5', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{p.student_name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{p.class_name || '—'} • {p.notes || 'Ескерту жоқ'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 8px 25px rgba(2,6,23,.06)' }}>
                <h3 style={{ marginTop: 0 }}>Менің қосымша жұмыс есептерім</h3>
                {(studentReports || []).map((r) => (
                  <div key={r.id} style={{ border: `1px solid ${r.report_type === 'gifted' ? '#86efac' : '#fca5a5'}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{r.student_name}</div>
                    <div style={{ fontSize: 13, color: '#475569' }}>{r.topic} • {r.subject_name || '—'} • {shortDate(r.report_date)}</div>
                  </div>
                ))}
                {!studentReports.length && <div style={{ color: '#94a3b8' }}>Есептер тізімі бос</div>}
              </div>
            </div>
          )}

          {activeSection === 'Айлық жоспарларым' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 6 }}>Айлық жоспарларым</h2>
              <p style={{ color: '#64748b', marginBottom: 16 }}>Барлық жұмыс жоспарларыңыз бен тапсырмаларыңыз</p>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Жаңа жоспар қосу</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
                      <input value={planForm.title} onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))} placeholder="Жоспар атауы" style={prettyInput} />
                      <input value={planForm.month} onChange={(e) => setPlanForm((p) => ({ ...p, month: e.target.value }))} placeholder="Ай / оқу жылы" style={prettyInput} />
                    </div>
                    {planForm.tasks.map((t, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <input value={t.title} onChange={(e) => setPlanForm((p) => { const tasks = [...p.tasks]; tasks[i] = { ...tasks[i], title: e.target.value }; return { ...p, tasks }; })} placeholder="Тапсырма атауы" style={prettyInput} />
                        <input type="date" value={t.start_date} onChange={(e) => setPlanForm((p) => { const tasks = [...p.tasks]; tasks[i] = { ...tasks[i], start_date: e.target.value }; return { ...p, tasks }; })} style={prettyInput} />
                        <input type="date" value={t.deadline} onChange={(e) => setPlanForm((p) => { const tasks = [...p.tasks]; tasks[i] = { ...tasks[i], deadline: e.target.value }; return { ...p, tasks }; })} style={prettyInput} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={addPlanTaskRow} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>+ Тапсырма</button>
                      <button onClick={saveMonthlyPlan} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>Сақтау</button>
                    </div>
                  </div>
                  {monthlyPlans.map((p) => (
                    <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontWeight: 700 }}>{p.title}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{p.month || '—'} • {p.tasks?.length || 0} тапсырма</div>
                      <button onClick={() => openPlanDetail(p.id)} style={{ marginTop: 8, border: 'none', background: '#4f46e5', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>Жоспарға кіру</button>
                    </div>
                  ))}
                  {planDetail && (
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 18 }}>{planDetail.title}</div>
                          <div style={{ color: '#64748b', fontSize: 13 }}>{planDetail.month || '—'}</div>
                        </div>
                        <button onClick={() => setPlanDetail(null)} style={{ border: 'none', background: '#e2e8f0', borderRadius: 8, padding: '6px 10px' }}>Жабу</button>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        {(planDetail.tasks || []).map((t) => (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                            <input type="checkbox" checked={t.status === 'done'} onChange={async () => { await togglePlanTask(t); openPlanDetail(planDetail.id); }} />
                            <span>{t.title} ({t.start_date || '—'} — {t.deadline || '—'})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {!monthlyPlans.length && <div style={{ color: '#94a3b8' }}>Жоспарлар әлі жоқ</div>}
                </div>
              )}
            </div>
          )}

          {activeSection === 'ҚМЖ' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 6 }}>ҚМЖ - Қысқа мерзімді жоспар</h2>
              <p style={{ color: '#64748b', marginBottom: 16 }}>Сабақтың қысқа мерзімді жоспарларын басқару</p>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <>
                <div style={{ marginBottom: 12 }}>
                  <button onClick={() => setQmgFormOpen(!qmgFormOpen)} style={{ border: 'none', background: 'linear-gradient(135deg,#6366f1,#9333ea)', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}>
                    {qmgFormOpen ? 'Жабу' : 'ИИ арқылы ҚМЖ құру'}
                  </button>
                </div>
                {qmgFormOpen && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
                      <input value={qmgForm.title} onChange={(e) => setQmgForm((f) => ({ ...f, title: e.target.value }))} placeholder="Сабақ атауы" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <select value={qmgForm.subject_id} onChange={(e) => setQmgForm((f) => ({ ...f, subject_id: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                        <option value="">Пән</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <input value={qmgForm.class_category} onChange={(e) => setQmgForm((f) => ({ ...f, class_category: e.target.value }))} placeholder="Сынып" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <input type="number" value={qmgForm.duration_mins} onChange={(e) => setQmgForm((f) => ({ ...f, duration_mins: e.target.value }))} placeholder="Минут" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    </div>
                    <button onClick={saveQmgGenerated} style={{ marginTop: 8, border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>ИИ арқылы генерациялау</button>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
                  {(qmgItems || []).map((q) => (
                    <div key={q.id} onClick={() => setQmgDetail(q)} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{q.title}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{q.subject_name || 'Пән жоқ'} • {q.class_category || '—'}</div>
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        <span style={{ background: q.status === 'ready' ? '#dcfce7' : '#fef3c7', color: q.status === 'ready' ? '#166534' : '#92400e', padding: '2px 8px', borderRadius: 999 }}>
                          {q.status === 'ready' ? 'Белсенді' : 'Күту'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!qmgItems.length && <div style={{ color: '#94a3b8' }}>ҚМЖ тізімі бос</div>}
                </div>
                {qmgDetail && (
                  <div style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{qmgDetail.title}</div>
                      <button onClick={() => setQmgDetail(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, padding: '4px 10px' }}>Жабу</button>
                    </div>
                    <div style={{ color: '#64748b', marginBottom: 8 }}>{qmgDetail.subject_name || '—'} • {qmgDetail.class_category || '—'} • {qmgDetail.duration_mins || 45} мин</div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, background: '#f8fafc', borderRadius: 8, padding: 10 }}>
                      Жоспар мазмұны генерацияланды. ҚМЖ дайын болғанда осы карточкада толық контент көрсетіледі.
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          )}

          {activeSection === 'Сабаққа ену' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 6 }}>Сабаққа ену</h2>
              <p style={{ color: '#64748b', marginBottom: 16 }}>Менің сабаққа ену жазбаларым</p>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ border: '1px solid #dbeafe', borderRadius: 14, padding: 14, background: '#f8fbff' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Жаңа есеп</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                      <div>
                        <label style={prettyLabel}>Күні</label>
                        <input type="date" min={new Date().toISOString().slice(0, 10)} value={visitForm.visit_date} onChange={(e) => setVisitForm((f) => ({ ...f, visit_date: e.target.value }))} style={prettyInput} />
                      </div>
                      <div>
                        <label style={prettyLabel}>Мұғалім</label>
                        <select value={visitForm.visited_teacher_id} onChange={(e) => onVisitTeacherChange(e.target.value)} style={prettyInput}>
                          <option value="">Мұғалімді таңдаңыз</option>
                          {visitTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={prettyLabel}>Пән</label>
                        <select value={visitForm.subject_id} onChange={(e) => onVisitSubjectChange(e.target.value)} disabled={!visitForm.visited_teacher_id} style={{ ...prettyInput, opacity: visitForm.visited_teacher_id ? 1 : .6 }}>
                          <option value="">{visitForm.visited_teacher_id ? 'Пәнді таңдаңыз' : 'Алдымен мұғалім таңдаңыз'}</option>
                          {visitSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={prettyLabel}>Сынып</label>
                        <select value={visitForm.class_id} onChange={(e) => setVisitForm((f) => ({ ...f, class_id: e.target.value }))} disabled={!visitForm.subject_id} style={{ ...prettyInput, opacity: visitForm.subject_id ? 1 : .6 }}>
                          <option value="">{visitForm.subject_id ? 'Сыныпты таңдаңыз' : 'Алдымен пән таңдаңыз'}</option>
                          {visitClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={prettyLabel}>Сабақ тақырыбы</label>
                        <input value={visitForm.topic} onChange={(e) => setVisitForm((f) => ({ ...f, topic: e.target.value }))} placeholder="Тақырып" style={prettyInput} />
                      </div>
                      <div>
                        <label style={prettyLabel}>Сабақ түрі</label>
                        <input value={visitForm.lesson_type} onChange={(e) => setVisitForm((f) => ({ ...f, lesson_type: e.target.value }))} placeholder="Ашық сабақ / т.б." style={prettyInput} />
                      </div>
                      <div>
                        <label style={prettyLabel}>Оқушы саны</label>
                        <input value={visitForm.students_total} onChange={(e) => setVisitForm((f) => ({ ...f, students_total: e.target.value }))} placeholder="Жалпы саны" style={prettyInput} />
                      </div>
                      <div>
                        <label style={prettyLabel}>Қатысқаны</label>
                        <input value={visitForm.students_present} onChange={(e) => setVisitForm((f) => ({ ...f, students_present: e.target.value }))} placeholder="Қатысқаны" style={prettyInput} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={prettyLabel}>Сабақты ұйымдастыру</label>
                        <textarea rows={2} value={visitForm.organization} onChange={(e) => setVisitForm((f) => ({ ...f, organization: e.target.value }))} placeholder="Ұйымдастыру туралы" style={{ ...prettyInput, minHeight: 72 }} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={prettyLabel}>Қорытынды пікір</label>
                        <textarea rows={2} value={visitForm.overall_conclusion} onChange={(e) => setVisitForm((f) => ({ ...f, overall_conclusion: e.target.value }))} placeholder="Сабаққа қорытынды пікір" style={{ ...prettyInput, minHeight: 72 }} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={prettyLabel}>Фото есеп</label>
                        <input type="file" accept="image/*" onChange={(e) => setVisitPhoto(e.target.files?.[0] || null)} style={prettyInput} />
                        {visitPhoto && <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>{visitPhoto.name}</div>}
                      </div>
                    </div>
                    <button onClick={saveVisit} style={{ marginTop: 10, border: 'none', background: '#7c3aed', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>Сақтау</button>
                  </div>
                  {(lessonVisits || []).map((v) => (
                    <div key={v.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontWeight: 700 }}>{v.topic || 'Сабақ атауы'}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>
                        {v.visited_teacher_name || '—'} • {v.subject_name || '—'} • {v.class_name || '—'} • {shortDate(v.visit_date)}
                      </div>
                      <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{v.overall_conclusion || 'Қорытынды пікір жоқ'}</div>
                      {v.photo_url && (
                        <div style={{ marginTop: 8 }}>
                          <img src={getImageUrl(v.photo_url)} alt="visit" style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        </div>
                      )}
                    </div>
                  ))}
                  {!lessonVisits.length && <div style={{ color: '#94a3b8' }}>Сабаққа ену деректері жоқ</div>}
                </div>
              )}
            </div>
          )}

          {activeSection === 'Іс-шаралар' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 6 }}>Іс-шаралар</h2>
              <p style={{ color: '#64748b', marginBottom: 16 }}>Мектептің барлық іс-шаралары</p>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                    <button onClick={() => setEventFormOpen((p) => !p)} style={{ border: 'none', background: '#db2777', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>
                      {eventFormOpen ? 'Жабу' : 'Жаңа іс-шара қосу'}
                    </button>
                    {eventFormOpen && (
                      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                        <input value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} placeholder="Атауы" style={prettyInput} />
                        <select value={eventForm.event_type_id} onChange={(e) => setEventForm((f) => ({ ...f, event_type_id: e.target.value }))} style={prettyInput}>
                          <option value="">Іс-шара түрі</option>
                          {eventTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input type="date" value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))} style={prettyInput} />
                        <input type="time" value={eventForm.time} onChange={(e) => setEventForm((f) => ({ ...f, time: e.target.value }))} style={prettyInput} />
                        <input value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} placeholder="Өтетін орны" style={prettyInput} />
                        <textarea value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} placeholder="Сипаттама" rows={2} style={{ ...prettyInput, minHeight: 72 }} />
                        <button onClick={saveEvent} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>Сақтау</button>
                      </div>
                    )}
                  </div>
                  {events.map((e) => (
                    <div key={e.id} style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 700 }}>{e.title}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{shortDate(e.date)} {e.time ? `• ${e.time}` : ''}</div>
                    </div>
                  ))}
                  {!events.length && <div style={{ padding: 18, color: '#94a3b8' }}>Іс-шаралар жоқ</div>}
                </div>
              )}
            </div>
          )}

          {activeSection === 'Менің материалдарым' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 6 }}>Менің материалдарым</h2>
              <p style={{ color: '#64748b', marginBottom: 16 }}>Жасалған оқу материалдарыңыз</p>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <button onClick={() => setMaterialFormOpen(!materialFormOpen)} style={{ border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}>
                      {materialFormOpen ? 'Жабу' : 'Жаңа материал қосу'}
                    </button>
                  </div>
                  {materialFormOpen && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
                        <input value={materialForm.title} onChange={(e) => setMaterialForm((f) => ({ ...f, title: e.target.value }))} placeholder="Материал атауы" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                        <select value={materialForm.subject_id} onChange={(e) => setMaterialForm((f) => ({ ...f, subject_id: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                          <option value="">Пән</option>
                          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input value={materialForm.direction} onChange={(e) => setMaterialForm((f) => ({ ...f, direction: e.target.value }))} placeholder="Бағыт" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                        <input value={materialForm.class_category} onChange={(e) => setMaterialForm((f) => ({ ...f, class_category: e.target.value }))} placeholder="Сынып" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      </div>
                      <button onClick={saveMaterialGenerated} style={{ marginTop: 8, border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>ЖИ материал жасау</button>
                    </div>
                  )}
                  {qmgItems.map((m) => (
                    <div key={m.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontWeight: 700 }}>{m.title}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{m.subject_name || '—'} • {m.class_category || '—'}</div>
                    </div>
                  ))}
                  {!qmgItems.length && <div style={{ color: '#94a3b8' }}>Материалдар табылмады</div>}
                </div>
              )}
            </div>
          )}

          {activeSection === 'Менің рейтингім' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 6 }}>Рейтинг кестесі</h2>
              <p style={{ color: '#64748b', marginBottom: 16 }}>Жалпы рейтинг — барлық бағыттардың ұпайларының қосындысы</p>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <>
                  <div style={{ marginBottom: 16, fontSize: 20, fontWeight: 800 }}>{ratingRows[0]?.total_points || 0} ұпай</div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
                    Олимпиада, Жарыс жетістіктер, Іс-шаралар, Оқушылармен қосымша жұмыс, Өз жетістіктері, Сынып жетекші, Сабаққа ену —
                    осы бағыттар бойынша ұпай жиналады.
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'Класс ақпараттары' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Сынып таңдау</h2>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <>
                  {homeroom.is_homeroom && homeroom.classData ? (
                    <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700 }}>{homeroom.classData.name}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{homeroom.students.length} оқушы</div>
                    </div>
                  ) : <div style={{ color: '#94a3b8' }}>Сынып жетекшілігі тағайындалмаған</div>}
                </>
              )}
            </div>
          )}

          {activeSection === 'Тәрбиешің ұяшығы' && (
            renderStudentWorkPicker('Тәрбиешің ұяшығы')
          )}

          {activeSection === 'Оқушы мамандығы' && (
            renderStudentWorkPicker('Оқушы мамандығы')
          )}

          {activeSection === 'Дарынды оқушылар' && (
            renderStudentWorkPicker('Дарынды оқушылар')
          )}

          {activeSection === 'Менің аттестацияларым' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Менің аттестацияларым</h2>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Жаңа аттестация қосу</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 8 }}>
                      <select value={attForm.type_id} onChange={(e) => setAttForm((f) => ({ ...f, type_id: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                        <option value="">Аттестация түрі</option>
                        {attTypes.map((t) => <option key={t.id} value={t.id}>{t.name_kz}</option>)}
                      </select>
                      <input type="date" value={attForm.issued_at} onChange={(e) => setAttForm((f) => ({ ...f, issued_at: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <input value={attForm.document_url} onChange={(e) => setAttForm((f) => ({ ...f, document_url: e.target.value }))} placeholder="Құжат URL (қаласаңыз)" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <button onClick={saveAttestation} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '0 14px', fontWeight: 700 }}>Сақтау</button>
                    </div>
                  </div>
                  {attestations.map((a) => (
                    <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{a.type_name || a.attestation_type || 'Аттестация'}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>Қазіргі күні: {shortDate(a.issued_at)}</div>
                      <div style={{ color: '#16a34a', fontSize: 13 }}>Келесі аттестация: {shortDate(a.expires_at)}</div>
                      {(a.document_url || a.certificate_url) && (
                        <a href={a.document_url || a.certificate_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 13, textDecoration: 'none' }}>
                          Құжатты жүктеу
                        </a>
                      )}
                    </div>
                  ))}
                  {!attestations.length && <div style={{ color: '#94a3b8' }}>Аттестациялар жоқ</div>}
                </div>
              )}
            </div>
          )}

          {activeSection === 'Курстар' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 24, marginBottom: 6 }}>Курстар</h2>
                  <p style={{ color: '#64748b' }}>Оқыған тақырып, оқыған мерзім, сертификат және келесі оқу уақыты.</p>
                </div>
                <button
                  onClick={() => setCourseFormOpen((p) => !p)}
                  style={{ border: 'none', background: '#0f766e', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <i className={`fas ${courseFormOpen ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: 8 }}></i>
                  {courseFormOpen ? 'Жабу' : 'Курс қосу'}
                </button>
              </div>

              {courseFormOpen && (
                <div style={{ border: '1px solid #99f6e4', background: '#f0fdfa', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                    <div>
                      <label style={prettyLabel}>Курс атауы</label>
                      <input value={courseForm.title} onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))} placeholder="Мысалы: Инклюзивті білім беру" style={prettyInput} />
                    </div>
                    <div>
                      <label style={prettyLabel}>Оқыған тақырыбы</label>
                      <input value={courseForm.topic} onChange={(e) => setCourseForm((f) => ({ ...f, topic: e.target.value }))} placeholder="Тақырып" style={prettyInput} />
                    </div>
                    <div>
                      <label style={prettyLabel}>Оқып келген жері</label>
                      <input value={courseForm.provider} onChange={(e) => setCourseForm((f) => ({ ...f, provider: e.target.value }))} placeholder="Ұйым / платформа" style={prettyInput} />
                    </div>
                    <div>
                      <label style={prettyLabel}>Басталған күні</label>
                      <input type="date" value={courseForm.started_at} onChange={(e) => setCourseForm((f) => ({ ...f, started_at: e.target.value }))} style={prettyInput} />
                    </div>
                    <div>
                      <label style={prettyLabel}>Оқыған мерзімі</label>
                      <input
                        type="date"
                        value={courseForm.finished_at}
                        onChange={(e) => setCourseForm((f) => ({ ...f, finished_at: e.target.value, next_training_at: f.next_training_at || autoNextCourseDate(e.target.value) }))}
                        style={prettyInput}
                      />
                    </div>
                    <div>
                      <label style={prettyLabel}>Келесі оқу уақыты</label>
                      <input type="date" value={courseForm.next_training_at || autoNextCourseDate(courseForm.finished_at)} onChange={(e) => setCourseForm((f) => ({ ...f, next_training_at: e.target.value }))} style={prettyInput} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={prettyLabel}>Сипаттама</label>
                      <textarea value={courseForm.description} onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Курста не өтті, қандай нәтиже алды" style={{ ...prettyInput, minHeight: 88 }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={prettyLabel}>Сертификаттар / файлдар</label>
                      <input type="file" accept="image/*,.pdf" multiple onChange={(e) => setCourseFiles(Array.from(e.target.files || []))} style={prettyInput} />
                      {!!courseFiles.length && (
                        <div style={{ marginTop: 8, color: '#0f766e', fontSize: 13 }}>
                          {courseFiles.map((f) => f.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={saveCourse}
                    disabled={courseSaving}
                    style={{ marginTop: 12, border: 'none', background: '#0f766e', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', opacity: courseSaving ? .7 : 1 }}
                  >
                    {courseSaving ? 'Сақталуда...' : 'Курсты сақтау'}
                  </button>
                </div>
              )}

              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {teacherCourses.map((course) => {
                    const nextDate = course.next_training_at ? new Date(course.next_training_at) : null;
                    const soon = nextDate && (nextDate.getTime() - Date.now()) <= 1000 * 60 * 60 * 24 * 45;
                    return (
                      <div key={course.id} style={{ border: `1px solid ${soon ? '#f59e0b' : '#ccfbf1'}`, borderRadius: 14, padding: 14, background: soon ? '#fffbeb' : '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 17 }}>{course.title}</div>
                            <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
                              {course.topic || 'Тақырып көрсетілмеген'} • {course.provider || 'Оқу орны көрсетілмеген'}
                            </div>
                          </div>
                          <span style={{ alignSelf: 'flex-start', background: soon ? '#fef3c7' : '#ccfbf1', color: soon ? '#92400e' : '#0f766e', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>
                            {soon ? 'Келесі оқу жақын' : 'Жоспарланған'}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginTop: 12 }}>
                          <div><span style={{ color: '#64748b', fontSize: 12 }}>Басталуы</span><div style={{ fontWeight: 700 }}>{shortDate(course.started_at)}</div></div>
                          <div><span style={{ color: '#64748b', fontSize: 12 }}>Оқыған мерзімі</span><div style={{ fontWeight: 700 }}>{shortDate(course.finished_at)}</div></div>
                          <div><span style={{ color: '#64748b', fontSize: 12 }}>Келесі оқу</span><div style={{ fontWeight: 700, color: '#0f766e' }}>{shortDate(course.next_training_at)}</div></div>
                        </div>
                        {course.description && <p style={{ color: '#475569', marginTop: 10, fontSize: 14 }}>{course.description}</p>}
                        {!!course.files?.length && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                            {course.files.map((file) => (
                              <a key={file.id} href={getImageUrl(file.file_url)} target="_blank" rel="noreferrer" style={{ border: '1px solid #99f6e4', color: '#0f766e', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                                <i className="fas fa-paperclip" style={{ marginRight: 6 }}></i>{file.file_name || 'Файл'}
                              </a>
                            ))}
                          </div>
                        )}
                        <button onClick={() => deleteCourse(course.id)} style={{ marginTop: 10, border: 'none', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer' }}>
                          Жою
                        </button>
                      </div>
                    );
                  })}
                  {!teacherCourses.length && <div style={{ color: '#94a3b8' }}>Курстар әлі қосылмаған</div>}
                </div>
              )}
            </div>
          )}

          {activeSection === 'Кітапхана' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Кітапхана</h2>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Жаңа бронь қосу</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <select value={reservationForm.book_id} onChange={(e) => setReservationForm((f) => ({ ...f, book_id: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                        <option value="">Кітап</option>
                        {libraryBooks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                      </select>
                      <input value={reservationForm.user_search} onChange={(e) => searchReservationUsers(e.target.value)} placeholder="Пайдаланушы (ФИО/ИИН)" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <input type="date" value={reservationForm.borrow_date} onChange={(e) => setReservationForm((f) => ({ ...f, borrow_date: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <input type="date" value={reservationForm.return_date} onChange={(e) => setReservationForm((f) => ({ ...f, return_date: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <select value={reservationForm.status} onChange={(e) => setReservationForm((f) => ({ ...f, status: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                        <option value="issued">Броньде</option>
                        <option value="returned">Қайтарылды</option>
                      </select>
                    </div>
                    {reservationUsers.length > 0 && (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
                        {reservationUsers.map((u) => (
                          <button key={u.id} onClick={() => setReservationForm((f) => ({ ...f, user_id: u.id, user_search: `${u.full_name} (${u.iin})` }))} style={{ width: '100%', textAlign: 'left', border: 'none', background: '#fff', padding: '8px 10px', cursor: 'pointer' }}>
                            {u.full_name} — {u.iin}
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={saveReservation} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>Сақтау</button>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                    {reservations
                      .filter((r) => !reservationSearch || `${r.book_title} ${r.user_name} ${r.user_iin}`.toLowerCase().includes(reservationSearch.toLowerCase()))
                      .map((r) => (
                      <div key={r.id} style={{ padding: 12, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.book_title}</div>
                          <div style={{ color: '#64748b', fontSize: 13 }}>{r.user_name} • {r.user_iin}</div>
                          <div style={{ color: '#64748b', fontSize: 12 }}>{shortDate(r.borrow_date)} — {shortDate(r.return_date)}</div>
                        </div>
                        <div>
                          <span style={{ background: r.status === 'returned' ? '#dcfce7' : '#fef3c7', color: r.status === 'returned' ? '#166534' : '#92400e', borderRadius: 999, padding: '4px 8px', fontSize: 12 }}>{r.status === 'returned' ? 'Қайтарылды' : 'Броньде'}</span>
                          {r.status !== 'returned' && (
                            <button onClick={async () => { const x = await api.library.reservations.return(r.id); if (x.success) loadExtendedSection('Кітапхана'); }} style={{ display: 'block', marginTop: 8, border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                              Қайтарылды деп белгілеу
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!reservations.length && <div style={{ padding: 16, color: '#94a3b8' }}>Броньдар тізімі бос</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'Марапаттар' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Марапаттар</h2>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ border: '1px solid #f59e0b', borderRadius: 12, padding: 12, background: 'linear-gradient(90deg,#f59e0b,#f97316)', color: '#fff' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Жаңа марапат қосу</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr auto', gap: 8 }}>
                      <select value={awardForm.student_id} onChange={(e) => setAwardForm((f) => ({ ...f, student_id: e.target.value }))} style={prettyInput}>
                        <option value="">Алушы</option>
                        {(classStudents || homeroom.students || []).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                      </select>
                      <input value={awardForm.award_type} onChange={(e) => setAwardForm((f) => ({ ...f, award_type: e.target.value }))} placeholder="Мадақтама түрі" style={prettyInput} />
                      <input value={awardForm.reason} onChange={(e) => setAwardForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Не үшін алды" style={prettyInput} />
                      <input value={awardForm.reg_number} onChange={(e) => setAwardForm((f) => ({ ...f, reg_number: e.target.value }))} placeholder="Тіркеу нөмірі" style={prettyInput} />
                      <input type="date" value={awardForm.award_date} onChange={(e) => setAwardForm((f) => ({ ...f, award_date: e.target.value }))} style={prettyInput} />
                      <button onClick={saveAward} style={{ border: 'none', background: '#111827', color: '#fff', borderRadius: 8, padding: '0 12px', fontWeight: 700 }}>Сақтау</button>
                    </div>
                  </div>
                  {studentReports.map((a) => (
                    <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{a.competition_name || 'Жетістік'}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{a.student_name || '—'} • {a.level || '—'}</div>
                    </div>
                  ))}
                  {!studentReports.length && <div style={{ color: '#94a3b8' }}>Марапаттар жоқ</div>}
                </div>
              )}
            </div>
          )}

          {activeSection === 'Жеке жетістіктерім' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Менің жетістіктерім</h2>
              {sectionBusy ? <div style={{ color: '#94a3b8' }}>Жүктелуде...</div> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Жетістік қосу</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 8 }}>
                      <input value={achievementForm.competition_name} onChange={(e) => setAchievementForm((f) => ({ ...f, competition_name: e.target.value }))} placeholder="Атауы" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <input value={achievementForm.description} onChange={(e) => setAchievementForm((f) => ({ ...f, description: e.target.value }))} placeholder="Сипаттама" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <select value={achievementForm.achievement_type} onChange={(e) => setAchievementForm((f) => ({ ...f, achievement_type: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                        <option value="">Вид</option>
                        <option value="Алғыс хат">Алғыс хат</option>
                        <option value="Диплом">Диплом</option>
                        <option value="Мадақтама">Мадақтама</option>
                        <option value="Сертификат">Сертификат</option>
                      </select>
                      <select value={achievementForm.level} onChange={(e) => setAchievementForm((f) => ({ ...f, level: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                        <option value="">Деңгейі</option>
                        <option value="Мектеп аралық">Мектеп аралық</option>
                        <option value="Аудандық">Аудандық</option>
                        <option value="Облыстық">Облыстық</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 8 }}>
                      <input type="date" value={achievementForm.achievement_date} onChange={(e) => setAchievementForm((f) => ({ ...f, achievement_date: e.target.value }))} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <input value={achievementForm.place_rank} onChange={(e) => setAchievementForm((f) => ({ ...f, place_rank: e.target.value }))} placeholder="Орын/ранг" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <button onClick={saveAchievement} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 700 }}>Сақтау</button>
                    </div>
                  </div>
                  {studentReports.map((a) => (
                    <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{a.competition_name || 'Жетістік'}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{a.achievement_type || '—'} • {shortDate(a.achievement_date)}</div>
                    </div>
                  ))}
                  {!studentReports.length && <div style={{ color: '#94a3b8' }}>Расталған жетістіктер жоқ</div>}
                </div>
              )}
            </div>
          )}

          {activeSection === 'Профиль өзгерту' && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.05)', maxWidth: 860, position: 'relative' }}>
              <button onClick={connectTelegram} disabled={telegramBusy} style={{
                position: 'absolute',
                top: 18,
                right: 18,
                width: 42,
                height: 42,
                borderRadius: '50%',
                border: 'none',
                background: telegramStatus?.linked ? '#dcfce7' : '#e0f2fe',
                color: telegramStatus?.linked ? '#15803d' : '#0284c7',
                cursor: telegramBusy ? 'wait' : 'pointer',
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }} title={telegramStatus?.linked ? 'Telegram қосылған' : 'Telegram қосу'}>
                <i className="fab fa-telegram-plane"></i>
              </button>
              <h2 style={{ fontSize: 24, marginBottom: 8, paddingRight: 56 }}>Профиль өзгерту</h2>
              {telegramLink?.code && (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: '#f0f9ff', color: '#0369a1', fontSize: 13 }}>
                  Telegram коды: <strong>{telegramLink.code}</strong>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20 }}>
                <div>
                  <div style={{ width: 130, height: 130, borderRadius: '50%', overflow: 'hidden', border: '3px solid #e2e8f0', marginBottom: 10 }}>
                    {profilePhotoPreview ? (
                      <img src={profilePhotoPreview} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}>
                        {profileForm.full_name?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  <label style={{ display: 'inline-block', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}>
                    Сурет таңдау
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setProfilePhotoFile(file);
                      setProfilePhotoPreview(URL.createObjectURL(file));
                    }} />
                  </label>
                </div>
                <div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <input value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Толық аты-жөні" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    <input value={profileForm.iin} onChange={(e) => setProfileForm((p) => ({ ...p, iin: e.target.value }))} placeholder="ЖСН (ИИН)" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    <input value={user.role || ''} readOnly placeholder="Рөлі" style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} />
                    <input value={profileForm.position} onChange={(e) => setProfileForm((p) => ({ ...p, position: e.target.value }))} placeholder="Лауазымы" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={saveProfile} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
                      Өзгерістерді сақтау
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 18, paddingTop: 18 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Құпия сөзді өзгерту</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input type="password" value={profileForm.current_password} onChange={(e) => setProfileForm((p) => ({ ...p, current_password: e.target.value }))} placeholder="Ағымдағы құпия сөз" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                  <input type="password" value={profileForm.new_password} onChange={(e) => setProfileForm((p) => ({ ...p, new_password: e.target.value }))} placeholder="Жаңа құпия сөз" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                  <input type="password" value={profileForm.confirm_password} onChange={(e) => setProfileForm((p) => ({ ...p, confirm_password: e.target.value }))} placeholder="Құпия сөзді растау" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={changePassword} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
                    Құпия сөзді өзгерту
                  </button>
                </div>
              </div>
            </div>
          )}

          {supportModal && (
            <div onClick={() => setSupportModal('')} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: '#fff', borderRadius: 14, padding: 18, maxHeight: '88vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ margin: 0 }}>
                    {supportModal === 'student' ? 'Оқушы қосу' : supportModal === 'giftedReport' ? 'Дарынды есеп' : 'Үлгерімі есеп'}
                  </h3>
                  <button onClick={() => setSupportModal('')} style={{ border: 'none', background: '#e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Жабу</button>
                </div>

                {supportModal === 'student' && (
                  <div>
                    <input
                      value={supportSearch}
                      onChange={(e) => searchSupportStudents(e.target.value)}
                      placeholder="ФИО немесе ИИН арқылы іздеу..."
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }}
                    />
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                      {supportResults.map((s) => (
                        <button key={s.id} onClick={() => setSelectedSupportStudent(s)} style={{ width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid #f1f5f9', background: selectedSupportStudent?.id === s.id ? '#e0e7ff' : '#fff', padding: 10, cursor: 'pointer' }}>
                          {s.full_name} — {s.iin}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button onClick={() => attachSupportStudent('gifted')} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>Дарынды</button>
                      <button onClick={() => attachSupportStudent('underperforming')} style={{ border: 'none', background: '#ef4444', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}>Үлгерімі төмен</button>
                    </div>
                  </div>
                )}

                {(supportModal === 'giftedReport' || supportModal === 'weakReport') && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <input type="date" value={reportForm.report_date} onChange={(e) => setReportForm((f) => ({ ...f, report_date: e.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }} />
                      <select value={reportForm.subject_id} onChange={(e) => setReportForm((f) => ({ ...f, subject_id: e.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }}>
                        <option value="">Пәнді таңдаңыз</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <input value={reportForm.topic} onChange={(e) => setReportForm((f) => ({ ...f, topic: e.target.value }))} placeholder="Сабақ тақырыбы" style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }} />
                      <input value={reportForm.task_type} onChange={(e) => setReportForm((f) => ({ ...f, task_type: e.target.value }))} placeholder="Тапсырма түрі" style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }} />
                    </div>
                    <textarea rows={3} value={reportForm.feedback} onChange={(e) => setReportForm((f) => ({ ...f, feedback: e.target.value }))} placeholder="Қорытынды пікір" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }} />
                    <button onClick={async () => { await saveStudentReport(); setSupportModal(''); }} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '9px 14px', fontWeight: 700 }}>Есепті сақтау</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PLACEHOLDER sections — coming soon
              ══════════════════════════════════════════════════ */}
          {![
            'Тапсырмалар',
            'Жарыс жетістіктерім',
            'Оқушылармен қосымша жұмыс',
            'Айлық жоспарларым',
            'ҚМЖ',
            'Сабаққа ену',
            'Іс-шаралар',
            'Менің рейтингім',
            'Менің материалдарым',
            'Класс ақпараттары',
            'Менің аттестацияларым',
            'Курстар',
            'Тәрбиешің ұяшығы',
            'Кітапхана',
            'Оқушы мамандығы',
            'Дарынды оқушылар',
            'Марапаттар',
            'Жеке жетістіктерім',
            'Профиль өзгерту'
          ].includes(activeSection) && (
            <div style={{
              background: '#fff', borderRadius: 20, padding: '60px 24px',
              textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,.05)'
            }}>
              <div style={{ fontSize: 52, marginBottom: 16, color: SECTION_ICONS[activeSection]?.color || '#64748b' }}>
                <i className={`fas ${SECTION_ICONS[activeSection]?.icon || 'fa-folder-open'}`}></i>
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>{activeSection}</h2>
              <p style={{ color: '#adb5bd', fontSize: 14 }}>Бұл бөлім жақында қосылады</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
