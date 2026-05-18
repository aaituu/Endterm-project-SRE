import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function AchievementForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    competition_name: '',
    achievement_type: '',
    level: '',
    achievement_date: '',
    student_id: '',
    curator_teacher_id: '',
    place_rank: '',
    publish_to_news: 'none',
    verified: false,
  });

  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    fetchAuxData();
    if (isEdit) {
      fetchAchievement();
    }
  }, [isEdit, id]);

  const fetchAuxData = async () => {
    try {
      const [stRes, thRes] = await Promise.all([
        api.get('/students'),
        api.get('/teachers')
      ]);
      if (stRes.success) setStudents(stRes.data);
      if (thRes.success) setTeachers(thRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAchievement = async () => {
    try {
      const res = await api.get(`/student-achievements/${id}`);
      if (res.success && res.data) {
        setFormData({
          competition_name: res.data.competition_name || '',
          achievement_type: res.data.achievement_type || '',
          level: res.data.level || '',
          achievement_date: res.data.achievement_date ? res.data.achievement_date.split('T')[0] : '',
          student_id: res.data.student_id || '',
          curator_teacher_id: res.data.curator_teacher_id || '',
          place_rank: res.data.place_rank || '',
          publish_to_news: res.data.publish_to_news || 'none',
          verified: res.data.verified || false,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        fd.append(key, formData[key]);
      });
      if (file) {
        fd.append('certificate', file);
      }

      let res;
      if (isEdit) {
        res = await api.put(`/student-achievements/${id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/student-achievements', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (res.success) {
        navigate('/admin/olympiads/achievements');
      } else {
        alert(res.message || 'Error occurred');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <AdminShell>
      <div className="ap-page-header">
        <h1 className="ap-page-title">{isEdit ? 'Жетістік өңдеу' : 'Жетістік қосу'}</h1>
      </div>

      <div className="ap-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
        <form onSubmit={handleSubmit}>

          <div className="ap-form-group">
            <label>Байқау атауы</label>
            <select name="competition_name" className="ap-input" value={formData.competition_name} onChange={handleChange} required>
              <option value="">Таңдаңыз</option>
              <option value='"Кенгуру" ойын-конкурсы'>"Кенгуру" ойын-конкурсы</option>
              <option value="Қазақша күрес">Қазақша күрес</option>
              <option value="Алтын түлек">Алтын түлек</option>
              <option value="Республикалық олимпиада">Республикалық олимпиада</option>
            </select>
          </div>

          <div className="ap-form-group">
            <label>Түрі</label>
            <select name="achievement_type" className="ap-input" value={formData.achievement_type} onChange={handleChange}>
              <option value="">Таңдаңыз</option>
              <option value="Байқау конкурс">Байқау конкурс</option>
              <option value="Спорттық олимпиада">Спорттық олимпиада</option>
              <option value="Олимпиада">Олимпиада</option>
            </select>
          </div>

          <div className="ap-form-group">
            <label>Деңгейі</label>
            <select name="level" className="ap-input" value={formData.level} onChange={handleChange}>
              <option value="">Таңдаңыз</option>
              <option value="Мектепішілік">Мектепішілік</option>
              <option value="Аудандық">Аудандық</option>
              <option value="Облыстық">Облыстық</option>
              <option value="Республикалық">Республикалық</option>
              <option value="Халықаралық">Халықаралық</option>
            </select>
          </div>

          <div className="ap-form-group">
            <label>Күні</label>
            <input type="date" name="achievement_date" className="ap-input" value={formData.achievement_date} onChange={handleChange} />
          </div>

          <div className="ap-form-group">
            <label>Қатысушы</label>
            <select name="student_id" className="ap-input" value={formData.student_id} onChange={handleChange} required>
              <option value="">Аты немесе ИИН</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.iin})</option>
              ))}
            </select>
          </div>

          <div className="ap-form-group">
            <label>Куратор</label>
            <select name="curator_teacher_id" className="ap-input" value={formData.curator_teacher_id} onChange={handleChange}>
              <option value="">Аты немесе ИИН</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          <div className="ap-form-group">
            <label>Орын</label>
            <select name="place_rank" className="ap-input" value={formData.place_rank} onChange={handleChange}>
              <option value="">Таңдаңыз</option>
              <option value="Бас жүлде">Бас жүлде</option>
              <option value="1 орын">1 орын</option>
              <option value="2 орын">2 орын</option>
              <option value="3 орын">3 орын</option>
              <option value="Қатысушы">Қатысушы</option>
            </select>
          </div>

          <div className="ap-form-group">
            <label>Сертификат (файл)</label>
            <input type="file" name="certificate" className="ap-input" onChange={handleFileChange} />
          </div>

          <div className="ap-form-group">
            <label>Жаңалыққа шығару</label>
            <select name="publish_to_news" className="ap-input" value={formData.publish_to_news} onChange={handleChange}>
              <option value="none">Әрекет керек емес</option>
              <option value="pending">Күтілуде</option>
              <option value="published">Шығарылды</option>
            </select>
          </div>

          <div className="ap-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" id="verified" name="verified" checked={formData.verified} onChange={handleChange} style={{ width: 'auto', marginBottom: 0 }} />
            <label htmlFor="verified" style={{ margin: 0 }}>Тексерілген</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
            <button type="button" className="ap-btn" onClick={() => navigate(-1)} style={{ backgroundColor: '#e2e8f0', color: '#f1f5f9', border: 'none' }}>
              Болдырмау
            </button>
            <button type="submit" className="ap-btn ap-btn-primary">
              Сақтау
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}
