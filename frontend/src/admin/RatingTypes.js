import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api, { confirmDelete } from '../utils/api.js';

export default function RatingTypes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rating-types');
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
      const res = await api.delete(`/rating-types/${id}`);
      if (res.success) fetchData();
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '1000px', margin: '20px auto', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Рейтинг түрлері</h1>
          <Link to="/admin/rating-types/new" className="ap-btn ap-btn-primary" style={{ backgroundColor: '#2563eb', border: 'none' }}>
            <i className="fas fa-plus"></i> Қосу
          </Link>
        </div>

        <div className="ap-table-responsive">
          <table className="ap-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Атауы</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={{ textAlign: 'center' }}>Жүктелуде...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="3" style={{ textAlign: 'center' }}>Мәлімет жоқ</td></tr>
              ) : (
                data.map(item => (
                  <tr key={item.id} className={item.id === 10 ? 'active-row' : ''}>
                    <td style={{ color: '#64748b' }}>{item.id}</td>
                    <td style={{ fontWeight: '500', color: '#f1f5f9' }}>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => navigate(`/admin/rating-types/${item.id}/edit`)} style={{ color: '#3b82f6', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', marginRight: '8px' }}>
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
