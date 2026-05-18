import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function RatingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    user_id: '',
    total_points: 0,
    details: []
  });

  const [users, setUsers] = useState([]);
  const [ratingTypes, setRatingTypes] = useState([]);
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchAuxData();
    if (isEdit) fetchData();
  }, [id, isEdit]);

  const fetchAuxData = async () => {
    try {
      const rtRes = await api.get('/rating-types');
      if (rtRes.success) setRatingTypes(rtRes.data);

      const uRes = await api.get('/users?role=user,teacher'); // adjust if needed
      if (uRes.success) {
        setUsers(uRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await api.get(`/ratings/${id}`);
      if (res.success && res.data) {
        setFormData({
          user_id: res.data.user_id,
          total_points: res.data.total_points,
          details: res.data.details || []
        });
        setSelectedUser({
          id: res.data.user_id,
          full_name: res.data.full_name,
          iin: res.data.iin
        });
        setUserSearchText(res.data.full_name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDetail = () => {
    setFormData(p => ({
      ...p,
      details: [...p.details, { rating_type_id: '', material_link: '', points: 0 }]
    }));
  };

  const handleRemoveDetail = (index) => {
    setFormData(p => {
      const newD = [...p.details];
      newD.splice(index, 1);
      return { ...p, details: newD };
    });
  };

  const handleDetailChange = (index, field, value) => {
    setFormData(p => {
      const newD = [...p.details];
      newD[index][field] = value;
      return { ...p, details: newD };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id) {
      alert('Пайдаланушыны таңдаңыз!');
      return;
    }
    try {
      let res;
      if (isEdit) {
        res = await api.put(`/ratings/${id}`, formData);
      } else {
        res = await api.post('/ratings', formData);
      }
      if (res.success) navigate('/admin/ratings');
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const filteredUsers = userSearchText.length > 2 && !selectedUser 
    ? users.filter(u => (u.full_name || '').toLowerCase().includes(userSearchText.toLowerCase()) || (u.iin || '').includes(userSearchText))
    : [];

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
            {isEdit ? 'Рейтингті өңдеу' : 'Жаңа рейтинг қосу'}
          </h2>
          <button onClick={() => navigate('/admin/ratings')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
            <i className="fas fa-arrow-left"></i> Артқа
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          
          <div className="ap-form-group" style={{ position: 'relative' }}>
            <label className="ap-form-label">Пайдаланушыны іздеу *</label>
            <input 
              type="text" 
              className="ap-input" 
              placeholder="Аты, ИИН, немесе ID енгізіңіз"
              value={userSearchText} 
              onChange={e => {
                setUserSearchText(e.target.value);
                setSelectedUser(null);
                setFormData(p => ({ ...p, user_id: '' }));
              }} 
            />
            {filteredUsers.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--ap-card)', border: '1px solid var(--ap-border)', borderRadius: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                {filteredUsers.map(u => (
                  <div 
                    key={u.id} 
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--ap-border)' }}
                    onClick={() => {
                      setSelectedUser(u);
                      setUserSearchText(u.full_name);
                      setFormData(p => ({ ...p, user_id: u.id }));
                    }}
                  >
                    <strong>{u.full_name}</strong> (ИИН: {u.iin})
                  </div>
                ))}
              </div>
            )}
            {selectedUser && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#3b82f6' }}>
                Таңдалған: {selectedUser.full_name} (ИИН: {selectedUser.iin})
              </div>
            )}
          </div>

          <div className="ap-form-group">
            <label className="ap-form-label">Жалпы ұпай *</label>
            <input 
              type="number" 
              className="ap-input" 
              style={{ borderColor: '#3b82f6', boxShadow: 'inset 0 0 0 1px #3b82f6' }}
              value={formData.total_points} 
              onChange={e => setFormData({ ...formData, total_points: parseFloat(e.target.value) || 0 })} 
              required 
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '30px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>Рейтинг статистикасы</h3>
            <button type="button" onClick={handleAddDetail} className="ap-btn" style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '13px', padding: '6px 14px', borderRadius: '6px' }}>
              <i className="fas fa-plus"></i> Қосу
            </button>
          </div>

          {formData.details.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '30px 0' }}>
              Статистика жоқ. "Қосу" батырмасын басыңыз.
            </div>
          ) : (
            formData.details.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1.5fr) minmax(200px, 2fr) 100px 30px', gap: '15px', alignItems: 'end', marginBottom: '15px' }}>
                <div style={{ position: 'relative' }}>
                  {index === 0 && <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Түрі *</label>}
                  <select 
                    className="ap-input"
                    value={item.rating_type_id}
                    onChange={(e) => handleDetailChange(index, 'rating_type_id', e.target.value)}
                    required
                  >
                    <option value="">Түрін таңдаңыз</option>
                    {ratingTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  {index === 0 && <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Материал сілтемесі</label>}
                  <input 
                    type="url" 
                    className="ap-input" 
                    placeholder="https://..."
                    value={item.material_link}
                    onChange={(e) => handleDetailChange(index, 'material_link', e.target.value)}
                  />
                </div>
                <div>
                  {index === 0 && <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ұпай *</label>}
                  <input 
                    type="number" 
                    className="ap-input" 
                    value={item.points}
                    onChange={(e) => handleDetailChange(index, 'points', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div style={{ paddingBottom: '10px' }}>
                  <button type="button" onClick={() => handleRemoveDetail(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            ))
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '30px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
            <button type="button" onClick={() => navigate('/admin/ratings')} className="ap-btn" style={{ padding: '10px 24px', backgroundColor: 'var(--ap-card)', border: '1px solid var(--ap-border)', color: '#94a3b8' }}>
              Бас тарту
            </button>
            <button type="submit" className="ap-btn ap-btn-primary" style={{ padding: '10px 30px', backgroundColor: '#2563eb' }}>
              {isEdit ? 'Жаңарту' : 'Сақтау'}
            </button>
          </div>

        </form>
      </div>
    </AdminShell>
  );
}
