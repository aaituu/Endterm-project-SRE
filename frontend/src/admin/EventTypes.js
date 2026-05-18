import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api, { confirmDelete } from '../utils/api.js';

export default function EventTypes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/event-types');
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
      const res = await api.delete(`/event-types/${id}`);
      if (res.success) {
        fetchData();
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
      <div className="ap-card" style={{ maxWidth: '1000px', margin: '20px auto', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Іс-шара түрлері</h1>
          <Link to="/admin/event-types/new" className="ap-btn ap-btn-primary" style={{ backgroundColor: '#4f46e5', border: 'none' }}>
            <i className="fas fa-plus"></i> Жаңасын құру
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="ap-search-wrap" style={{ margin: 0, width: '300px' }}>
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Іс-шара түрлерін іздеу..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Сұрыптау:</span>
            <select className="ap-input" style={{ width: 'auto', padding: '6px 12px' }}>
              <option>Атауы (А-Я)</option>
              <option>Атауы (Я-А)</option>
            </select>
          </div>
        </div>

        <div className="ap-table-responsive">
          <table className="ap-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>АТАУЫ</th>
                <th style={{ width: '120px' }}>ҰПАЙ</th>
                <th style={{ width: '180px' }}>ІС-ШАРАЛАР САНЫ</th>
                <th style={{ width: '100px', textAlign: 'center' }}>ӘРЕКЕТТЕР</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Жүктелуде...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Мәлімет жоқ</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: '#64748b' }}>#{item.id}</td>
                    <td style={{ fontWeight: '500', color: '#f1f5f9' }}>{item.name}</td>
                    <td>
                      <span style={{ color: '#3b82f6', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                        {item.points} ұпай
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{item.events_count || 0}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button style={{ color: '#4f46e5', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', marginRight: '5px' }}>
                        <i className="far fa-eye"></i>
                      </button>
                      <button onClick={() => navigate(`/admin/event-types/${item.id}/edit`)} style={{ color: '#eab308', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', marginRight: '5px' }}>
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
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
          <div>{data.length} жазбаның {data.length} ішінен көрсетілуде</div>
          <div style={{ display: 'flex' }}>
            <button style={{ border: '1px solid var(--ap-border)', padding: '5px 10px', backgroundColor: 'var(--ap-card)', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }}>&laquo; Алдыңғы</button>
            <button style={{ border: '1px solid #3b82f6', borderLeft: 'none', borderRight: 'none', backgroundColor: '#eff6ff', color: '#3b82f6', padding: '5px 15px', fontWeight: '500' }}>1</button>
            <button style={{ border: '1px solid var(--ap-border)', padding: '5px 10px', backgroundColor: 'var(--ap-card)', borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }}>Келесі &raquo;</button>
          </div>
        </div>

      </div>
    </AdminShell>
  );
}
