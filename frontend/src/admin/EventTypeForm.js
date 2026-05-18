import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function EventTypeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    points: 0
  });

  useEffect(() => {
    if (isEdit) {
      fetchData();
    }
  }, [isEdit, id]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/event-types/${id}`);
      if (res.success && res.data) {
        setFormData({
          name: res.data.name || '',
          points: res.data.points || 0
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
    try {
      let res;
      if (isEdit) {
        res = await api.put(`/event-types/${id}`, formData);
      } else {
        res = await api.post('/event-types', formData);
      }

      if (res.success) {
        navigate('/admin/event-types');
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
      <div className="ap-card" style={{ maxWidth: '500px', margin: '40px auto', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#fff' }}>
          {isEdit ? 'Іс-шара түрін өңдеу' : 'Жаңа іс-шара түрін қосу'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          
          <div className="ap-form-group">
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Атауы</label>
            <input 
              type="text" 
              name="name" 
              className="ap-input" 
              value={formData.name} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="ap-form-group">
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Ұпай</label>
            <input 
              type="number" 
              name="points" 
              className="ap-input" 
              value={formData.points} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
            <button type="submit" className="ap-btn ap-btn-primary" style={{ padding: '12px 30px', fontSize: '16px', flex: 1 }}>
              Сақтау
            </button>
            <button type="button" onClick={() => navigate('/admin/event-types')} className="ap-btn" style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', flex: 1 }}>
              Болдырмау
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}
