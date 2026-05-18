import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function CompetitionApplicationForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    teacher_id: '',
    student_id: '',
    competition_type: '',
    competition_subtype: ''
  });
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  const fetchAuxData = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/students')
      ]);
      if (tRes.success) setTeachers(tRes.data || []);
      if (sRes.success) setStudents(sRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/olympiads/admin-applications', formData);
      if (res.success) {
        navigate('/admin/olympiads/applications');
      } else {
        alert(res.message || 'Ошибка');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <AdminShell>
      <div className="ap-page-header">
        <h1 className="ap-page-title"></h1>
      </div>

      <div className="ap-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '30px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '25px', color: '#fff' }}>Жаңа өтінім қосу</h2>

        <form onSubmit={handleSubmit}>

          <div className="ap-form-group">
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Мұғалім</label>
            <select name="teacher_id" className="ap-input" value={formData.teacher_id} onChange={handleChange} required>
              <option value="">Таңдаңыз</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          <div className="ap-form-group">
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Оқушы (міндетті)</label>
            <select name="student_id" className="ap-input" value={formData.student_id} onChange={handleChange} required>
              <option value="">Таңдаңыз</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>

          <div className="ap-form-group">
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Жарыс түрі</label>
            <select name="competition_type" className="ap-input" value={formData.competition_type} onChange={handleChange} required>
              <option value="">Таңдаңыз</option>
              <option value="Олимпиада">Олимпиада</option>
              <option value="Байқау">Байқау</option>
              <option value="Конференция">Конференция</option>
            </select>
          </div>

          <div className="ap-form-group">
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Пән</label>
            <select name="competition_subtype" className="ap-input" value={formData.competition_subtype} onChange={handleChange} required>
              <option value="">Таңдаңыз</option>
              <option value="Ағылшын тілі">Ағылшын тілі</option>
              <option value="Математика">Математика</option>
              <option value="Физика">Физика</option>
              <option value="Информатика">Информатика</option>
              <option value="Республикалық олимпиада">Республикалық олимпиада</option>
              <option value="ALTYN QYRAN олимпиадасы">ALTYN QYRAN олимпиадасы</option>
            </select>
          </div>

          <div style={{ marginTop: '30px' }}>
            <button type="submit" className="ap-btn ap-btn-primary" style={{ width: '100%', padding: '12px' }}>
              Сақтау
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}
