import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const DAY_HEADERS = ['', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі'];
const TIME_SLOTS = [
  { slot: 1, label: '08:00-08:45' },
  { slot: 2, label: '08:50-09:35' },
  { slot: 3, label: '09:50-10:35' },
  { slot: 4, label: '10:40-11:25' },
  { slot: 5, label: '11:30-12:15' },
  { slot: 6, label: '14:00-14:45' },
  { slot: 7, label: '14:50-15:35' }
];

const AcademicScheduleClass = () => {
  const { classId } = useParams();
  const [cls, setCls] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [addMode, setAddMode] = useState(null);
  const [form, setForm] = useState({ teacher_id: '', classroom_id: '', subject_id: '', note: '' });

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    loadAll();
  }, [classId]);

  const loadAll = async () => {
    const [cRes, sRes, tRes, crRes, subRes] = await Promise.all([
      api.academic.classes.get(classId),
      api.academic.schedule.list(`class_id=${classId}`),
      api.teachers.list('limit=400'),
      api.academic.classrooms.list('status=active'),
      api.academic.subjects.list()
    ]);
    if (cRes.success) setCls(cRes.data);
    if (sRes.success) setLessons(sRes.data || []);
    if (tRes.success) setTeachers(tRes.data || []);
    if (crRes.success) setClassrooms(crRes.data || []);
    if (subRes.success) setSubjects(subRes.data || []);
  };

  const grid = useMemo(() => {
    const m = {};
    lessons.forEach((L) => {
      const d = parseInt(L.day_of_week, 10);
      const t = parseInt(L.time_slot, 10);
      if (!m[d]) m[d] = {};
      m[d][t] = L;
    });
    return m;
  }, [lessons]);

  const openAdd = (day, slot) => {
    const slotDef = TIME_SLOTS.find((x) => x.slot === slot);
    setForm({
      teacher_id: '',
      classroom_id: '',
      subject_id: subjects[0]?.id || '',
      note: ''
    });
    setAddMode({ day, slot, label: slotDef?.label || '' });
  };

  const submitAdd = async () => {
    if (!addMode || !form.teacher_id || !form.classroom_id || !form.subject_id) {
      alert('Мұғалім, кабинет және пән таңдаңыз');
      return;
    }
    const slotMatch = (addMode.label || '').match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    const res = await api.academic.schedule.create({
      class_id: classId,
      subject_id: Number(form.subject_id),
      teacher_id: Number(form.teacher_id),
      classroom_id: Number(form.classroom_id),
      day_of_week: addMode.day,
      time_slot: addMode.slot,
      start_time: slotMatch ? `${slotMatch[1]}:00` : null,
      end_time: slotMatch ? `${slotMatch[2]}:00` : null,
      academic_year: cls?.academic_year || '2025-2026',
      note: form.note || null
    });
    if (res.success) {
      setAddMode(null);
      loadAll();
    } else alert(res.message || 'Қате');
  };

  const delLesson = async (id) => {
    if (!window.confirm('Сабақты жою?')) return;
    const res = await api.academic.schedule.delete(id);
    if (res.success) loadAll();
  };

  if (!cls) return <AdminShell><p>Жүктелуде...</p></AdminShell>;

  if (addMode) {
    return (
      <AdminShell>
        <div className="admin-page-header">
          <div>
            <h1 className="ap-page-title">Сабақ қосу</h1>
            <p className="ap-page-sub">
              {cls.name} • {DAY_HEADERS[addMode.day]} • {addMode.label} • {cls.academic_year || '2025-2026'}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setAddMode(null)}>Кестеге оралу</button>
        </div>
        <div className="form-panel" style={{ maxWidth: 520 }}>
          <div className="form-group">
            <label className="ap-form-label">Пән *</label>
            <select className="ap-input" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              <option value="">Таңдаңыз</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Мұғалім *</label>
            <select className="ap-input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
              <option value="">Мұғалім таңдаңыз</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Кабинет *</label>
            <select className="ap-input" value={form.classroom_id} onChange={(e) => setForm({ ...form, classroom_id: e.target.value })}>
              <option value="">Кабинет таңдаңыз</option>
              {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}{c.room_number ? ` (${c.room_number})` : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Ескертпе</label>
            <textarea className="ap-input" rows="3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Қосымша ақпарат..." />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAddMode(null)}>Бас тарту</button>
            <button type="button" className="btn btn-primary" onClick={submitAdd}>Сабақ қосу</button>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">{cls.name} кестесі</h1>
          <p className="ap-page-sub">{cls.name} сынып • Оқу жылы: {cls.academic_year || '2025-2026'}</p>
        </div>
        <Link to="/admin/academic/schedule" className="btn btn-secondary">Тізімге оралу</Link>
      </div>

      <div className="data-table-card ap-schedule-grid-wrap" style={{ overflowX: 'auto' }}>
        <h3 style={{ padding: '16px 20px 0', margin: 0 }}>Апталық кесте</h3>
        <div style={{ padding: 16 }}>
          <table className="ap-schedule-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 8, minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600 }}>САБАҚ</th>
                <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600 }}>УАҚЫТ</th>
                {DAY_HEADERS.slice(1).map((h) => (
                  <th key={h} style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map(({ slot, label }) => (
                <tr key={slot}>
                  <td style={{ fontWeight: 700 }}>{slot}</td>
                  <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{label}</td>
                  {[1, 2, 3, 4, 5, 6].map((day) => {
                    const L = grid[day]?.[slot];
                    if (L) {
                      return (
                        <td key={`${day}-${slot}`} style={{ verticalAlign: 'top', minWidth: 120 }}>
                          <div className="ap-lesson-card">
                            <button type="button" className="ap-remove" onClick={() => delLesson(L.id)} title="Жою">×</button>
                            <strong>{L.subject_name}</strong>
                            <div className="teacher">{L.teacher_name}</div>
                            <div className="room"><i className="fas fa-map-marker-alt"></i> {L.classroom_name || '—'}</div>
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={`${day}-${slot}`} style={{ verticalAlign: 'top' }}>
                        <button type="button" className="ap-lesson-add" onClick={() => openAdd(day, slot)}>
                          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span>
                          <span>Сабақ қосу</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export default AcademicScheduleClass;
