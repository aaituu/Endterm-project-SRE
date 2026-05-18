import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api, { getImageUrl } from '../utils/api.js';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/events/${id}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearch(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const parts = data.participants || [];
      const partIds = parts.map(p => p.user_id);
      
      const res = await api.get(`/users?search=${encodeURIComponent(val)}&limit=10`);
      if (res.success && res.data) {
        const diff = res.data.data.filter(u => !partIds.includes(u.id));
        setSearchResults(diff);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addParticipant = async (user) => {
    try {
      const res = await api.post(`/events/${id}/participants`, { user_id: user.id });
      if (res.success) {
        setSearch('');
        setSearchResults([]);
        fetchEvent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeParticipant = async (userId) => {
    try {
      const res = await api.delete(`/events/${id}/participants/${userId}`);
      if (res.success) {
        fetchEvent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <AdminShell><div style={{ padding: '40px', textAlign: 'center' }}>Жүктелуде...</div></AdminShell>;
  if (!data) return <AdminShell><div style={{ padding: '40px', textAlign: 'center' }}>Мәлімет жоқ</div></AdminShell>;

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '800px', margin: '40px auto', padding: '0', overflow: 'hidden' }}>
        
        <img 
          src={getImageUrl(data.image_url) || '/placeholder.png'} 
          alt={data.title}
          style={{ width: '100%', height: '300px', objectFit: 'cover' }}
        />
        
        <div style={{ padding: '40px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '15px' }}>
            {data.type_name ? `${data.type_name}. ` : ''}{data.title}
          </h1>

          <div style={{ display: 'flex', gap: '20px', color: '#4b5563', fontSize: '14px', marginBottom: '30px' }}>
            <div><i className="far fa-calendar-alt"></i> {new Date(data.date).toLocaleDateString()}</div>
            <div><i className="far fa-clock"></i> {data.time?.substring(0,5)}</div>
            <div><i className="fas fa-map-marker-alt" style={{ color: '#9ca3af' }}></i> {data.location}</div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '10px' }}>Описание мероприятия</h3>
            <div style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: data.description }}></div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '10px' }}>Участники мероприятия</h3>
            <div className="ap-participants-list" style={{ border: '1px solid var(--ap-border)', borderRadius: '6px', padding: '15px', marginBottom: '15px', minHeight: '50px' }}>
              {(!data.participants || data.participants.length === 0) ? (
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>Нет участников</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {data.participants.map(p => (
                    <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '20px', fontSize: '13px' }}>
                      <span style={{ fontWeight: '500', color: '#94a3b8' }}>{p.full_name}</span>
                      <button onClick={() => removeParticipant(p.user_id)} style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9', marginBottom: '8px' }}>Изменить участников</h4>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="ap-input" 
                  placeholder="Поиск по ФИО или email" 
                  value={search}
                  onChange={handleSearch}
                />
                {searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--ap-card)', border: '1px solid var(--ap-border)', zIndex: 10, borderRadius: '6px', marginTop: '4px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    {searchResults.map(u => (
                      <div key={u.id} style={{ padding: '10px 15px', borderBottom: '1px solid var(--ap-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>{u.full_name}</div>
                          <div style={{ color: '#64748b', fontSize: '12px' }}>{u.role.name || u.role}</div>
                        </div>
                        <button onClick={() => addParticipant(u)} className="ap-btn ap-btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                          Добавить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="ap-btn" style={{ marginTop: '15px', backgroundColor: '#93c5fd', color: '#1e3a8a', border: 'none' }}>Добавить выбранных</button>
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '10px' }}>Создано пользователем</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <i className="far fa-user" style={{ fontSize: '18px', color: '#3b82f6' }}></i>
              <div>
                <span style={{ fontWeight: '600', color: '#1d4ed8', marginRight: '10px' }}>{data.creator_name || 'Белгісіз'}</span>
                <span style={{ color: '#64748b', fontSize: '13px' }}>({data.creator_role || 'Қолданушы'})</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
             <button onClick={() => navigate(`/admin/events/${data.id}/edit`)} className="ap-btn" style={{ padding: '10px 30px', backgroundColor: '#dbeafe', color: '#1d4ed8', border: 'none', fontWeight: '500' }}>
              Изменить
            </button>
            <button onClick={() => navigate('/admin/events')} className="ap-btn" style={{ padding: '10px 30px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', fontWeight: '500' }}>
              Назад
            </button>
          </div>

        </div>
      </div>
    </AdminShell>
  );
}
