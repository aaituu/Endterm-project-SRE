import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import '../../css/style.css';
import '../../css/admin.css';

import AdminShell from '../components/AdminShell.js';

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formFields, setFormFields] = useState({
    full_name: '',
    iin: '',
    password: '',
    category: '',
    subject: '',
    achievements_count: 0,
    lessons_count: 0,
    events_count: 0,
    awards_count: 0,
    class_leadership: '',
    bio: '',
    photo: null
  });

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    const res = await api.teachers.list();
    setTeachers(res.success ? res.data || [] : []);
    setLoading(false);
  };

  const filteredTeachers = teachers.filter(t => {
    const query = searchQuery.toLowerCase();
    return !query || t.full_name?.toLowerCase().includes(query) || t.subject?.toLowerCase().includes(query);
  });

  const openForm = (teacher = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormFields({
        full_name: teacher.full_name || '',
        iin: teacher.iin || '',
        password: '',
        category: teacher.category || '',
        subject: teacher.subject || '',
        achievements_count: teacher.achievements_count || 0,
        lessons_count: teacher.lessons_count || 0,
        events_count: teacher.events_count || 0,
        awards_count: teacher.awards_count || 0,
        class_leadership: teacher.class_leadership || '',
        bio: teacher.bio || '',
        photo: null
      });
    } else {
      setEditingTeacher(null);
      setFormFields({
        full_name: '',
        iin: '',
        password: '',
        category: '',
        subject: '',
        achievements_count: 0,
        lessons_count: 0,
        events_count: 0,
        awards_count: 0,
        class_leadership: '',
        bio: '',
        photo: null
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTeacher(null);
    setFormFields({
      full_name: '',
      iin: '',
      password: '',
      category: '',
      subject: '',
      achievements_count: 0,
      lessons_count: 0,
      events_count: 0,
      awards_count: 0,
      class_leadership: '',
      bio: '',
      photo: null
    });
  };

  const handleFieldChange = (key, value) => {
    setFormFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!formFields.full_name.trim() || !formFields.iin.trim()) {
      showToast('Аты-жөні мен ЖСН енгізіңіз', 'error');
      return;
    }
    if (formFields.iin.length !== 12 || !/^[0-9]+$/.test(formFields.iin)) {
      showToast('ЖСН 12 цифрдан тұруы керек', 'error');
      return;
    }
    const fd = new FormData();
    fd.append('full_name', formFields.full_name.trim());
    fd.append('iin', formFields.iin.trim());
    if (formFields.password) fd.append('password', formFields.password);
    fd.append('category', formFields.category);
    fd.append('subject', formFields.subject);
    fd.append('achievements_count', formFields.achievements_count);
    fd.append('lessons_count', formFields.lessons_count);
    fd.append('events_count', formFields.events_count);
    fd.append('awards_count', formFields.awards_count);
    fd.append('class_leadership', formFields.class_leadership);
    fd.append('bio', formFields.bio);
    if (formFields.photo) fd.append('photo', formFields.photo);

    const res = editingTeacher
      ? await api.teachers.update(editingTeacher.id, fd)
      : await api.teachers.create(fd);

    if (res.success) {
      showToast(editingTeacher ? 'Мұғалім сақталды' : 'Мұғалім қосылды', 'success');
      closeForm();
      loadTeachers();
    } else {
      showToast(res.message || 'Қате орын алды', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Мұғалімді жойғыңыз келетінін растаңыз ба?')) return;
    const res = await api.teachers.delete(id);
    if (res.success) {
      showToast('Мұғалім жойылды', 'success');
      loadTeachers();
    } else {
      showToast(res.message || 'Қате орын алды', 'error');
    }
  };

  const getAvatar = (teacher) => {
    if (teacher.photo_url) {
      if (teacher.photo_url.startsWith('http')) return teacher.photo_url;
      const normalizedPath = teacher.photo_url.startsWith('/') ? teacher.photo_url : `/${teacher.photo_url}`;
      const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const baseUrl = isLocalDev ? `http://${window.location.hostname}:3001` : '';
      return `${baseUrl}${normalizedPath}`;
    }
    return null;
  };

  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Мұғалімдерді басқару</h1>
          <p className="ap-page-sub">Мұғалімдер тізімі мен мәліметтерін өңдеу</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm(null)}>
          <i className="fas fa-plus"></i> Мұғалім қосу
        </button>
      </div>

      <div className="admin-content">
        {showForm && (
          <div className="form-panel ap-card" style={{ marginBottom: '24px' }}>
            <div className="form-panel-header" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0 }}><i className="fas fa-user-edit"></i> {editingTeacher ? 'Мұғалімді өзгерту' : 'Жаңа мұғалім'}</h3>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="ap-form-label">Толық аты-жөні *</label>
                <input className="ap-input" value={formFields.full_name} onChange={(e) => handleFieldChange('full_name', e.target.value)} placeholder="ФИО" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">ЖСН *</label>
                <input className="ap-input" value={formFields.iin} onChange={(e) => handleFieldChange('iin', e.target.value)} placeholder="000000000000" maxLength={12} />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Құпия сөз {editingTeacher ? '(өзгерту үшін)' : '*'}</label>
                <input className="ap-input" type="password" value={formFields.password} onChange={(e) => handleFieldChange('password', e.target.value)} placeholder="Құпия сөз" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Санаты</label>
                <select className="ap-input" value={formFields.category} onChange={(e) => handleFieldChange('category', e.target.value)}>
                  <option value="">Таңдаңыз</option>
                  <option>Мұғалім-сарапшы</option>
                  <option>Мұғалім-зерттеуші</option>
                  <option>Мұғалім-модератор</option>
                </select>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Пән</label>
                <input className="ap-input" value={formFields.subject} onChange={(e) => handleFieldChange('subject', e.target.value)} placeholder="Математика" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Жетістіктер</label>
                <input className="ap-input" type="number" min="0" value={formFields.achievements_count} onChange={(e) => handleFieldChange('achievements_count', Number(e.target.value))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Сабақтар</label>
                <input className="ap-input" type="number" min="0" value={formFields.lessons_count} onChange={(e) => handleFieldChange('lessons_count', Number(e.target.value))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Іс-шаралар</label>
                <input className="ap-input" type="number" min="0" value={formFields.events_count} onChange={(e) => handleFieldChange('events_count', Number(e.target.value))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Марапаттар</label>
                <input className="ap-input" type="number" min="0" value={formFields.awards_count} onChange={(e) => handleFieldChange('awards_count', Number(e.target.value))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Сынып жетекшілігі</label>
                <input className="ap-input" value={formFields.class_leadership} onChange={(e) => handleFieldChange('class_leadership', e.target.value)} placeholder="10А" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Фото</label>
                <input className="ap-input" type="file" accept="image/*" onChange={(e) => handleFieldChange('photo', e.target.files[0])} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="ap-form-label">Биография</label>
                <textarea className="ap-input" rows={3} value={formFields.bio} onChange={(e) => handleFieldChange('bio', e.target.value)} placeholder="Мұғалім туралы..."></textarea>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-save"></i> Сақтау</button>
              <button className="btn btn-secondary" onClick={closeForm}>Болдырмау</button>
            </div>
          </div>
        )}

        <div className="data-table-card ap-card">
          <div className="data-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
            <h3 style={{ margin: 0 }}><i className="fas fa-chalkboard-teacher" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Мұғалімдер тізімі</h3>
            <div className="table-search" style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
              <input className="ap-input" style={{ paddingLeft: '35px', width: '250px' }} placeholder="Іздеу..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th width="50">#</th>
                  <th>Аты-жөні</th>
                  <th>Санаты</th>
                  <th>Пән</th>
                  <th>Жетістік</th>
                  <th>Белсенді</th>
                  <th className="text-right">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center"><i className="fas fa-spinner fa-spin"></i> Жүктелуде...</td></tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center">Мұғалім табылған жоқ</td></tr>
                ) : filteredTeachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td className="td-id">{teacher.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {getAvatar(teacher) ? (
                          <img src={getAvatar(teacher)} alt={teacher.full_name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>{teacher.full_name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
                        )}
                        <span className="td-name">{teacher.full_name}</span>
                      </div>
                    </td>
                    <td>{teacher.category ? <span className={`badge ${teacher.category === 'Мұғалім-сарапшы' ? 'badge-blue' : teacher.category === 'Мұғалім-зерттеуші' ? 'badge-purple' : 'badge-green'}`}>{teacher.category}</span> : '—'}</td>
                    <td>{teacher.subject || '—'}</td>
                    <td>{teacher.achievements_count || 0}</td>
                    <td>{teacher.is_active !== false ? <span className="badge badge-green">Белсенді</span> : <span className="badge badge-gray">Өшірілген</span>}</td>
                    <td className="text-right">
                      <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="ap-btn-edit" onClick={() => openForm(teacher)}><i className="fas fa-edit"></i></button>
                        <button className="ap-btn-del" onClick={() => handleDelete(teacher.id)}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};
export default AdminTeachers;
