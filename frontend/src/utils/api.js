/* ============================================================
   API Client — Centralized fetch wrapper
   ============================================================ */

const DEV_BACKEND_PORT = '3001';
const DEV_FRONTEND_PORT = '5010';
const DIRECT_BACKEND_PORTS = ['5500', '5173'];

const API_BASE = DIRECT_BACKEND_PORTS.includes(window.location.port)
  ? `http://${window.location.hostname}:${DEV_BACKEND_PORT}/api`
  : '/api';

const api = {
  /* ─── Token helpers ─────────────────────────────────────── */
  getToken: () => localStorage.getItem('school_token'),
  setToken: (t) => localStorage.setItem('school_token', t),
  removeToken: () => localStorage.removeItem('school_token'),

  getUser: () => {
    try { return JSON.parse(localStorage.getItem('school_user')); }
    catch { return null; }
  },
  setUser: (u) => {
    localStorage.setItem('school_user', JSON.stringify(u));
    if (u?.school_slug) localStorage.setItem('school_tenant_slug', u.school_slug);
    else if (u?.role === 'super_admin') localStorage.removeItem('school_tenant_slug');
  },
  removeUser: () => {
    localStorage.removeItem('school_user');
    localStorage.removeItem('school_tenant_slug');
  },

  getOriginalToken: () => localStorage.getItem('school_original_token'),
  setOriginalToken: (t) => localStorage.setItem('school_original_token', t),
  removeOriginalToken: () => localStorage.removeItem('school_original_token'),
  getOriginalUser: () => {
    try { return JSON.parse(localStorage.getItem('school_original_user')); }
    catch { return null; }
  },
  setOriginalUser: (u) => localStorage.setItem('school_original_user', JSON.stringify(u)),
  removeOriginalUser: () => localStorage.removeItem('school_original_user'),
  setOriginalSession: (token, user) => {
    if (!api.getOriginalToken() && token && user) {
      api.setOriginalToken(token);
      api.setOriginalUser(user);
    }
  },
  clearOriginalSession: () => {
    api.removeOriginalToken();
    api.removeOriginalUser();
  },
  isImpersonating: () => {
    const original = api.getOriginalUser();
    return !!api.getOriginalToken() && !!original && original.role === 'super_admin';
  },
  restoreOriginalSession: () => {
    const token = api.getOriginalToken();
    const user = api.getOriginalUser();
    if (!token || !user) return false;
    api.setToken(token);
    api.setUser(user);
    api.clearOriginalSession();
    return true;
  },

  isLoggedIn: () => !!localStorage.getItem('school_token'),
  isAdmin: () => {
    const u = api.getUser();
    return u && (u.role === 'admin' || u.role === 'super_admin');
  },
  isSuperAdmin: () => {
    const u = api.getUser();
    return u && u.role === 'super_admin';
  },
  getHostTenantSlug: () => {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const parts = hostname.split('.');
      if (hostname.endsWith('.localhost') && parts.length >= 2) return parts[0];
      if (parts.length > 2 && parts[0] !== 'www') return parts[0];
    }
    return null;
  },
  getTenantSlug: () => api.getHostTenantSlug(),
  getTenantBasePath: () => '',
  getLoginPath: () => '/login',

  /* ─── Core fetch ────────────────────────────────────────── */
  async request(method, endpoint, data = null, isFormData = false) {
    const headers = {};
    const token = api.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const tenantSlug = api.getTenantSlug();
    if (tenantSlug) headers['X-School-Slug'] = tenantSlug;

    const opts = { method, headers };
    if (data) {
      if (isFormData) opts.body = data;
      else opts.body = JSON.stringify(data);
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, opts);

      // Token expired
      if (res.status === 401) {
        api.removeToken(); api.removeUser();
        window.location.href = api.getLoginPath();
      }

      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      return { success: false, message: 'Желі қатесі. Сервер іске қосылғанын тексеріңіз.' };
    }
  },

  get:    (ep)         => api.request('GET',    ep),
  post:   (ep, data)   => api.request('POST',   ep, data),
  put:    (ep, data)   => api.request('PUT',    ep, data),
  delete: (ep)         => api.request('DELETE', ep),
  upload: (ep, fd)     => api.request('POST',   ep, fd, true),
  uploadPut: (ep, fd)  => api.request('PUT',    ep, fd, true),
  download: async (endpoint, filename) => {
    const headers = {};
    const token = api.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const tenantSlug = api.getTenantSlug();
    if (tenantSlug) headers['X-School-Slug'] = tenantSlug;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Файлды жүктеу мүмкін болмады';
        try {
          const body = await res.json();
          message = body.message || message;
        } catch {}
        return { success: false, message };
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (err) {
      console.error('Download Error:', err);
      return { success: false, message: 'Желі қатесі. Сервер іске қосылғанын тексеріңіз.' };
    }
  },

  schoolContext: () => api.get('/school-context'),

  /* ─── Auth ──────────────────────────────────────────────── */
  auth: {
    login:          (iin, password) => api.post('/auth/login', { iin, password }),
    me:             ()              => api.get('/auth/me'),
    changePassword: (cur, nw)       => api.post('/auth/change-password', { current_password: cur, new_password: nw }),
    updateProfile:  (fd)            => api.uploadPut('/auth/profile', fd),
  },

  /* ─── Users ─────────────────────────────────────────────── */
  users: {
    list:   (params = '') => api.get(`/users?${params}`),
    get:    (id)          => api.get(`/users/${id}`),
    create: (data)        => api.post('/users', data),
    update: (id, data)    => api.put(`/users/${id}`, data),
    delete: (id)          => api.delete(`/users/${id}`),
  },

  userImport: {
    categories: () => api.get('/user-import/categories'),
    upload: (fd) => api.upload('/user-import/upload', fd),
    validate: (data) => api.post('/user-import/validate', data),
    confirm: (data) => api.post('/user-import/confirm', data),
    history: (params = '') => api.get(params ? `/user-import/history?${params}` : '/user-import/history'),
    details: (id, params = '') => api.get(params ? `/user-import/${id}?${params}` : `/user-import/${id}`),
    downloadTemplate: (category) => api.download(
      `/user-import/templates/${category}`,
      `user-import-${category}.xlsx`
    ),
  },

  telegram: {
    status: () => api.get('/telegram/status'),
    linkCode: () => api.post('/telegram/link-code', {}),
    unlink: () => api.post('/telegram/unlink', {}),
  },

  /* ─── Roles ─────────────────────────────────────────────── */
  roles: {
    list:   ()     => api.get('/roles'),
    create: (data) => api.post('/roles', typeof data === 'string' ? { name: data } : data),
    update: (id, d) => api.put(`/roles/${id}`, d),
    delete: (id)   => api.delete(`/roles/${id}`),
  },

  /* ─── News ──────────────────────────────────────────────── */
  news: {
    list:        (params = '') => api.get(`/news?${params}`),
    adminList:   (params = '') => api.get(`/news/admin/all?${params}`),
    latest:      (limit = 3)   => api.get(`/news/latest?limit=${limit}`),
    get:         (id)          => api.get(`/news/${id}`),
    create:      (fd)          => api.upload('/news', fd),
    update:      (id, fd)      => api.uploadPut(`/news/${id}`, fd),
    updateStatus:(id, status)  => api.request('PATCH', `/news/${id}/status`, { status }),
    delete:      (id)          => api.delete(`/news/${id}`),
  },

  /* ─── Slides ─────────────────────────────────────────────── */
  slides: {
    list:   ()       => api.get('/slides'),
    all:    ()       => api.get('/slides/all'),
    create: (fd)     => api.upload('/slides', fd),
    update: (id, fd) => api.uploadPut(`/slides/${id}`, fd),
    delete: (id)     => api.delete(`/slides/${id}`),
  },

  /* ─── Teachers ───────────────────────────────────────────── */
  teachers: {
    list:   (params = '') => api.get(`/teachers?${params}`),
    get:    (id)          => api.get(`/teachers/${id}`),
    create: (fd)          => api.upload('/teachers', fd),
    update: (id, fd)      => api.uploadPut(`/teachers/${id}`, fd),
    delete: (id)          => api.delete(`/teachers/${id}`),
  },

  /* ─── Administration ─────────────────────────────────────── */
  admin: {
    list:   ()           => api.get('/administration'),
    get:    (id)         => api.get(`/administration/${id}`),
    create: (fd)         => api.upload('/administration', fd),
    update: (id, fd)     => api.uploadPut(`/administration/${id}`, fd),
    delete: (id)         => api.delete(`/administration/${id}`),
  },

  /* ─── Gallery ────────────────────────────────────────────── */
  gallery: {
    list:   (params = '') => api.get(`/gallery?${params}`),
    create: (fd)          => api.upload('/gallery', fd),
    delete: (id)          => api.delete(`/gallery/${id}`),
  },

  /* ─── Contact ────────────────────────────────────────────── */
  contact: { send: (data) => api.post('/contact', data) },

  /* ─── Stats ──────────────────────────────────────────────── */
  stats: {
    public:    ()        => api.get('/stats'),
    dashboard: ()        => api.get('/stats/dashboard'),
    update:    (k, v, l) => api.put(`/stats/${k}`, { value: String(v), label: l }),
  },

  /* ─── Academic ───────────────────────────────────────────── */
  academic: {
    stats:      ()              => api.get('/academic/stats'),
    classes:    { list: (p='') => api.get(`/academic/classes?${p}`), get: (id) => api.get(`/academic/classes/${id}`), create: (d) => api.post('/academic/classes', d), update: (id,d) => api.put(`/academic/classes/${id}`, d), delete: (id) => api.delete(`/academic/classes/${id}`) },
    subjects:   {
      list: () => api.get('/academic/subjects'),
      get: (id) => api.get(`/academic/subjects/${id}`),
      create: (d) => api.post('/academic/subjects', d),
      update: (id,d) => api.put(`/academic/subjects/${id}`, d),
      delete: (id) => api.delete(`/academic/subjects/${id}`),
      addTeacher: (id, teacher_id) => api.post(`/academic/subjects/${id}/teachers`, { teacher_id }),
      removeTeacher: (id, tid) => api.delete(`/academic/subjects/${id}/teachers/${tid}`),
      addClass: (id, class_id) => api.post(`/academic/subjects/${id}/classes`, { class_id }),
      removeClass: (id, cid) => api.delete(`/academic/subjects/${id}/classes/${cid}`)
    },
    classrooms: { list: (p='') => api.get(`/academic/classrooms?${p}`), get: (id) => api.get(`/academic/classrooms/${id}`), create: (d) => api.post('/academic/classrooms', d), update: (id,d) => api.put(`/academic/classrooms/${id}`, d), toggleStatus: (id) => api.put(`/academic/classrooms/${id}/toggle-status`, {}), delete: (id) => api.delete(`/academic/classrooms/${id}`) },
    schedule:   {
      list: (p='') => api.get(`/academic/schedule?${p}`),
      summary: () => api.get('/academic/schedule/summary'),
      generate: (d) => api.post('/academic/schedule/generate', d),
      teachers: () => api.get('/academic/schedule/teachers'),
      validate: () => api.get('/academic/schedule/validate'),
      exportCsv: (shift, withTeachers = false) => api.download(
        `/academic/schedule/export?shift=${encodeURIComponent(shift)}&with_teachers=${withTeachers ? 'true' : 'false'}`,
        `schedule-${shift}${withTeachers ? '-teachers' : ''}.csv`
      ),
      create: (d) => api.post('/academic/schedule', d),
      delete: (id) => api.delete(`/academic/schedule/${id}`)
    },
    students:   { list: (p='') => api.get(`/academic/students?${p}`), create: (d) => api.post('/academic/students', d), update: (id,d) => api.put(`/academic/students/${id}`, d), delete: (id) => api.delete(`/academic/students/${id}`) },
    grades:     { list: (p='') => api.get(`/academic/grades?${p}`) },
    plans:      { list: (p='') => api.get(`/academic/plans?${p}`), stats: () => api.get('/academic/plans/stats'), create: (d) => api.post('/academic/plans', d), update: (id,d) => api.put(`/academic/plans/${id}`, d), delete: (id) => api.delete(`/academic/plans/${id}`) },
  },

  /* ─── Tasks ──────────────────────────────────────────────── */
  tasks: {
    list:      (p='') => api.get(`/tasks?${p}`),
    stats:     (p='') => api.get(`/tasks/stats?${p}`),
    get:       (id)   => api.get(`/tasks/${id}`),
    create:    (fd)   => api.upload('/tasks', fd),
    createJson:(d)    => api.post('/tasks/json', d),
    update:    (id,d) => api.put(`/tasks/${id}`, d),
    delete:    (id)   => api.delete(`/tasks/${id}`),
    grade:     (id,d) => api.post(`/tasks/${id}/grade`, d),
  },

  /* ─── Library ────────────────────────────────────────────── */
  library: {
    books: {
      list:   (p='') => api.get(`/library/books?${p}`),
      create: (d)    => api.post('/library/books', d),
      update: (id,d) => api.put(`/library/books/${id}`, d),
      delete: (id)   => api.delete(`/library/books/${id}`)
    },
    reservations: {
      list:   (p='') => api.get(p ? `/library/reservations?${p}` : '/library/reservations'),
      create: (d)    => api.post('/library/reservations', d),
      return: (id)   => api.put(`/library/reservations/${id}/return`, {}),
      searchUsers: (q) => api.get(`/library/users-search?search=${encodeURIComponent(q)}`)
    },
  },

  /* ─── Attestations ───────────────────────────────────────── */
  attestations: {
    list:       ()     => api.get('/attestations'),
    create:     (d)    => api.post('/attestations', d),
    update:     (id,d) => api.put(`/attestations/${id}`, d),
    delete:     (id)   => api.delete(`/attestations/${id}`),
    typesList:  ()     => api.get('/attestations/types'),
    typeCreate: (d)    => api.post('/attestations/types', d),
    typeUpdate: (id,d) => api.put(`/attestations/types/${id}`, d),
    typeDelete: (id)   => api.delete(`/attestations/types/${id}`)
  },

  /* ─── Attendance ─────────────────────────────────────────── */
  attendance: {
    list:    (p='') => api.get(`/attendance?${p}`),
    get:     (id)   => api.get(`/attendance/${id}`),
    summary: ()     => api.get('/attendance/today-summary'),
    create:  (d)    => api.post('/attendance', d),
    update:  (id,d) => api.put(`/attendance/${id}`, d),
    delete:  (id)   => api.delete(`/attendance/${id}`),
  },

  medical: {
    list:   (p='') => api.get(`/medical?${p}`),
    create: (d)    => api.post('/medical', d),
    update: (id,d) => api.put(`/medical/${id}`, d),
    delete: (id)   => api.delete(`/medical/${id}`),
  },

  /* ─── Reports ────────────────────────────────────────────── */
  reports: {
    list:         (p='') => api.get(`/reports?${p}`),
    create:       (fd)   => api.upload('/reports', fd),
    updateStatus: (id,s) => api.put(`/reports/${id}/status`, { status: s }),
    delete:       (id)   => api.delete(`/reports/${id}`),
    generate:     (type) => api.get(`/reports/generate?type=${type}`),
  },

  analytics: {
    performance: () => api.get('/analytics/performance'),
    attendance: () => api.get('/analytics/attendance'),
    teachersLoad: () => api.get('/analytics/teachers-load'),
    systemActivity: () => api.get('/analytics/system-activity'),
  },

  schools: {
    list:   (params = '') => api.get(`/super-admin/schools?${params}`),
    get:    (id) => api.get(`/super-admin/schools/${id}`),
    create: (data) => api.post('/super-admin/schools', data),
    update: (id, data) => api.put(`/super-admin/schools/${id}`, data),
    remove: (id) => api.delete(`/super-admin/schools/${id}`),
    users:  (id, params = '') => api.get(`/super-admin/schools/${id}/users?${params}`),
    resetAdminPassword: (id, data) => api.post(`/super-admin/schools/${id}/admin-password`, data),
  },

  superAdmin: {
    analytics: () => api.get('/super-admin/analytics'),
    auditLogs: (params = '') => api.get(`/super-admin/audit-logs?${params}`),
    impersonate: (schoolId) => api.post(`/super-admin/impersonate/${schoolId}`),
    siteBuilder: {
      templates: () => api.get('/super-admin/site-builder/templates'),
      createTemplate: (data) => api.post('/super-admin/site-builder/templates', data),
      updateTemplate: (id, data) => api.put(`/super-admin/site-builder/templates/${id}`, data),
      styles: () => api.get('/super-admin/site-builder/global-styles'),
      createStyle: (data) => api.post('/super-admin/site-builder/global-styles', data),
      updateStyle: (id, data) => api.put(`/super-admin/site-builder/global-styles/${id}`, data),
      components: () => api.get('/super-admin/site-builder/components'),
      createComponent: (data) => api.post('/super-admin/site-builder/components', data),
      updateComponent: (id, data) => api.put(`/super-admin/site-builder/components/${id}`, data),
    },
    plans: {
      list: () => api.get('/super-admin/plans'),
      create: (data) => api.post('/super-admin/plans', data),
      update: (id, data) => api.put(`/super-admin/plans/${id}`, data),
      delete: (id) => api.delete(`/super-admin/plans/${id}`),
      assignments: () => api.get('/super-admin/plans/assignments'),
      assign: (data) => api.post('/super-admin/plans/assignments', data),
    }
  },

  messages: {
    list:   () => api.get('/messages'),
    send:   (data) => api.post('/messages', data),
    markRead: (id) => api.put(`/messages/${id}/read`),
  },

  notifications: {
    list: () => api.get('/notifications'),
    read: (id) => api.put(`/notifications/${id}/read`),
    create: (data) => api.post('/notifications', data),
  },

  /* ─── Teacher Dashboard Additions ──────────────────────── */
  teacherProfile: {
    stats:    () => api.get('/teacher/dashboard/stats'),
    homeroom: () => api.get('/teacher/dashboard/homeroom'),
  },
  monthlyPlans: {
    list: () => api.get('/monthly-plans'),
    get: (id) => api.get(`/monthly-plans/${id}`),
    create: (d) => api.post('/monthly-plans', d),
    update: (id, d) => api.put(`/monthly-plans/${id}`, d),
    remove: (id) => api.delete(`/monthly-plans/${id}`),
    createTask: (id, d) => api.post(`/monthly-plans/${id}/tasks`, d),
    updateTask: (id, d) => api.put(`/monthly-plans/tasks/${id}`, d),
    removeTask: (id) => api.delete(`/monthly-plans/tasks/${id}`)
  },
  students: {
    myClass: () => api.get('/students/my-class'),
    setProfession: (id, p) => api.put(`/students/${id}/profession`, { profession: p }),
    markAttendance: (d) => api.post('/students/attendance', d),
    search: (q) => api.get(`/students/search?q=${q}`),
    classes: () => api.get('/students/classes'),
    byClass: (id) => api.get(`/students/by-class/${id}`)
  },
  studentReports: {
    list: (p = '') => api.get(p ? `/student-reports?${p}` : '/student-reports'),
    get: (id) => api.get(`/student-reports/${id}`),
    create: (d) => api.post('/student-reports', d),
    delete: (id) => api.delete(`/student-reports/${id}`),
    teacherStatus: (from, to) =>
      api.get(`/student-reports/teacher-status?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  },

  studentProfiles: {
    list: (p = '') => api.get(p ? `/student-profiles?${p}` : '/student-profiles'),
    get: (id) => api.get(`/student-profiles/${id}`),
    create: (d) => api.post('/student-profiles', d),
    update: (id, d) => api.put(`/student-profiles/${id}`, d),
    delete: (id) => api.delete(`/student-profiles/${id}`),
  },

  studentAchievements: {
    list: (p = '') => api.get(p ? `/student-achievements?${p}` : '/student-achievements'),
    get: (id) => api.get(`/student-achievements/${id}`),
    create: (d) => api.post('/student-achievements', d),
    createForm: (fd) => api.upload('/student-achievements', fd),
    update: (id, d) => api.put(`/student-achievements/${id}`, d),
    updateForm: (id, fd) => api.uploadPut(`/student-achievements/${id}`, fd),
    delete: (id) => api.delete(`/student-achievements/${id}`),
  },
  materials: {
    list: () => api.get('/teacher-materials'),
    generate: (d) => api.post('/teacher-materials/generate', d)
  },
  teacherCourses: {
    list: (p = '') => api.get(p ? `/teacher-courses?${p}` : '/teacher-courses'),
    create: (fd) => api.upload('/teacher-courses', fd),
    delete: (id) => api.delete(`/teacher-courses/${id}`)
  },
  qmg: {
    list: () => api.get('/teacher-qmg'),
    generate: (d) => api.post('/teacher-qmg/generate', d)
  },
  visits: {
    list: () => api.get('/lesson-visits'),
    create: (d) => api.post('/lesson-visits', d),
    createForm: (fd) => api.upload('/lesson-visits', fd),
    teacherOptions: () => api.get('/lesson-visits/teachers/options'),
    subjectsByTeacher: (teacherId) => api.get(`/lesson-visits/teachers/${teacherId}/subjects`),
    classesByTeacherSubject: (teacherId, subjectId) => api.get(`/lesson-visits/teachers/${teacherId}/subjects/${subjectId}/classes`)
  },

  /* ─── Site Content ───────────────────────────────────────── */
  siteContent: {
    list:    (section) => api.get(`/site-content?section=${section}`),
    listAll: (section) => api.get(section ? `/site-content/all?section=${section}` : '/site-content/all'),
    create:  (fd)      => api.upload('/site-content', fd),
    update:  (id, fd)  => api.uploadPut(`/site-content/${id}`, fd),
    delete:  (id)      => api.delete(`/site-content/${id}`),
  },

  /* ─── Lesson Observations ───────────────────────────────── */
  lessonObservations: {
    list:   (p='') => api.get(`/lesson-observations?${p}`),
    get:    (id)   => api.get(`/lesson-observations/${id}`),
    delete: (id)   => api.delete(`/lesson-observations/${id}`),
  }
};

/* ─── UI Helpers ─────────────────────────────────────────────── */
function showToast(msg, type = 'info') {
  let tc = document.getElementById('toastContainer');
  if (!tc) { tc = document.createElement('div'); tc.id = 'toastContainer'; tc.className = 'toast-container'; document.body.appendChild(tc); }
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('kk-KZ', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('kk-KZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = [...DIRECT_BACKEND_PORTS, DEV_FRONTEND_PORT].includes(window.location.port)
    ? `http://${window.location.hostname}:${DEV_BACKEND_PORT}`
    : '';
  return `${baseUrl}/${path.startsWith('/') ? path.substring(1) : path}`;
}

function confirmDelete(msg = 'Жойғыңыз келетінін растаңыз?') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-body" style="padding:32px;text-align:center">
          <i class="fas fa-trash" style="font-size:2.5rem;color:var(--danger);margin-bottom:16px;display:block"></i>
          <h3 style="color:var(--text);margin-bottom:8px">Растаңыз</h3>
          <p style="color:var(--text-muted);margin-bottom:24px">${msg}</p>
          <div style="display:flex;gap:12px;justify-content:center">
            <button id="confirmNo" class="btn" style="background:var(--bg-3);border:1px solid var(--border);color:var(--text)">Болдырмау</button>
            <button id="confirmYes" class="btn btn-danger">Жою</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmYes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#confirmNo').onclick  = () => { overlay.remove(); resolve(false); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
  });
}
export { showToast, formatDate, formatDateTime, getImageUrl, confirmDelete };
export default api;
