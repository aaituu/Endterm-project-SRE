import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api, { showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

export default function StudentProfileForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [profileType, setProfileType] = useState('struggling');
  const [teacherId, setTeacherId] = useState('');
  const [assignedAt, setAssignedAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    (async () => {
      const [st, th] = await Promise.all([
        api.academic.students.list('limit=800&page=1'),
        api.teachers.list('limit=500'),
      ]);
      if (st.success) setStudents(st.data || []);
      if (th.success) setTeachers(th.data || []);
    })();
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await api.studentProfiles.get(id);
      if (res.success && res.data) {
        const p = res.data;
        setStudentId(String(p.student_id));
        setProfileType(p.profile_type || 'struggling');
        setTeacherId(p.assigned_teacher_id ? String(p.assigned_teacher_id) : '');
        setAssignedAt(p.assigned_at ? String(p.assigned_at).slice(0, 10) : '');
        setEndsAt(p.ends_at ? String(p.ends_at).slice(0, 10) : '');
        setIsActive(p.is_active !== false);
      } else showToast(res.message || 'Табылмады', 'error');
      setLoading(false);
    })();
  }, [id, isNew]);

  const submit = async (e) => {
    e.preventDefault();
    if (!studentId) return showToast('Оқушыны таңдаңыз', 'error');
    if (!teacherId) return showToast('Мұғалімді таңдаңыз', 'error');
    const body = {
      student_id: parseInt(studentId, 10),
      profile_type: profileType,
      assigned_teacher_id: parseInt(teacherId, 10),
      assigned_at: assignedAt || null,
      ends_at: endsAt || null,
      is_active: isActive,
    };
    const res = isNew ? await api.studentProfiles.create(body) : await api.studentProfiles.update(id, body);
    if (res.success) {
      showToast(isNew ? 'Сақталды' : 'Жаңартылды', 'success');
      navigate('/admin/students');
    } else showToast(res.message || 'Қате', 'error');
  };

  if (!isNew && loading) {
    return (
      <AdminShell>
        <p>Жүктелуде…</p>
      </AdminShell>
    );
  }

  const title = isNew ? 'Жаңа оқушы қосу' : 'Оқушы мәліметтерін өзгерту';
  const sub = isNew
    ? 'Дарынды немесе үлгерімі төмен оқушыны тіркеу'
    : 'Мәліметтерді жаңарту';

  return (
    <AdminShell>
      <div style={{ marginBottom: 20 }}>
        <Link to="/admin/students" className="btn btn-secondary" style={{ marginBottom: 12 }}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1 className="ap-page-title">{title}</h1>
        <p className="ap-page-sub">{sub}</p>
      </div>

      <form className="ap-card" style={{ maxWidth: 640 }} onSubmit={submit}>
        <label className="ap-field">
          <span>
            Оқушы <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <select
            className="ap-input"
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={!isNew}
          >
            <option value="">{isNew ? 'Оқушыны таңдаңыз' : ''}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} — {s.class_name || 'сыныпсыз'}
              </option>
            ))}
          </select>
        </label>

        <div className="ap-field">
          <span>
            Түрі <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name="pt"
                checked={profileType === 'gifted'}
                onChange={() => setProfileType('gifted')}
              />
              <span><i className="fas fa-star" style={{ color: '#f59e0b', marginRight: 6 }}></i>Дарынды оқушы</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name="pt"
                checked={profileType === 'struggling'}
                onChange={() => setProfileType('struggling')}
              />
              <span>Үлгерімі төмен оқушы</span>
            </label>
          </div>
        </div>

        <label className="ap-field">
          <span>
            Жауапты мұғалім <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <select className="ap-input" required value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Мұғалімді таңдаңыз</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className="ap-field">
          <span>
            Тағайындалған күні <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <input type="date" className="ap-input" required value={assignedAt} onChange={(e) => setAssignedAt(e.target.value)} />
        </label>

        <label className="ap-field">
          <span>Аяқталатын күні</span>
          <input type="date" className="ap-input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <small style={{ color: '#64748b', display: 'block', marginTop: 6 }}>
            Міндетті емес. Болашақта аяқтау үшін күн белгілеуге болады.
          </small>
        </label>

        <label className="ap-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>Белсенді статус</span>
        </label>
        <small style={{ color: '#64748b', display: 'block', marginTop: -8, marginBottom: 16 }}>
          Белсенді оқушылар ғана есептерде көрсетіледі.
        </small>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link to="/admin/students" className="btn btn-secondary">
            Бас тарту
          </Link>
          <button type="submit" className="btn btn-primary">
            {isNew ? 'Сақтау' : 'Жаңарту'}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
