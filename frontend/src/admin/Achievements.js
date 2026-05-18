import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function Achievements() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/student-achievements?q=${search}`);
      if (res.success) {
        setData(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusMap = {
    'pending': { label: 'Әрекет керек емес', color: '#6b7280' },
    'reviewed': { label: 'Қаралған', color: '#3b82f6' }
  };

  return (
    <AdminShell>
      <div className="ap-page-header">
        <h1 className="ap-page-title">Жетістіктер</h1>
        <div className="ap-page-actions" style={{ display: 'flex', gap: '10px' }}>
          <div className="ap-search-wrap" style={{ margin: 0 }}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="ID, ФИО, Байқау атауы, Түрі..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAchievements()}
            />
          </div>
          <button className="ap-btn ap-btn-primary" onClick={fetchAchievements}>
            <i className="fas fa-search"></i> Іздеу
          </button>
          <button className="ap-btn" style={{ backgroundColor: '#166534', color: '#fff', border: 'none' }}>
            <i className="fas fa-file-excel"></i> Excel
          </button>
          <Link to="/admin/olympiads/achievements/new" className="ap-btn ap-btn-primary">
            <i className="fas fa-plus"></i> Қосу
          </Link>
        </div>
      </div>

      <div className="ap-card">
        <div className="ap-table-responsive">
          <table className="ap-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Мұғалім</th>
                <th>Оқушы</th>
                <th>Байқау атауы</th>
                <th>Түрі</th>
                <th>Деңгейі</th>
                <th>Күні</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>Жүктелуде...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>Мәлімет жоқ</td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} onClick={() => navigate(`/admin/olympiads/achievements/${item.id}`)} style={{ cursor: 'pointer' }}>
                    <td>{item.id}</td>
                    <td>
                      <div><strong>{item.teacher_name || '—'}</strong></div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.teacher_role || ''}</div>
                    </td>
                    <td>{item.student_name}</td>
                    <td>{item.competition_name}</td>
                    <td>{item.achievement_type || '—'}</td>
                    <td>{item.level || '—'}</td>
                    <td>{item.achievement_date ? new Date(item.achievement_date).toLocaleDateString('ru-RU') : '—'}</td>
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
