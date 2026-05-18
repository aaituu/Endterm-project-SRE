import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const langLabel = (l) => ({ kk: 'қазақша', ru: 'орысша', uz: 'өзбекше' }[l] || l || '—');

const AcademicClasses = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    grade_label: '', name: '', section: '', homeroom_teacher_id: '', language: 'kk',
    schedule_shift: 'daytime', max_students: 30, description: '', academic_year: '2025-2026'
  });

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [cRes, tRes] = await Promise.all([
      api.academic.classes.list('limit=200'),
      api.teachers.list('limit=300')
    ]);
    if (cRes.success) setClasses(cRes.data || []);
    if (tRes.success) setTeachers(tRes.data || []);
    setLoading(false);
  };

  const save = async () => {
    const displayName = [form.grade_label, form.section].filter(Boolean).join('') || form.name;
    const res = await api.academic.classes.create({
      name: displayName || form.name,
      grade_label: form.grade_label || null,
      section: form.section || null,
      homeroom_teacher_id: form.homeroom_teacher_id || null,
      language: form.language,
      schedule_shift: form.schedule_shift,
      max_students: Number(form.max_students) || 30,
      description: form.description || null,
      academic_year: form.academic_year || null
    });
    if (res.success) {
      setShowForm(false);
      load();
    } else alert(res.message || 'Қате');
  };

  const remove = async (id) => {
    if (!window.confirm('Сыныпты жою?')) return;
    const res = await api.academic.classes.delete(id);
    if (res.success) load();
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Сыныптарды басқару</h1>
          <p className="ap-page-sub">Сыныптар, жетекші, кесте түрі және оқушылар</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>Сынып құру</button>
      </div>

      {showForm && (
        <div className="form-panel" style={{ marginBottom: 24 }}>
          <h3>Жаңа сынып құру</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="ap-form-label">Сынып белгісі (мысалы 8)</label>
              <input className="ap-input" value={form.grade_label} onChange={(e) => setForm({ ...form, grade_label: e.target.value })} placeholder="8" />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Секция</label>
              <input className="ap-input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="А" />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Сынып жетекші</label>
              <select className="ap-input" value={form.homeroom_teacher_id} onChange={(e) => setForm({ ...form, homeroom_teacher_id: e.target.value })}>
                <option value="">Таңдаңыз</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="ap-form-label">Оқу тілі</label>
              <select className="ap-input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="kk">Қазақша</option>
                <option value="ru">Орысша</option>
                <option value="uz">Өзбекше</option>
              </select>
            </div>
            <div className="form-group">
              <label className="ap-form-label">Кесте</label>
              <select className="ap-input" value={form.schedule_shift} onChange={(e) => setForm({ ...form, schedule_shift: e.target.value })}>
                <option value="daytime">Күндізгі (1 аусым)</option>
                <option value="evening">Кешкі</option>
              </select>
            </div>
            <div className="form-group">
              <label className="ap-form-label">Макс. оқушы</label>
              <input className="ap-input" type="number" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Оқу жылы</label>
              <input className="ap-input" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="ap-form-label">Сипаттама</label>
              <textarea className="ap-input" rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Сынып туралы қосымша ақпарат..." />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={save}>Сынып құру</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Болдырмау</button>
          </div>
        </div>
      )}

      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Сынып</th>
                <th>Сынып жетекшісі</th>
                <th>Оқу тілі</th>
                <th>Кесте</th>
                <th>Оқушылар</th>
                <th>Мәртебе</th>
                <th>Әрекеттер</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : classes.map((c) => {
                const max = c.max_students || 30;
                const cnt = parseInt(c.student_count, 10) || 0;
                const pct = Math.min(100, Math.round((cnt / max) * 100));
                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {c.grade_label || ''}{c.section ? ` сынып, ${c.section} секция` : ''}
                      </div>
                    </td>
                    <td>{c.teacher_name || '—'}</td>
                    <td>{langLabel(c.language)}</td>
                    <td>
                      {c.schedule_shift === 'evening' ? (
                        <span className="ap-badge-shift-eve">Кешкі</span>
                      ) : (
                        <span className="ap-badge-shift-day">Күндізгі</span>
                      )}
                    </td>
                    <td>
                      {cnt} / {max}
                      <div className="ap-progress"><span style={{ width: `${pct}%` }} /></div>
                    </td>
                    <td>
                      {c.is_active !== false ? <span className="badge badge-green">Белсенді</span> : <span className="badge">Емес</span>}
                    </td>
                    <td>
                      <Link to={`/admin/academic/schedule/${c.id}`} style={{ color: '#2563eb', fontWeight: 600, marginRight: 8 }}>Көру</Link>
                      <Link to={`/admin/academic/classes/${c.id}/edit`} style={{ color: '#16a34a', fontWeight: 600, marginRight: 8 }}>Өңдеу</Link>
                      <button type="button" style={{ color: '#dc2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => remove(c.id)}>Жою</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export default AcademicClasses;
