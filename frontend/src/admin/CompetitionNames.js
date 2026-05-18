import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api, { confirmDelete } from '../utils/api.js';

export default function CompetitionNames() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/competition-names');
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
      const res = await api.delete(`/competition-names/${id}`);
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
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Жарыс атаулары</h1>
          <Link to="/admin/olympiads/names/new" className="ap-btn ap-btn-primary" style={{ backgroundColor: '#4f46e5', border: 'none' }}>
            <i className="fas fa-plus"></i> Қосу
          </Link>
        </div>

        <div className="ap-table-responsive">
          <table className="ap-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Атауы</th>
                <th>Жарыс түрі</th>
                <th style={{ textAlign: 'center' }}>Статус</th>
                <th style={{ textAlign: 'center' }}>Онлайн</th>
                <th>Мерзімі</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Жүктелуде...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Мәлімет жоқ</td></tr>
              ) : (
                data.map(item => (
                  <tr key={item.id} className={item.id === 53 ? 'active-row' : ''}>
                    <td style={{ color: '#64748b' }}>{item.id}</td>
                    <td style={{ fontWeight: '500', color: '#f1f5f9' }}>{item.name}</td>
                    <td style={{ color: '#94a3b8' }}>{item.type_name || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {item.is_active ? (
                        <span style={{ color: '#16a34a', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                          Белсенді
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                          Белсенді емес
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.is_online ? (
                        <span style={{ color: '#3b82f6', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fas fa-globe"></i> Иә
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>Жоқ</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>
                      <div>Басталуы: {item.start_date ? new Date(item.start_date).toLocaleDateString() : '-'}</div>
                      <div>Аяқталуы: {item.end_date ? new Date(item.end_date).toLocaleDateString() : '-'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => navigate(`/admin/olympiads/names/${item.id}/edit`)} style={{ color: '#eab308', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', marginRight: '5px' }}>
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
