import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function CompetitionNameForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    competition_type_id: '',
    is_active: true,
    is_online: false,
    start_date: '',
    end_date: ''
  });
  const [types, setTypes] = useState([]);

  useEffect(() => {
    fetchTypes();
    if (isEdit) fetchData();
  }, [id, isEdit]);

  const fetchTypes = async () => {
    try {
      const res = await api.get('/competition-dictionaries/types');
      if (res.success) setTypes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await api.get(`/competition-names/${id}`);
      if (res.success && res.data) {
        const d = res.data;
        setFormData({
          name: d.name || '',
          competition_type_id: d.competition_type_id || '',
          is_active: d.is_active,
          is_online: d.is_online,
          start_date: d.start_date ? d.start_date.split('T')[0] : '',
          end_date: d.end_date ? d.end_date.split('T')[0] : ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (isEdit) {
        res = await api.put(`/competition-names/${id}`, formData);
      } else {
        res = await api.post('/competition-names', formData);
      }

      if (res.success) navigate('/admin/olympiads/names');
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '600px', margin: '40px auto', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#fff' }}>
          {isEdit ? 'Жарыс атауын өңдеу' : 'Жаңа жарыс атауын қосу'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          
          <div className="ap-form-group">
            <label className="ap-form-label">Атауы</label>
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
            <label className="ap-form-label">Жарыс түрі</label>
            <select 
              name="competition_type_id" 
              className="ap-input" 
              value={formData.competition_type_id} 
              onChange={handleChange}
            >
              <option value="">Түрін таңдаңыз</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label className="ap-form-label">Басталуы</label>
              <input 
                type="date" 
                name="start_date" 
                className="ap-input" 
                value={formData.start_date} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className="ap-form-label">Аяқталуы</label>
              <input 
                type="date" 
                name="end_date" 
                className="ap-input" 
                value={formData.end_date} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div className="ap-form-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#4b5563' }}>
              <input 
                type="checkbox" 
                name="is_active" 
                checked={formData.is_active} 
                onChange={handleChange} 
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
              />
              Статус (Белсенді)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#4b5563' }}>
              <input 
                type="checkbox" 
                name="is_online" 
                checked={formData.is_online} 
                onChange={handleChange} 
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
              />
              Онлайн жарыс
            </label>
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
            <button type="submit" className="ap-btn ap-btn-primary" style={{ padding: '12px 30px', fontSize: '16px', flex: 1 }}>
              Қосу
            </button>
            <button type="button" onClick={() => navigate('/admin/olympiads/names')} className="ap-btn" style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', flex: 1 }}>
              Болдырмау
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}
