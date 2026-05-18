import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { formatDate, showToast, confirmDelete } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const AdminLessonObservations = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filters, setFilters] = useState({
    q: '',
    teacher_id: '',
    subject: '',
    class_name: '',
    date_from: '',
    date_to: ''
  });

  // Dropdown data options
  const [teachers, setTeachers] = useState([]);
  const [subjects] = useState(['Математика', 'Физика', 'Химия', 'Биология', 'География', 'Тарих', 'Орыс тілі', 'Қазақ тілі', 'Ағылшын тілі', 'Информатика', 'Дене шынықтыру']);
  const [classes] = useState(['1А','1Ә','2А','2Ә','3А','3Ә','4А','4Ә','5А','5Ә','6А','6Ә','7А','7Ә','8А','8Ә','9А','9Ә','10А','10Ә','11А','11Ә']);

  const loadDropdowns = async () => {
    const tRes = await api.teachers.list();
    if (tRes.success) setTeachers(tRes.data || []);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filters.q.trim()) p.set('q', filters.q.trim());
    if (filters.teacher_id) p.set('teacher_id', filters.teacher_id);
    if (filters.subject) p.set('subject', filters.subject);
    if (filters.class_name) p.set('class_name', filters.class_name);
    if (filters.date_from) p.set('date_from', filters.date_from);
    if (filters.date_to) p.set('date_to', filters.date_to);

    try {
      const data = await api.get(`/lesson-observations?${p.toString()}`);
      if (data && data.success) {
        setRows(data.data || []);
      } else {
        showToast(data.message || 'Error', 'error');
      }
    } catch (e) {
      showToast('Қате орын алды', 'error');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      q: '',
      teacher_id: '',
      subject: '',
      class_name: '',
      date_from: '',
      date_to: ''
    });
  };

  const removeRow = async (id) => {
    if (!(await confirmDelete('Сабаққа ену жазбасын жоюға сенімдісіз бе?'))) return;
    try {
      const data = await api.delete(`/lesson-observations/${id}`);
      if (data && data.success) {
        showToast('Жойылды', 'success');
        load();
      } else {
        showToast(data.message || 'Қате', 'error');
      }
    } catch (e) {
      showToast('Қате', 'error');
    }
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Сабаққа енуді бақылау</h1>
          <p className="ap-page-sub">Мұғалімдердің сабақтарына қатысу және талдау қорытындылары</p>
        </div>
        <Link to="/admin/lesson-observations/new" className="btn btn-primary">
          <i className="fas fa-plus"></i> Жаңа сабаққа ену
        </Link>
      </div>

      <div className="admin-content">
        <div className="ap-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
            <div className="ap-form-group">
              <label className="ap-form-label">Іздеу</label>
              <input
                className="ap-input"
                placeholder="Тақырып, пәні..."
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
              />
            </div>
            <div className="ap-form-group">
              <label className="ap-form-label">Мұғалім</label>
              <select className="ap-input" value={filters.teacher_id} onChange={(e) => handleFilterChange('teacher_id', e.target.value)}>
                <option value="">Барлығы</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || t.fullname || t.username}</option>)}
              </select>
            </div>
            <div className="ap-form-group">
              <label className="ap-form-label">Пән</label>
              <select className="ap-input" value={filters.subject} onChange={(e) => handleFilterChange('subject', e.target.value)}>
                <option value="">Барлығы</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="ap-form-group">
              <label className="ap-form-label">Сынып</label>
              <select className="ap-input" value={filters.class_name} onChange={(e) => handleFilterChange('class_name', e.target.value)}>
                <option value="">Барлығы</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="ap-form-group">
              <label className="ap-form-label">Мерзімі (басы)</label>
              <input type="date" className="ap-input" value={filters.date_from} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Тазалау</button>
          </div>
        </div>

        <div className="data-table-card ap-card">
          <div className="data-table-header" style={{ padding: '20px' }}>
             <h3 style={{ margin: 0 }}><i className="fas fa-chalkboard-teacher" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Сабаққа ену тізімі</h3>
          </div>
          <div className="table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th width="50">№</th>
                  <th width="120">Күні</th>
                  <th>Мұғалім</th>
                  <th>Пән / Сынып</th>
                  <th>Сабақтың тақырыбы</th>
                  <th className="text-center">Қатысқан</th>
                  <th className="text-right">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center" style={{ padding: '40px' }}><i className="fas fa-spinner fa-spin"></i> Жүктелуде...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="7" className="text-center" style={{ padding: '40px' }}>Ешқандай жазба табылған жоқ</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: '500' }}>
                      {r.observation_date ? formatDate(r.observation_date) : '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{r.teacher_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Толтырған: {r.filled_by_name}</div>
                    </td>
                    <td>
                      <div>{r.subject}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.class_name} сынып</div>
                    </td>
                    <td style={{ maxWidth: '250px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.topic}>
                        {r.topic}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${r.students_attended === r.students_total ? 'badge-green' : 'badge-amber'}`}>
                        {r.students_attended} / {r.students_total}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="ap-btn-del" onClick={() => removeRow(r.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
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

export default AdminLessonObservations;
