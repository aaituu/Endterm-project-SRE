import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const LessonObservationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    observation_date: '',
    teacher_id: '',
    subject: '',
    class_name: '',
    students_total: '',
    students_attended: '',
    topic: '',
    lesson_type: '',
    evaluation: '',
    kmj_standard: '',
    organization: '',
    homework: '',
    teacher_student_relation: '',
    new_lesson_explanation: '',
    topic_reveal: '',
    teaching_methods: '',
    task_delivery: '',
    feedback: '',
    conclusion: ''
  });
  
  const [photo, setPhoto] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    (async () => {
      const res = await api.teachers.list();
      if (res.success) setTeachers(res.data || []);
      
      // Default to today
      setFormData(prev => ({ ...prev, observation_date: today }));
    })();
  }, [today]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showToast('Файл көлемі 10MB-тан аспауы керек', 'error');
        return;
      }
      setPhoto(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.observation_date || !formData.teacher_id || !formData.subject || 
        !formData.class_name || !formData.students_total || !formData.students_attended || !formData.topic) {
      showToast('Барлық міндетті өрістерді толтырыңыз', 'error');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      if (photo) {
        submitData.append('photo', photo);
      }

      const data = await api.request('POST', '/lesson-observations', submitData, true);

      if (data && data.success) {
        showToast('Сабаққа ену құжаты қосылды', 'success');
        navigate('/admin/lesson-observations');
      } else {
        showToast(data.message || 'Қате орын алды', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Қате орын алды', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">
            <i className="fas fa-arrow-left"></i> Артқа
          </button>
          <div>
            <h1 className="ap-page-title">Жаңа сабаққа ену</h1>
            <p className="ap-page-sub">Жаңа сабаққа ену құжатын толтыру</p>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <form onSubmit={handleSubmit} className="ap-card" style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="form-group">
              <label className="ap-form-label">Күні *</label>
              <input type="date" name="observation_date" className="ap-input" value={formData.observation_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Мұғалім *</label>
              <select name="teacher_id" className="ap-input" value={formData.teacher_id} onChange={handleChange} required>
                <option value="">Таңдаңыз...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || t.fullname || t.username}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="ap-form-label">Пәні *</label>
              <input type="text" name="subject" className="ap-input" placeholder="Мысалы: Математика" value={formData.subject} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Сыныбы *</label>
              <input type="text" name="class_name" className="ap-input" placeholder="5А" value={formData.class_name} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="form-group">
              <label className="ap-form-label">Оқушы саны *</label>
              <input type="number" name="students_total" className="ap-input" value={formData.students_total} onChange={handleChange} min="1" required />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Қатысқаны *</label>
              <input type="number" name="students_attended" className="ap-input" value={formData.students_attended} onChange={handleChange} min="0" required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="ap-form-label">Сабақтың тақырыбы *</label>
              <input type="text" name="topic" className="ap-input" placeholder="Сабақтың тақырыбы..." value={formData.topic} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div className="form-group">
              <label className="ap-form-label">Сабақ түрі</label>
              <select name="lesson_type" className="ap-input" value={formData.lesson_type} onChange={handleChange}>
                <option value="">Таңдаңыз...</option>
                <option value="Жаңа сабақ">Жаңа сабақ</option>
                <option value="Қайталау сабағы">Қайталау сабағы</option>
                <option value="Бекіту сабағы">Бекіту сабағы</option>
                <option value="Аралас сабақ">Аралас сабақ</option>
                <option value="Ашық сабақ">Ашық сабақ</option>
              </select>
            </div>
            <div className="form-group">
              <label className="ap-form-label">Сабақты бағалау</label>
              <select name="evaluation" className="ap-input" value={formData.evaluation} onChange={handleChange}>
                <option value="">Таңдаңыз...</option>
                <option value="Өте жақсы">Өте жақсы</option>
                <option value="Жақсы">Жақсы</option>
                <option value="Орташа">Орташа</option>
                <option value="Төмен">Төмен</option>
              </select>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-2)', padding: '25px', borderRadius: '12px', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-tasks" style={{ color: 'var(--primary)' }}></i> Сабақты талдау
            </h3>
            
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="ap-form-label">ҚМЖ стандартқа сай болуы</label>
                <textarea name="kmj_standard" className="ap-input" rows="2" value={formData.kmj_standard} onChange={handleChange}></textarea>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Сабақты ұйымдастыру</label>
                <textarea name="organization" className="ap-input" rows="2" value={formData.organization} onChange={handleChange}></textarea>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Үй тапсырмасын орындауы</label>
                <textarea name="homework" className="ap-input" rows="2" value={formData.homework} onChange={handleChange}></textarea>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Мұғалімнің оқушылармен қарым-қатынасы</label>
                <textarea name="teacher_student_relation" className="ap-input" rows="2" value={formData.teacher_student_relation} onChange={handleChange}></textarea>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Жаңа сабақты түсіндіруі</label>
                <textarea name="new_lesson_explanation" className="ap-input" rows="2" value={formData.new_lesson_explanation} onChange={handleChange}></textarea>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Мұғалімнің тақырыпты ашуы</label>
                <textarea name="topic_reveal" className="ap-input" rows="2" value={formData.topic_reveal} onChange={handleChange}></textarea>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Мұғалімнің әдіс-тәсілдері</label>
                <textarea name="teaching_methods" className="ap-input" rows="2" value={formData.teaching_methods} onChange={handleChange}></textarea>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Тапсырманы беру деңгейі</label>
                <textarea name="task_delivery" className="ap-input" rows="2" value={formData.task_delivery} onChange={handleChange}></textarea>
              </div>
            </div>
            
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="ap-form-label">Кері байланыс</label>
              <textarea name="feedback" className="ap-input" rows="3" value={formData.feedback} onChange={handleChange}></textarea>
            </div>
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="ap-form-label">Сабаққа қорытынды пікір</label>
              <textarea name="conclusion" className="ap-input" rows="3" value={formData.conclusion} onChange={handleChange}></textarea>
            </div>
          </div>

          <div style={{ padding: '25px', borderRadius: '12px', border: '1px dashed var(--border)', textAlign: 'center', marginBottom: '30px' }}>
            <label className="ap-form-label" style={{ display: 'block', textAlign: 'left', marginBottom: '15px' }}>Сабақтан үзінді фото</label>
            <div style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={() => document.getElementById('photo-upload').click()}>
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '10px' }}></i>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Файлды жүктеу</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>JPEG, PNG, JPG (Max: 10MB)</p>
              <input type="file" id="photo-upload" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
            {photo && (
              <div style={{ marginTop: '15px', padding: '10px', background: 'var(--primary-ultra-light)', color: 'var(--primary)', borderRadius: '8px', fontSize: '0.9rem' }}>
                <i className="fas fa-file-image"></i> {photo.name}
              </div>
            )}
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Болдырмау</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Сақтау
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
};

export default LessonObservationForm;
