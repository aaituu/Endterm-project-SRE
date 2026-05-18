import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api, { confirmDelete } from '../utils/api.js';

export default function Ratings() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('points_desc');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [search, sort]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/ratings?search=${encodeURIComponent(search)}&sort=${sort}`);
      if (res.success) setData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDelete('Өшіруді растайсыз ба?'))) return;
    try {
      const res = await api.delete(`/ratings/${id}`);
      if (res.success) fetchData();
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '1200px', margin: '20px auto', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Рейтингтер</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="ap-btn" style={{ backgroundColor: '#16a34a', color: 'white', border: 'none' }}>
              <i className="fas fa-file-excel"></i> Excel экспорты
            </button>
            <Link to="/admin/ratings/new" className="ap-btn ap-btn-primary" style={{ backgroundColor: '#2563eb', border: 'none' }}>
              <i className="fas fa-plus"></i> Қосу
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.5fr) 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Іздеу</label>
            <input 
              type="text" 
              className="ap-input" 
              placeholder="Пайдаланушы аты немесе ЖСН..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Пайдаланушы</label>
            <select className="ap-input">
              <option>Барлық пайдаланушылар</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Сұрыптау</label>
            <select className="ap-input" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="points_desc">Ұпай (жоғарыдан төменге)</option>
              <option value="points_asc">Ұпай (төменнен жоғарыға)</option>
              <option value="id_desc">Жаңадан енгізілген</option>
            </select>
          </div>
        </div>

        <div className="ap-table-responsive">
          <table className="ap-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Пайдаланушы</th>
                <th style={{ textAlign: 'center' }}>Ұпай</th>
                <th style={{ textAlign: 'center' }}>Статистика</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Жүктелуде...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Мәлімет жоқ</td></tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className={idx === 4 ? 'active-row' : ''}>
                    <td style={{ color: '#64748b' }}>{item.id}</td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#f1f5f9',textTransform: 'uppercase' }}>{item.user_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>ИИН: {item.user_iin}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: '#16a34a', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                        {item.total_points}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: '#3b82f6', fontWeight: '500', fontSize: '14px' }}>
                        {item.stats_count || 0} жазба
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button style={{ color: '#4f46e5', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', marginRight: '5px' }}>
                        <i className="far fa-eye"></i>
                      </button>
                      <button onClick={() => navigate(`/admin/ratings/${item.id}/edit`)} style={{ color: '#eab308', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', marginRight: '5px' }}>
                        <i className="far fa-edit"></i>
                      </button>
                      <button onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px' }}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
