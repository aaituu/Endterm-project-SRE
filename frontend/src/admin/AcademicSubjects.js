import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

function parseAgg(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; }
  }
  return [];
}

const AcademicSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHours, setNewHours] = useState(2);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.academic.subjects.list();
    if (res.success) setSubjects(res.data || []);
    setLoading(false);
  };

  const add = async () => {
    if (!newName.trim()) return;
    const res = await api.academic.subjects.create({ name: newName.trim(), weekly_hours: Number(newHours) || 0 });
    if (res.success) {
      setNewName('');
      setShowAdd(false);
      load();
    } else alert(res.message || 'Қате');
  };

  const remove = async (id) => {
    if (!window.confirm('Пәнді жою?')) return;
    const res = await api.academic.subjects.delete(id);
    if (res.success) load();
  };

  const totalLessons = subjects.reduce((a, s) => a + (parseInt(s.weekly_hours, 10) || 0), 0);

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Пәндер</h1>
          <p className="ap-page-sub">Оқу пәндерін басқару</p>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Аптадағы сабақтардың жалпы саны: <strong style={{ color: '#dc2626' }}>{totalLessons}</strong>
            {' / '}
            <span>{subjects.length} пән</span>
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>Пән қосу</button>
      </div>

      {showAdd && (
        <div className="form-panel" style={{ marginBottom: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="ap-form-label">Пән атауы</label>
              <input className="ap-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Апталық сағат</label>
              <input className="ap-input" type="number" value={newHours} onChange={(e) => setNewHours(e.target.value)} />
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={add}>Қосу</button>
          <button type="button" className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setShowAdd(false)}>Болдырмау</button>
        </div>
      )}

      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Пән атауы</th>
                <th>Аптадағы сабақтар</th>
                <th>Сабақ түрі</th>
                <th>Мұғалімдер</th>
                <th>Сыныптар</th>
                <th>Әрекеттер</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : subjects.map((s) => {
                const teachers = parseAgg(s.teachers);
                const classes = parseAgg(s.classes);
                return (
                  <tr key={s.id}>
                    <td><i className="fas fa-book" style={{ color: '#7c3aed', marginRight: 8 }}></i><strong>{s.name}</strong></td>
                    <td><span className="badge badge-blue">{s.weekly_hours || 0} сабақ</span></td>
                    <td>Қалыпты сабақ</td>
                    <td>
                      {teachers.slice(0, 2).map((t) => (
                        <span key={t.id} className="badge badge-green" style={{ marginRight: 4 }}>{t.full_name}</span>
                      ))}
                      {teachers.length > 2 && <span style={{ color: '#94a3b8' }}>+{teachers.length - 2}</span>}
                    </td>
                    <td>
                      <span className="badge badge-blue">{classes.length} сынып</span>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                        {classes.map((c) => c.name).slice(0, 4).join(', ')}
                      </div>
                    </td>
                    <td>
                      <Link to={`/admin/academic/subjects/${s.id}`} style={{ color: '#2563eb', fontWeight: 600, marginRight: 8 }}>Көру</Link>
                      <Link to={`/admin/academic/subjects/${s.id}`} style={{ color: '#16a34a', fontWeight: 600, marginRight: 8 }}>Өңдеу</Link>
                      <button type="button" style={{ color: '#dc2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => remove(s.id)}>Жою</button>
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

export default AcademicSubjects;
