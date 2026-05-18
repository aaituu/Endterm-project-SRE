import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const AcademicClassroomEdit = () => {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, [id]);

  const load = async () => {
    const [rRes, sRes] = await Promise.all([
      api.academic.classrooms.get(id),
      api.academic.subjects.list()
    ]);
    if (sRes.success) setSubjects(sRes.data || []);
    if (rRes.success) setRoom(rRes.data);
  };

  const save = async () => {
    const res = await api.academic.classrooms.update(id, {
      name: room.name,
      room_number: room.room_number,
      capacity: Number(room.capacity) || 30,
      subject_id: room.subject_id || null,
      is_active: room.is_active
    });
    if (res.success) alert('Жаңартылды');
    else alert(res.message || 'Қате');
  };

  if (!room) return <AdminShell><p>Жүктелуде...</p></AdminShell>;

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Кабинетті өңдеу</h1>
          <p className="ap-page-sub">Кабинет мәліметтерін өзгерту</p>
        </div>
        <Link to="/admin/academic/classrooms" className="btn btn-secondary">Кабинеттер тізіміне</Link>
      </div>

      <div className="form-panel">
        <div className="form-grid">
          <div className="form-group">
            <label className="ap-form-label">Кабинет нөмірі *</label>
            <input className="ap-input" value={room.room_number ?? ''} onChange={(e) => setRoom({ ...room, room_number: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="ap-form-label">Кабинет атауы *</label>
            <input className="ap-input" value={room.name || ''} onChange={(e) => setRoom({ ...room, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="ap-form-label">Пән</label>
            <select
              className="ap-input"
              value={room.subject_id || ''}
              onChange={(e) => setRoom({ ...room, subject_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Пән таңдаңыз (әмбебап кабинет)</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <small style={{ color: '#64748b' }}>Пән таңдамасаңыз кабинет әмбебап болып есептеледі</small>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Сыйымдылық *</label>
            <input className="ap-input" type="number" value={room.capacity ?? 30} onChange={(e) => setRoom({ ...room, capacity: e.target.value })} />
            <small style={{ color: '#64748b' }}>Кабинетке сыятын максималды оқушы саны</small>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={room.is_active !== false} onChange={(e) => setRoom({ ...room, is_active: e.target.checked })} />
            Кабинет белсенді
          </label>
          <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>Белсенді емес кабинеттер қолданыста болмайды</small>
        </div>
        <div className="form-actions">
          <Link to="/admin/academic/classrooms" className="btn btn-secondary">Бас тарту</Link>
          <button type="button" className="btn btn-primary" onClick={save}>Жаңарту</button>
        </div>
      </div>
    </AdminShell>
  );
};

export default AcademicClassroomEdit;
