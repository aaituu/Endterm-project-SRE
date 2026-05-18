import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.js';
import api, { showToast } from '../utils/api.js';
import StudentWorkPanel from '../components/StudentWorkPanel.js';
import '../../css/style.css';
import '../../css/admin.css';

const roleConfigMap = {
  student: {
    title: 'Оқушы кабинеті',
    sections: ['Үй тапсырмалары', 'Сабақ кестесі', 'Сыныптастарым', 'Бағалар', 'Қатысу', 'Есептер'],
    summary: [
      { key: 'tasks', label: 'Тапсырмалар', icon: 'fas fa-clipboard-list' },
      { key: 'grades', label: 'Бағалар', icon: 'fas fa-chart-line' },
      { key: 'attendance', label: 'Қатысу', icon: 'fas fa-user-check' },
      { key: 'reports', label: 'Есептер', icon: 'fas fa-file-alt' }
    ]
  },
  parent: {
    title: 'Ата-ана кабинеті',
    sections: ['Балалардың үлгерімі', 'Қатысу', 'Хабарламалар', 'Есептер'],
    summary: [
      { key: 'grades', label: 'Балалардың бағалары', icon: 'fas fa-graduation-cap' },
      { key: 'attendance', label: 'Қатысу', icon: 'fas fa-user-check' },
      { key: 'tasks', label: 'Үй тапсырмалары', icon: 'fas fa-home' },
      { key: 'notifications', label: 'Хабарламалар', icon: 'fas fa-bell' }
    ]
  },
  librarian: {
    title: 'Кітапханашы кабинеті',
    sections: ['Кітап қоры', 'Бронь', 'Қайтарылғандар', 'Есептер'],
    summary: [
      { key: 'books', label: 'Кітаптар', icon: 'fas fa-book' },
      { key: 'reservations', label: 'Резервтер', icon: 'fas fa-bookmark' },
      { key: 'returns', label: 'Қайтарылғандар', icon: 'fas fa-undo' },
      { key: 'reports', label: 'Есептер', icon: 'fas fa-file-alt' }
    ]
  },
  staff: {
    title: 'Қызметкер кабинеті',
    sections: ['Профиль', 'Тапсырмалар', 'Хабарламалар', 'Есептер'],
    summary: [
      { key: 'tasks', label: 'Тапсырмалар', icon: 'fas fa-clipboard-check' },
      { key: 'notifications', label: 'Хабарламалар', icon: 'fas fa-bell' },
      { key: 'messages', label: 'Ішкі хаттар', icon: 'fas fa-envelope' },
      { key: 'reports', label: 'Есептер', icon: 'fas fa-file-alt' }
    ]
  }
};

const defaultSection = 'Үй тапсырмалары';
const studentWorkSections = ['Оқушы мамандығы', 'Тәрбиешің ұяшығы', 'Дарынды оқушылар'];

const roleStudentWorkSections = {
  career_counselor: ['Оқушы мамандығы'],
  deputy_profile: ['Оқушы мамандығы', 'Дарынды оқушылар'],
  labor_instructor: ['Оқушы мамандығы'],
  psychologist: ['Дарынды оқушылар'],
  club_leader: ['Дарынды оқушылар'],
  extracurricular_teacher: ['Дарынды оқушылар'],
  extra_education: ['Дарынды оқушылар'],
  sport_instructor: ['Дарынды оқушылар'],
  pe_instructor: ['Дарынды оқушылар'],
  deputy_education: ['Тәрбиешің ұяшығы', 'Дарынды оқушылар'],
  deputy_academic: ['Тәрбиешің ұяшығы', 'Дарынды оқушылар'],
  deputy_culture: ['Тәрбиешің ұяшығы'],
  organizer_teacher: ['Тәрбиешің ұяшығы'],
  organizer: ['Тәрбиешің ұяшығы'],
  assistant_teacher: ['Тәрбиешің ұяшығы'],
  assistant: ['Тәрбиешің ұяшығы'],
  mentor: ['Тәрбиешің ұяшығы'],
  tutor: ['Тәрбиешің ұяшығы'],
  director: ['Тәрбиешің ұяшығы', 'Оқушы мамандығы', 'Дарынды оқушылар'],
  admin_staff: ['Тәрбиешің ұяшығы', 'Оқушы мамандығы', 'Дарынды оқушылар']
};

const workSummaryCards = {
  'Оқушы мамандығы': { key: 'work_profession', label: 'Мамандық бағыты', icon: 'fas fa-compass' },
  'Тәрбиешің ұяшығы': { key: 'work_attendance', label: 'Сынып жұмысы', icon: 'fas fa-user-check' },
  'Дарынды оқушылар': { key: 'work_gifted', label: 'Профильдер', icon: 'fas fa-award' }
};

const uniqueList = (items) => [...new Set(items.filter(Boolean))];

const getStaffConfig = (roleName, user) => {
  const workSections = roleStudentWorkSections[roleName] || [];
  const sections = uniqueList(['Профиль', ...workSections, 'Тапсырмалар', 'Хабарламалар', 'Есептер']);
  const summary = [
    ...workSections.map((section) => ({ ...workSummaryCards[section], section })),
    ...roleConfigMap.staff.summary
  ];
  return {
    ...roleConfigMap.staff,
    title: user?.role_label ? `${user.role_label} кабинеті` : roleConfigMap.staff.title,
    sections,
    summary: uniqueList(summary.map((item) => item.key)).map((key) => summary.find((item) => item.key === key))
  };
};

const formatNumber = (value) => (typeof value === 'number' ? value : value ? String(value) : '—');

const RoleCabinet = ({ role = 'student' }) => {
  const user = api.getUser();
  const actualRole = role === 'staff' ? user?.role : role;
  const config = role === 'staff' ? getStaffConfig(actualRole, user) : (roleConfigMap[role] || roleConfigMap.student);
  const workSections = role === 'staff' ? (roleStudentWorkSections[actualRole] || []) : [];
  const pageTitle = config.title;
  const [activeSection, setActiveSection] = useState(config.sections[0] || defaultSection);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [selectedWorkClass, setSelectedWorkClass] = useState(null);
  const [workStudents, setWorkStudents] = useState([]);
  const [workLoading, setWorkLoading] = useState(false);

  useEffect(() => {
    setActiveSection(config.sections[0] || defaultSection);
    setLoading(true);
    setError('');
    const fetchData = async () => {
      try {
        if (role === 'student') {
          const [tasksRes, gradesRes, attendanceRes, reportsRes, notificationsRes, classRes] = await Promise.all([
            api.tasks.list('limit=10'),
            api.academic.grades.list('limit=10'),
            api.attendance.summary(),
            api.reports.list('limit=5'),
            api.notifications.list(),
            api.students.myClass().catch(() => ({ success: false, data: {} }))
          ]);
          setData({
            tasks: tasksRes.success ? tasksRes.data : [],
            grades: gradesRes.success ? gradesRes.data : [],
            attendance: attendanceRes.success ? attendanceRes.data : {},
            reports: reportsRes.success ? reportsRes.data : [],
            notifications: notificationsRes.success ? notificationsRes.data : [],
            classmates: classRes.success ? classRes.data?.classmates || [] : [],
            schedule: classRes.success ? classRes.data?.schedule || [] : [],
            student: classRes.success ? classRes.data?.student || null : null
          });
        } else if (role === 'parent') {
          const [gradesRes, attendanceRes, tasksRes, notificationsRes] = await Promise.all([
            api.academic.grades.list('limit=10'),
            api.attendance.summary(),
            api.tasks.list('limit=10'),
            api.notifications.list()
          ]);
          setData({
            grades: gradesRes.success ? gradesRes.data : [],
            attendance: attendanceRes.success ? attendanceRes.data : {},
            tasks: tasksRes.success ? tasksRes.data : [],
            notifications: notificationsRes.success ? notificationsRes.data : []
          });
        } else if (role === 'librarian') {
          const [booksRes, reservationsRes] = await Promise.all([
            api.library.books.list(),
            api.library.reservations.list('limit=20')
          ]);
          setData({
            books: booksRes.success ? booksRes.data : [],
            reservations: reservationsRes.success ? reservationsRes.data : [],
            returns: reservationsRes.success ? reservationsRes.data.filter((item) => item.status === 'returned') : []
          });
        } else {
          const [tasksRes, reportsRes, messagesRes, notificationsRes, classesRes, profilesRes] = await Promise.all([
            api.tasks.list('limit=10').catch(() => ({ success: false, data: [] })),
            api.reports.list('limit=10').catch(() => ({ success: false, data: [] })),
            api.messages.list().catch(() => ({ success: false, data: [] })),
            api.notifications.list().catch(() => ({ success: false, data: [] })),
            workSections.length ? api.students.classes().catch(() => ({ success: false, data: [] })) : Promise.resolve({ success: false, data: [] }),
            workSections.includes('Дарынды оқушылар') ? api.studentProfiles.list('limit=500').catch(() => ({ success: false, data: [] })) : Promise.resolve({ success: false, data: [] })
          ]);
          setData({
            tasks: tasksRes.success ? tasksRes.data : [],
            reports: reportsRes.success ? reportsRes.data : [],
            messages: messagesRes.success ? messagesRes.data : [],
            notifications: notificationsRes.success ? notificationsRes.data : [],
            classes: classesRes.success ? classesRes.data : [],
            studentProfiles: profilesRes.success ? profilesRes.data : []
          });
        }
      } catch (e) {
        console.error('RoleCabinet load error', e);
        setError('Деректерді жүктеу кезінде қате пайда болды');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role, actualRole]);

  useEffect(() => {
    setSelectedWorkClass(null);
    setWorkStudents([]);
  }, [activeSection]);

  const logout = () => {
    api.removeToken();
    api.removeUser();
    window.location.href = '/login';
  };

  const openWorkClass = async (classItem, section) => {
    setWorkLoading(true);
    try {
      const [studentsRes, profilesRes] = await Promise.all([
        api.students.byClass(classItem.id),
        section === 'Дарынды оқушылар'
          ? api.studentProfiles.list('limit=500').catch(() => ({ success: false, data: [] }))
          : Promise.resolve({ success: false, data: [] })
      ]);
      if (!studentsRes.success) return showToast(studentsRes.message || 'Оқушылар жүктелмеді', 'error');
      if (profilesRes.success) {
        setData((prev) => ({ ...prev, studentProfiles: profilesRes.data || [] }));
      }
      setSelectedWorkClass({ ...classItem, id: classItem.id, name: classItem.name, section });
      setWorkStudents(studentsRes.data || []);
    } finally {
      setWorkLoading(false);
    }
  };

  const saveWorkProfession = async (student, profession) => {
    const value = String(profession || '').trim();
    const res = await api.students.setProfession(student.id, value || null);
    if (!res.success) return showToast(res.message || 'Мамандық сақталмады', 'error');
    setWorkStudents((prev) => prev.map((item) => (
      String(item.id) === String(student.id) ? { ...item, profession: value } : item
    )));
    showToast('Мамандық бағыты сақталды', 'success');
  };

  const markWorkAttendance = async (student, status, reason) => {
    const res = await api.students.markAttendance({
      student_id: student.id,
      status,
      reason: String(reason || '').trim() || null
    });
    if (!res.success) return showToast(res.message || 'Қатысу белгісі сақталмады', 'error');
    const marked = res.data || {};
    setWorkStudents((prev) => prev.map((item) => (
      String(item.id) === String(student.id)
        ? {
            ...item,
            attendance_status: marked.status || status,
            attendance_reason: marked.reason || String(reason || '').trim() || null,
            attendance_marked_at: marked.created_at || new Date().toISOString()
          }
        : item
    )));
    showToast('Қатысу белгісі сақталды', 'success');
  };

  const saveWorkProfile = async (student, profileType, notes) => {
    const existing = (data.studentProfiles || []).find((profile) => String(profile.student_id) === String(student.id));
    const payload = {
      student_id: student.id,
      profile_type: profileType,
      assigned_teacher_id: user?.teacher_id || null,
      assigned_at: existing?.assigned_at || new Date().toISOString().slice(0, 10),
      ends_at: existing?.ends_at || null,
      is_active: true,
      notes: String(notes || '').trim() || null
    };
    const res = existing
      ? await api.studentProfiles.update(existing.id, payload)
      : await api.studentProfiles.create(payload);
    if (!res.success) return showToast(res.message || 'Профиль сақталмады', 'error');
    const refreshed = await api.studentProfiles.list('limit=500');
    if (refreshed.success) {
      setData((prev) => ({ ...prev, studentProfiles: refreshed.data || [] }));
    }
    showToast(profileType === 'gifted' ? 'Дарынды оқушы профилі сақталды' : 'Қолдау профилі сақталды', 'success');
  };

  const summaryValue = (card) => {
    if (card.section === 'Дарынды оқушылар') {
      return (data.studentProfiles || []).filter((item) => item.profile_type === 'gifted' || item.profile_type === 'struggling').length;
    }
    if (studentWorkSections.includes(card.section)) {
      return data.classes?.length || 0;
    }
    if (card.key === 'attendance') return (data.attendance?.late_count || 0) + (data.attendance?.absent_count || 0);
    if (Array.isArray(data[card.key])) return data[card.key].length;
    return data[card.key]?.total || data[card.key]?.count || '—';
  };

  const sectionContent = useMemo(() => {
    const section = activeSection;
    if (role === 'student' || role === 'parent') {
      if (section.includes('Үй тапсырмалары') || section.includes('Үй тапсырма')) {
        return (
          <div>
            <div className="card-title">Тапсырмалар</div>
            {!data.tasks?.length ? <p>Тапсырмалар табылмады</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr><th>Тақырып</th><th>Статус</th><th>Мерзімі</th></tr>
                  </thead>
                  <tbody>
                    {data.tasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.title}</td>
                        <td>{task.workflow_status || task.status || '—'}</td>
                        <td>{task.deadline || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      if (section.includes('Сабақ кестесі')) {
        const dayNames = ['', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'];
        return (
          <div>
            <div className="card-title">Сабақ кестесі</div>
            {!data.schedule?.length ? <p className="text-muted">Кесте ақпараты әзірленуде немесе жаңартылуда.</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Күн</th><th>Сабақ</th><th>Пән</th><th>Мұғалім</th><th>Кабинет</th></tr></thead>
                  <tbody>
                    {data.schedule.map((item) => (
                      <tr key={item.id}>
                        <td>{dayNames[item.day_of_week] || item.day_of_week}</td>
                        <td>{item.time_slot}</td>
                        <td>{item.subject_name || '—'}</td>
                        <td>{item.teacher_name || '—'}</td>
                        <td>{item.classroom_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      if (section.includes('Сыныптастарым')) {
        return (
          <div>
            <div className="card-title">Менің сыныптастарым</div>
            {!data.classmates?.length ? <p className="text-muted">Мәліметтер жаңартылуда...</p> : (
              <div className="list-group">
                {data.classmates.map((student) => (
                  <div key={student.id} className="list-group-item">
                    <strong>{student.full_name}</strong>
                    <p>{student.iin || data.student?.class_name || 'Сынып оқушысы'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      if (section.includes('Бағалар') || section.includes('үлгерімі')) {
        return (
          <div>
            <div className="card-title">Бағалар</div>
            {!data.grades?.length ? <p>Бағалар табылмады</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr><th>Оқушы</th><th>Пән</th><th>Балл</th><th>Күні</th></tr>
                  </thead>
                  <tbody>
                    {data.grades.map((grade) => (
                      <tr key={grade.id}>
                        <td>{grade.student_name || '—'}</td>
                        <td>{grade.subject_name || '—'}</td>
                        <td>{grade.value}</td>
                        <td>{grade.date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      if (section.includes('Қатысу')) {
        return (
          <div>
            <div className="card-title">Қатысу</div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="data-card"><strong>Кешігу</strong> {formatNumber(data.attendance?.late_count)} рет</div>
              <div className="data-card"><strong>Сабағы жоқ</strong> {formatNumber(data.attendance?.absent_count)} рет</div>
            </div>
          </div>
        );
      }
      if (section.includes('Хабарламалар')) {
        return (
          <div>
            <div className="card-title">Хабарламалар</div>
            {!data.notifications?.length ? <p>Хабарламалар жоқ</p> : (
              <div className="list-group">
                {data.notifications.map((note) => (
                  <div key={note.id} className="list-group-item">
                    <strong>{note.title || 'Хабарлама'}</strong>
                    <p>{note.content || note.message || '...'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      if (section.includes('Есептер')) {
        return (
          <div>
            <div className="card-title">Есептер</div>
            {!data.reports?.length ? <p>Есептер табылмады</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr><th>Тақырып</th><th>Пән</th><th>Статус</th></tr>
                  </thead>
                  <tbody>
                    {data.reports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.title}</td>
                        <td>{report.subject_name || '—'}</td>
                        <td>{report.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
    }

    if (role === 'librarian') {
      if (section.includes('Кітап қоры')) {
        return (
          <div>
            <div className="card-title">Кітап қоры</div>
            {!data.books?.length ? <p>Кітаптар табылмады</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Атауы</th><th>Автор</th><th>Саны</th></tr></thead>
                  <tbody>
                    {data.books.map((book) => (
                      <tr key={book.id}>
                        <td>{book.title}</td>
                        <td>{book.author || '—'}</td>
                        <td>{book.quantity || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      if (section.includes('Бронь')) {
        return (
          <div>
            <div className="card-title">Бронь</div>
            {!data.reservations?.length ? <p>Резервтер жоқ</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Кітап</th><th>Пайдаланушы</th><th>Статус</th></tr></thead>
                  <tbody>
                    {data.reservations.map((item) => (
                      <tr key={item.id}>
                        <td>{item.book_title}</td>
                        <td>{item.user_name}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      if (section.includes('Қайтарылғандар')) {
        return (
          <div>
            <div className="card-title">Қайтарылғандар</div>
            {!data.returns?.length ? <p>Қайтарылған кітаптар жоқ</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Кітап</th><th>Пайдаланушы</th><th>Қайтарылған күні</th></tr></thead>
                  <tbody>
                    {data.returns.map((item) => (
                      <tr key={item.id}>
                        <td>{item.book_title}</td>
                        <td>{item.user_name}</td>
                        <td>{item.updated_at || item.return_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
    }

    if (role === 'staff') {
      if (studentWorkSections.includes(section)) {
        return (
          <StudentWorkPanel
            section={section}
            classes={data.classes || []}
            selectedClass={selectedWorkClass}
            students={workStudents}
            profiles={data.studentProfiles || []}
            loading={workLoading}
            embedded
            onSelectClass={openWorkClass}
            onBack={() => setSelectedWorkClass(null)}
            onSaveProfession={saveWorkProfession}
            onMarkAttendance={markWorkAttendance}
            onSaveProfile={saveWorkProfile}
          />
        );
      }

      if (section.includes('Профиль')) {
        return (
          <div>
            <div className="card-title">Профиль</div>
            <div className="list-group">
              <div className="list-group-item"><strong>Аты-жөні</strong><p>{user?.full_name || '—'}</p></div>
              <div className="list-group-item"><strong>ЖСН</strong><p>{user?.iin || '—'}</p></div>
              <div className="list-group-item"><strong>Рөл</strong><p>{user?.role_label || user?.role || '—'}</p></div>
            </div>
          </div>
        );
      }
      if (section.includes('Тапсырмалар')) {
        return (
          <div>
            <div className="card-title">Тапсырмалар</div>
            {!data.tasks?.length ? <p>Тапсырмалар табылмады</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Тақырып</th><th>Статус</th><th>Мерзімі</th></tr></thead>
                  <tbody>
                    {data.tasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.title}</td>
                        <td>{task.workflow_status || task.status || '—'}</td>
                        <td>{task.deadline || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      if (section.includes('Хабарламалар')) {
        return (
          <div>
            <div className="card-title">Хабарламалар</div>
            <div className="list-group">
              {[...(data.notifications || []), ...(data.messages || [])].map((item) => (
                <div key={`${item.type || 'item'}-${item.id}`} className="list-group-item">
                  <strong>{item.title || item.subject || 'Хабарлама'}</strong>
                  <p>{item.content || item.body || item.message || '—'}</p>
                </div>
              ))}
              {!data.notifications?.length && !data.messages?.length && <p>Хабарламалар жоқ</p>}
            </div>
          </div>
        );
      }
      if (section.includes('Есептер')) {
        return (
          <div>
            <div className="card-title">Есептер</div>
            {!data.reports?.length ? <p>Есептер табылмады</p> : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Тақырып</th><th>Статус</th><th>Кезең</th></tr></thead>
                  <tbody>
                    {data.reports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.title}</td>
                        <td>{report.status || '—'}</td>
                        <td>{report.period || report.created_at || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
    }

    return <p>Бұл бөлім үшін мәліметтер жоқ.</p>;
  }, [activeSection, data, role, selectedWorkClass, user, workLoading, workStudents]);

  return (
    <div className="role-layout">
      <Navbar />
      <main className="role-main">
        <div className="role-header">
          <div>
            <h1>{pageTitle}</h1>
            <p className="text-muted">Тапсырмалар, қатысу және есептер туралы шолуды қараңыз.</p>
          </div>
          <div className="role-action-row">
            <span className="badge-gray" style={{ padding: '12px 16px', fontWeight: 700 }}>
              Рөл: {user?.role?.replace('_', ' ') || 'Пайдаланушы'}
            </span>
            <button className="btn btn-secondary" onClick={logout}>Шығу</button>
          </div>
        </div>

        <div className="role-summary-grid">
          {config.summary.map((card) => (
            <div key={card.key} className="data-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div className="ap-card-title">{card.label}</div>
                  <div className="ap-card-value">{formatNumber(summaryValue(card))}</div>
                </div>
                <div style={{ fontSize: 24, color: '#2563eb' }}><i className={card.icon}></i></div>
              </div>
            </div>
          ))}
        </div>

        <div className="role-sections-nav">
          {config.sections.map((section) => (
            <button
              key={section}
              className={`role-section-btn ${activeSection === section ? 'active' : ''}`}
              onClick={() => setActiveSection(section)}
            >
              {section}
            </button>
          ))}
        </div>

        <div className="data-card" style={{ padding: 24 }}>
          {error && (
            <div className="data-table-card" style={{ padding: 20, borderColor: '#c92a2a', color: '#c92a2a' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="data-table-card" style={{ padding: 24, textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} /> Жүктелуде...
            </div>
          ) : (
            sectionContent
          )}
        </div>
      </main>
    </div>
  );
};

export default RoleCabinet;
