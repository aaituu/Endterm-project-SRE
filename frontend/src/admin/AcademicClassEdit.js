import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const langLabel = (l) => ({ kk: 'қазақша', ru: 'орысша', uz: 'өзбекше' }[l] || l || '—');

const AcademicClassEdit = () => {
  const { id } = useParams();
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    (async () => {
      const [cRes, tRes] = await Promise.all([
        api.academic.classes.get(id),
        api.teachers.list('limit=300')
      ]);
      if (tRes.success) setTeachers(tRes.data || []);
      if (cRes.success && cRes.data) {
        const c = cRes.data;
        setForm({
          name: c.name || '',
          grade_label: c.grade_label || '',
          section: c.section || '',
          homeroom_teacher_id: c.homeroom_teacher_id ? String(c.homeroom_teacher_id) : '',
          language: c.language || 'kk',
          schedule_shift: c.schedule_shift || 'daytime',
          max_students: c.max_students || 30,
          description: c.description || '',
          academic_year: c.academic_year || '2025-2026',
          is_active: c.is_active !== false
        });
      }
    })();
  }, [id]);

  const save = async () => {
    if (!form) return;
    const displayName = [form.grade_label, form.section].filter(Boolean).join('') || form.name;
    const res = await api.academic.classes.update(id, {
      name: displayName || form.name,
      grade_label: form.grade_label || null,
      section: form.section || null,
      homeroom_teacher_id: form.homeroom_teacher_id || null,
      language: form.language,
      schedule_shift: form.schedule_shift,
      max_students: Number(form.max_students) || 30,
      description: form.description || null,
      academic_year: form.academic_year || null,
      is_active: form.is_active
    });
    if (res.success) window.location.href = '/admin/academic/classes';
    else alert(res.message || 'Қате');
  };

  if (!form) return <AdminShell><p>Жүктелуде...</p></AdminShell>;

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Сыныпты өңдеу</h1>
          <p className="ap-page-sub">{form.name}</p>
        </div>
        <Link to="/admin/academic/classes" className="btn btn-secondary">Тізімге оралу</Link>
      </div>

      <div className="form-panel">
        <div className="form-grid">
          <div className="form-group">
            <label className="ap-form-label">Сынып белгісі</label>
            <input className="ap-input" value={form.grade_label} onChange={(e) => setForm({ ...form, grade_label: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="ap-form-label">Секция</label>
            <input className="ap-input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="ap-form-label">Атауы (толық)</label>
            <input className="ap-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="ap-form-label">Сынып жетекші</label>
            <select className="ap-input" value={form.homeroom_teacher_id} onChange={(e) => setForm({ ...form, homeroom_teacher_id: e.target.value })}>
              <option value="">Таңдаңыз</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Оқу тілі ({langLabel(form.language)})</label>
            <select className="ap-input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="kk">Қазақша</option>
              <option value="ru">Орысша</option>
              <option value="uz">Өзбекше</option>
            </select>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Кесте</label>
            <select className="ap-input" value={form.schedule_shift} onChange={(e) => setForm({ ...form, schedule_shift: e.target.value })}>
              <option value="daytime">Күндізгі</option>
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
            <textarea className="ap-input" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Белсенді
            </label>
          </div>
        </div>
        <div className="form-actions">
          <Link to="/admin/academic/classes" className="btn btn-secondary">Болдырмау</Link>
          <button type="button" className="btn btn-primary" onClick={save}>Сақтау</button>
        </div>
      </div>
    </AdminShell>
  );
};

export default AcademicClassEdit;
