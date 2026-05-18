import React, { useState, useEffect } from 'react';
import api, { showToast, confirmDelete } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const AdminOlympiads = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Mock or API call
    try {
      // const res = await api.olympiads.list();
      // if (res.success) setData(res.data);
      setData([]); // Currently empty in original
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Олимпиадаларды басқару</h1>
          <p className="ap-page-sub">Оқушылардың олимпиада қатысуын және жетістіктерін қадағалау</p>
        </div>
        <button className="btn btn-primary">
          <i className="fas fa-plus"></i> Олимпиада қосу
        </button>
      </div>

      <div className="admin-content">
        <div className="data-table-card ap-card">
          <div className="data-table-header" style={{ padding: '20px' }}>
            <h3 style={{ margin: 0 }}><i className="fas fa-trophy" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Олимпиадалар тізімі</h3>
          </div>
          <div className="table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th width="50">ID</th>
                  <th>Атауы</th>
                  <th>Пән</th>
                  <th>Деңгей</th>
                  <th>Күні</th>
                  <th className="text-right">Әрекеттер</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center" style={{ padding: '40px' }}><i className="fas fa-spinner fa-spin"></i> Жүктелуде...</td></tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state text-center" style={{ padding: '60px' }}>
                        <i className="fas fa-trophy" style={{ fontSize: '3rem', color: 'var(--border)', marginBottom: '16px' }}></i>
                        <h3>Олимпиадалар жоқ</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Әзірге ешқандай олимпиада тіркелмеген</p>
                      </div>
                    </td>
                  </tr>
                ) : data.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td><span className="td-name">{item.name}</span></td>
                    <td>{item.subject}</td>
                    <td>{item.level}</td>
                    <td>{item.date}</td>
                    <td className="text-right">
                      <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="ap-btn-edit"><i className="fas fa-edit"></i></button>
                        <button className="ap-btn-del"><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export default AdminOlympiads;