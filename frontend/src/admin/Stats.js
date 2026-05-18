import React, { useState, useEffect, useCallback } from 'react';
import api, { showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const Stats = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.stats.public();
    if (res.success) setStats(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Статистика</h1>
          <p className="ap-page-sub">Сайттағы көрсеткіштер мен мәліметтер</p>
        </div>
      </div>

      <div className="admin-content">
        <div className="data-table-card ap-card">
          <div className="table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Көрсеткіш</th>
                  <th>Мәні</th>
                  <th>Сипаттама</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" className="text-center" style={{ padding: '40px' }}><i className="fas fa-spinner fa-spin"></i> Жүктелуде...</td></tr>
                ) : stats.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{s.label}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: '14px' }}>{s.value}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.key}</td>
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

export default Stats;