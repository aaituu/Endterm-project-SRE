import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    event_type_id: '',
    description: ''
  });
  const [types, setTypes] = useState([]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchTypes();
    if (isEdit) {
      fetchEvent();
    }
  }, [isEdit, id]);

  const fetchTypes = async () => {
    try {
      const res = await api.get('/event-types');
      if (res.success) setTypes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      if (res.success && res.data) {
        const d = res.data;
        setFormData({
          title: d.title || '',
          date: d.date ? d.date.split('T')[0] : '',
          time: d.time ? d.time.substring(0, 5) : '',
          location: d.location || '',
          event_type_id: d.event_type_id || '',
          description: d.description || ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.keys(formData).forEach(key => fd.append(key, formData[key]));
    if (file) fd.append('image', file);

    try {
      let res;
      if (isEdit) {
        res = await api.uploadPut(`/events/${id}`, fd);
      } else {
        res = await api.upload('/events', fd);
      }

      if (res.success) {
        navigate('/admin/events');
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
      <div className="ap-card" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#fff' }}>
          {isEdit ? 'Редактировать мероприятие' : 'Добавить мероприятие'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          
          <div className="ap-form-group" style={{ marginBottom: '20px' }}>
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Название</label>
            <input 
              type="text" 
              name="title" 
              className="ap-input" 
              placeholder="Введите название"
              value={formData.title} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Дата</label>
              <input 
                type="date" 
                name="date" 
                className="ap-input" 
                value={formData.date} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Время</label>
              <input 
                type="time" 
                name="time" 
                className="ap-input" 
                value={formData.time} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="ap-form-group" style={{ marginBottom: '20px' }}>
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Место</label>
            <input 
              type="text" 
              name="location" 
              className="ap-input" 
              placeholder="Актовый зал, спортзал и т.д."
              value={formData.location} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="ap-form-group" style={{ marginBottom: '20px' }}>
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Тип события</label>
            <select name="event_type_id" className="ap-input" value={formData.event_type_id} onChange={handleChange} required>
              <option value="">Выберите тип события</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.points} ұпай)</option>
              ))}
            </select>
          </div>

          <div className="ap-form-group" style={{ marginBottom: '20px' }}>
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Изображение</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--ap-border)', borderRadius: '6px', padding: '6px 12px' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setFile(e.target.files[0])} 
                style={{ fontSize: '14px' }}
              />
            </div>
          </div>

          <div className="ap-form-group" style={{ marginBottom: '30px' }}>
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Описание</label>
            <textarea 
              name="description" 
              className="ap-input" 
              rows="6"
              style={{ resize: 'vertical' }}
              value={formData.description} 
              onChange={handleChange} 
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
            <button type="button" onClick={() => navigate('/admin/events')} className="ap-btn" style={{ padding: '10px 25px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', fontWeight: '500' }}>
              Отмена
            </button>
            <button type="submit" className="ap-btn ap-btn-primary" style={{ padding: '10px 25px', backgroundColor: '#3b82f6', border: 'none', fontWeight: '500' }}>
              Сохранить
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}
