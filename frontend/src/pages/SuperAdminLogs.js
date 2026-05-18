import React, { useEffect, useState } from 'react';
import { formatDateTime } from '../utils/api.js';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';

export default function SuperAdminLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadLogs = async (currentPage = 1) => {
    setLoading(true);
    const res = await api.superAdmin.auditLogs(`page=${currentPage}&limit=30`);
    if (res.success) {
      setLogs(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else {
      showToast(res.message || 'Жүктеу сәтсіз аяқталды', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs(page);
  }, [page]);

  return (
    <SuperAdminShell>
      <div className="ap-page-head">
        <div>
          <h1 className="ap-page-title">Аудит журналдары</h1>
          <p className="ap-page-sub">Super admin жүйелік және әкімшілік әрекеттерді бақылай алады</p>
        </div>
      </div>

      <div className="data-card">
        {loading ? (
          <p>Жүктелуде...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Уақыт</th>
                  <th>Әрекет</th>
                  <th>Пайдаланушы</th>
                  <th>Мектеп</th>
                  <th>Детальдар</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td>{item.action}</td>
                    <td>{item.user_name || item.user_iin || '—'}</td>
                    <td>{item.school_id || '—'}</td>
                    <td>{item.details ? JSON.stringify(item.details) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Алдыңғы
        </button>
        <span>Page {page} / {Math.ceil(total / 30) || 1}</span>
        <button className="btn" disabled={page * 30 >= total} onClick={() => setPage(page + 1)}>
          Келесі
        </button>
      </div>
    </SuperAdminShell>
  );
}
