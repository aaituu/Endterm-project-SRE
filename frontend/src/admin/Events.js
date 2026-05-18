import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api, { getImageUrl, confirmDelete, showToast } from '../utils/api.js';

const AdminEvents = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [search, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (startDate) query.push(`start_date=${startDate}`);
      if (endDate) query.push(`end_date=${endDate}`);
      
      const qString = query.length > 0 ? `?${query.join('&')}` : '';
      const res = await api.get(`/events${qString}`);
      if (res.success) {
        setData(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDelete('Іс-шараны өшіруді растайсыз ба?'))) return;
    try {
      const res = await api.delete(`/events/${id}`);
      if (res.success) {
        showToast('Іс-шара өшірілді', 'success');
        fetchData();
      } else {
        showToast(res.message || 'Error deleting', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('kk-KZ', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Іс-шараларды басқару</h1>
          <p className="ap-page-sub">Мектептегі барлық мәдени және оқу іс-шаралары</p>
        </div>
        <Link to="/admin/events/new" className="btn btn-primary">
          <i className="fas fa-plus"></i> Жаңа іс-шара
        </Link>
      </div>

      <div className="admin-content">
        <div className="ap-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label className="ap-form-label">Іздеу</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                <input 
                  className="ap-input" 
                  style={{ paddingLeft: '35px' }}
                  placeholder="Атауы, сипаттамасы..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="ap-form-label">Басталу күні</label>
              <input 
                type="date" 
                className="ap-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Аяқталу күні</label>
              <input 
                type="date" 
                className="ap-input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="data-table-card ap-card">
          <div className="data-table-header" style={{ padding: '20px' }}>
            <h3 style={{ margin: 0 }}><i className="fas fa-calendar-alt" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Іс-шаралар тізімі</h3>
          </div>
          <div className="table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Сурет</th>
                  <th>Атауы</th>
                  <th>Күні</th>
                  <th>Орны</th>
                  <th className="text-right">Әрекеттер</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center" style={{ padding: '40px' }}><i className="fas fa-spinner fa-spin"></i> Жүктелуде...</td></tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '40px' }}>
                      <div className="empty-state">
                        <i className="fas fa-calendar-times" style={{ fontSize: '3rem', color: 'var(--border)', marginBottom: '16px' }}></i>
                        <h3>Іс-шаралар жоқ</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Іздеу параметрлерін өзгертіп көріңіз немесе жаңа іс-шара қосыңыз</p>
                      </div>
                    </td>
                  </tr>
                ) : data.map((item) => (
                  <tr key={item.id}>
                    <td width="80">
                      <div style={{ width: '60px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-3)' }}>
                        {item.image_url ? (
                          <img src={getImageUrl(item.image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <i className="fas fa-image"></i>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </div>
                    </td>
                    <td>{formatDate(item.event_date)}</td>
                    <td>{item.location || '—'}</td>
                    <td className="text-right">
                      <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <Link to={`/admin/events/${item.id}/edit`} className="ap-btn-edit">
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button className="ap-btn-del" onClick={() => handleDelete(item.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
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

export default AdminEvents;