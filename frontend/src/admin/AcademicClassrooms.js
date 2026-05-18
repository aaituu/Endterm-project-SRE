import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== '' && v != null) p.set(k, String(v));
  });
  return p.toString();
};

const AcademicClassrooms = () => {
  const [rows, setRows] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('number');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ room_number: '', name: '', capacity: 30, subject_id: '' });

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    loadSubjects();
  }, []);

  useEffect(() => {
    load();
  }, [subjectId, status]);

  const loadSubjects = async () => {
    const res = await api.academic.subjects.list();
    if (res.success) setSubjects(res.data || []);
  };

  const load = async () => {
    setLoading(true);
    const q = qs({ search, subject_id: subjectId, status });
    const res = await api.academic.classrooms.list(q);
    if (res.success) {
      let list = res.data || [];
      if (sort === 'number') {
        list = [...list].sort((a, b) => String(a.room_number || '').localeCompare(String(b.room_number || ''), undefined, { numeric: true }));
      } else {
        list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'kk'));
      }
      setRows(list);
    }
    setLoading(false);
  };

  const create = async () => {
    if (!createForm.name.trim()) return;
    const res = await api.academic.classrooms.create({
      name: createForm.name.trim(),
      room_number: createForm.room_number || null,
      capacity: Number(createForm.capacity) || 30,
      subject_id: createForm.subject_id || null
    });
    if (res.success) {
      setShowCreate(false);
      setCreateForm({ room_number: '', name: '', capacity: 30, subject_id: '' });
      load();
    } else alert(res.message || 'Қате');
  };

  const toggle = async (id) => {
    const res = await api.academic.classrooms.toggleStatus(id);
    if (res.success) load();
  };

  const remove = async (id) => {
    if (!window.confirm('Кабинетті жою?')) return;
    const res = await api.academic.classrooms.delete(id);
    if (res.success) load();
  };

  const subjectOptions = useMemo(() => subjects, [subjects]);

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Кабинеттер</h1>
          <p className="ap-page-sub">Мектеп кабинеттерін басқару</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Жаңа кабинет</button>
      </div>

      {showCreate && (
        <div className="form-panel" style={{ marginBottom: 20 }}>
          <h3>Жаңа кабинет</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="ap-form-label">Нөмір</label>
              <input className="ap-input" value={createForm.room_number} onChange={(e) => setCreateForm({ ...createForm, room_number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Атауы *</label>
              <input className="ap-input" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Сыйымдылық</label>
              <input className="ap-input" type="number" value={createForm.capacity} onChange={(e) => setCreateForm({ ...createForm, capacity: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Пән</label>
              <select className="ap-input" value={createForm.subject_id} onChange={(e) => setCreateForm({ ...createForm, subject_id: e.target.value })}>
                <option value="">Әмбебап</option>
                {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={create}>Құру</button>
          <button type="button" className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setShowCreate(false)}>Болдырмау</button>
        </div>
      )}

      <div className="form-panel" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
            <label className="ap-form-label">Іздеу</label>
            <input className="ap-input" placeholder="Нөмір немесе атауы..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label className="ap-form-label">Пән</label>
            <select className="ap-input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Барлығы</option>
              {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label className="ap-form-label">Күйі</label>
            <select className="ap-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Барлығы</option>
              <option value="active">Белсенді</option>
              <option value="inactive">Белсенді емес</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label className="ap-form-label">Сұрыптау</label>
            <select className="ap-input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="number">Нөмір бойынша</option>
              <option value="name">Атау бойынша</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={load}>Іздеу</button>
        </div>
      </div>

      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Нөмір</th>
                <th>Атауы</th>
                <th>Пән</th>
                <th>Сыйымдылық</th>
                <th>Күйі</th>
                <th>Әрекеттер</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.room_number != null ? String(r.room_number).padStart(2, '0') : '—'}</td>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.subject_name || 'Әмбебап'}</td>
                  <td>{r.capacity || 30} адам</td>
                  <td>{r.is_active !== false ? <span className="badge badge-green">Белсенді</span> : <span className="badge">Күшін жойған</span>}</td>
                  <td>
                    <Link to={`/admin/academic/classrooms/${r.id}`} style={{ marginRight: 10, color: '#2563eb' }} title="Көру"><i className="fas fa-eye"></i></Link>
                    <Link to={`/admin/academic/classrooms/${r.id}`} style={{ marginRight: 10, color: '#ea580c' }} title="Өңдеу"><i className="fas fa-pen"></i></Link>
                    <button type="button" style={{ marginRight: 10, color: '#ea580c', background: 'none', border: 'none', cursor: 'pointer' }} title="Күй" onClick={() => toggle(r.id)}><i className="fas fa-toggle-on"></i></button>
                    <button type="button" style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }} title="Жою" onClick={() => remove(r.id)}><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export default AcademicClassrooms;
