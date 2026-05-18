import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function CompetitionTypeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Offline'
  });

  useEffect(() => {
    if (isEdit) {
      fetchData();
    }
  }, [isEdit, id]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/competition-dictionaries/types/${id}`);
      if (res.success && res.data) {
        setFormData({
          name: res.data.name || '',
          type: res.data.type || 'Offline'
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
        res = await api.put(`/competition-dictionaries/types/${id}`, formData);
      } else {
        res = await api.post('/competition-dictionaries/types', formData);
      }

      if (res.success) {
        navigate('/admin/olympiads/types');
      } else {
        alert(res.message || 'Қате шықты');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '600px', margin: '40px auto', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#fff' }}>
          {isEdit ? 'Жарыс түрін өңдеу' : 'Жаңа жарыс түрін қосу'}
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
            <label style={{ color: '#4b5563', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Түрі</label>
            <select name="type" className="ap-input" value={formData.type} onChange={handleChange} required>
              <option value="Offline">Offline</option>
              <option value="Online">Online</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div style={{ marginTop: '40px' }}>
            <button type="submit" className="ap-btn ap-btn-primary" style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
              Сақтау
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}
