import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function RatingTypeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');

  useEffect(() => {
    if (isEdit) fetchData();
  }, [id, isEdit]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/rating-types/${id}`);
      if (res.success && res.data) {
        setName(res.data.name || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (isEdit) {
        res = await api.put(`/rating-types/${id}`, { name });
      } else {
        res = await api.post('/rating-types', { name });
      }

      if (res.success) navigate('/admin/rating-types');
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '500px', margin: '40px auto', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#fff' }}>
          {isEdit ? 'Рейтинг түрін өңдеу' : 'Жаңа рейтинг түрін қосу'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          
          <div className="ap-form-group">
            <label className="ap-form-label">Атауы</label>
            <input 
              type="text" 
              className="ap-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
            <button type="submit" className="ap-btn ap-btn-primary" style={{ padding: '12px 30px', fontSize: '16px', flex: 1 }}>
              Сақтау
            </button>
            <button type="button" onClick={() => navigate('/admin/rating-types')} className="ap-btn" style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', flex: 1 }}>
              Болдырмау
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}
