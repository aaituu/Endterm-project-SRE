import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const AcademicSubjectEdit = () => {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [addTid, setAddTid] = useState('');
  const [addCid, setAddCid] = useState('');

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, [id]);

  const load = async () => {
    const [subRes, tRes, cRes] = await Promise.all([
      api.academic.subjects.get(id),
      api.teachers.list('limit=400'),
      api.academic.classes.list('limit=200')
    ]);
    if (subRes.success) setSubject(subRes.data);
    if (tRes.success) setTeachers(tRes.data || []);
    if (cRes.success) setClasses(cRes.data || []);
  };

  const save = async () => {
    const res = await api.academic.subjects.update(id, {
      name: subject.name,
      weekly_hours: Number(subject.weekly_hours),
      is_open_lesson: !!subject.is_open_lesson,
      is_homeroom_lesson: !!subject.is_homeroom_lesson,
      is_block_lesson: !!subject.is_block_lesson
    });
    if (res.success) alert('Сақталды');
    else alert(res.message || 'Қате');
  };

  const addTeacher = async () => {
    if (!addTid) return;
    const res = await api.academic.subjects.addTeacher(id, addTid);
    if (res.success) { setAddTid(''); load(); }
  };

  const delTeacher = async (tid) => {
    const res = await api.academic.subjects.removeTeacher(id, tid);
    if (res.success) load();
  };

  const addClass = async () => {
    if (!addCid) return;
    const res = await api.academic.subjects.addClass(id, addCid);
    if (res.success) { setAddCid(''); load(); }
  };

  const delClass = async (cid) => {
    const res = await api.academic.subjects.removeClass(id, cid);
    if (res.success) load();
  };

  if (!subject) return <AdminShell><p>Жүктелуде...</p></AdminShell>;

  const st = subject.teachers || [];
  const cl = subject.classes || [];

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Пәнді өңдеу</h1>
          <p className="ap-page-sub">{subject.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/academic/subjects" className="btn btn-secondary">Тізімге оралу</Link>
        </div>
      </div>

      <div className="form-panel">
        <h3>Негізгі мәліметтер</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="ap-form-label">Пән атауы *</label>
            <input className="ap-input" value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="ap-form-label">Аптадағы сабақтар саны *</label>
            <input className="ap-input" type="number" value={subject.weekly_hours} onChange={(e) => setSubject({ ...subject, weekly_hours: e.target.value })} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!subject.is_open_lesson} onChange={(e) => setSubject({ ...subject, is_open_lesson: e.target.checked })} />
            Ашық сабақ (сынып сағаты)
          </label>
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!subject.is_homeroom_lesson} onChange={(e) => setSubject({ ...subject, is_homeroom_lesson: e.target.checked })} />
            Сынып жетекшісі өткізетін сабақ
          </label>
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!subject.is_block_lesson} onChange={(e) => setSubject({ ...subject, is_block_lesson: e.target.checked })} />
            Блокты сабақтар
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={save}>Өзгерістерді сақтау</button>
        </div>
      </div>

      <div className="form-panel" style={{ marginTop: 20 }}>
        <h3>Пән мұғалімдері</h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Қазіргі мұғалімдер:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {st.map((t) => (
            <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span className="badge badge-green">{t.full_name}</span>
              <button type="button" className="ap-btn-del" style={{ padding: '4px 10px' }} onClick={() => delTeacher(t.id)}>Жою</button>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <select className="ap-input" style={{ maxWidth: 280 }} value={addTid} onChange={(e) => setAddTid(e.target.value)}>
            <option value="">Мұғалім қосу...</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={addTeacher}>Қосу</button>
        </div>
      </div>

      <div className="form-panel" style={{ marginTop: 20 }}>
        <h3>Пән сыныптары</h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Қазіргі сыныптар:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {cl.map((c) => (
            <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span className="badge badge-blue">{c.name}</span>
              <button type="button" className="ap-btn-del" style={{ padding: '4px 10px' }} onClick={() => delClass(c.id)}>Жою</button>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <select className="ap-input" style={{ maxWidth: 280 }} value={addCid} onChange={(e) => setAddCid(e.target.value)}>
            <option value="">Сынып қосу...</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={addClass}>Қосу</button>
        </div>
      </div>
    </AdminShell>
  );
};

export default AcademicSubjectEdit;
